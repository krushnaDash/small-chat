package com.krushna.smallchat.service;

import com.krushna.smallchat.model.ChatMessage;
import com.krushna.smallchat.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class MessageStorageService {

    private static final Logger log = LoggerFactory.getLogger(MessageStorageService.class);

    private final ConcurrentMap<String, ChatMessage> messages = new ConcurrentHashMap<>();
    private final ExecutorService async = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "msg-persist-async");
        t.setDaemon(true);
        return t;
    });
    
    @Autowired(required = false)
    private MessageRepository repository;
    
    @Value("${smallchat.message.retention.days:3}")
    private int messageRetentionDays;

    public void saveMessage(ChatMessage message) {
        // Memory-first
        messages.put(message.getId(), message);
        // Persist async if repository is enabled
        if (repository != null && repository.isEnabled()) {
            async.submit(() -> {
                try {
                    repository.save(message);
                } catch (Exception e) {
                    log.warn("Failed to persist message {}: {}", message.getId(), e.getMessage());
                }
            });
        }
    }

    public List<ChatMessage> getAllMessages() {
        return new ArrayList<>(messages.values())
                .stream()
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .collect(Collectors.toList());
    }

    public List<ChatMessage> getAllMessages(boolean includeSystem) {
        return new ArrayList<>(messages.values())
                .stream()
                .filter(m -> includeSystem || (m.getType() != ChatMessage.MessageType.JOIN && m.getType() != ChatMessage.MessageType.LEAVE))
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .collect(Collectors.toList());
    }

    public List<ChatMessage> getRecentMessages(int limit) {
        return getAllMessages()
                .stream()
                .skip(Math.max(0, getAllMessages().size() - limit))
                .collect(Collectors.toList());
    }

    public List<ChatMessage> getRecentMessages(int limit, boolean includeSystem) {
        List<ChatMessage> all = getAllMessages(includeSystem);
        return all.stream()
                .skip(Math.max(0, all.size() - limit))
                .collect(Collectors.toList());
    }

    public int getMessageCount() {
        return messages.size();
    }

    public void clearAllMessages() {
        messages.clear();
    }

    // Scheduled task to clean up old messages every hour
    @Scheduled(fixedRate = 3600000) // 1 hour = 3600000 milliseconds
    public void cleanupOldMessages() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusDays(messageRetentionDays);

        List<String> messagesToRemove = messages.values()
                .stream()
                .filter(message -> message.getTimestamp() != null && message.getTimestamp().isBefore(cutoffTime))
                .map(ChatMessage::getId)
                .collect(Collectors.toList());

        messagesToRemove.forEach(messages::remove);

        // Clean in Azure as well (best-effort)
        if (repository != null && repository.isEnabled()) {
            async.submit(() -> {
                try {
                    int deleted = repository.deleteBefore(cutoffTime);
                    if (deleted > 0) {
                        log.info("Azure cleanup deleted {} old messages", deleted);
                    }
                } catch (Exception e) {
                    log.warn("Azure cleanup failed: {}", e.getMessage());
                }
            });
        }

        if (!messagesToRemove.isEmpty()) {
            log.info("Cleaned up {} old messages from memory", messagesToRemove.size());
        }
    }

    public int getMessageRetentionDays() {
        return messageRetentionDays;
    }

    @PostConstruct
    public void hydrateFromPersistence() {
        if (repository == null || !repository.isEnabled()) {
            log.info("Skipping hydration: persistence disabled or not configured");
            return;
        }
        LocalDateTime since = LocalDateTime.now().minusDays(messageRetentionDays);
        try {
            List<ChatMessage> persisted = repository.loadSince(since);
            // Sort by timestamp for deterministic insertion order
            List<ChatMessage> sorted = new ArrayList<>(persisted);
            Collections.sort(sorted, (a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));
            for (ChatMessage m : sorted) {
                if (m.getId() != null) {
                    messages.put(m.getId(), m);
                }
            }
            log.info("Hydrated {} messages from Azure", sorted.size());
        } catch (Exception e) {
            log.warn("Failed to hydrate from Azure: {}. Continuing with empty memory.", e.getMessage());
        }
    }

    /**
     * Clear in-memory messages and reload from Azure Table within retention window.
     * @return number of messages loaded
     */
    public int reloadFromPersistence() {
        if (repository == null || !repository.isEnabled()) {
            log.info("Reload requested but persistence is disabled");
            return 0;
        }
        messages.clear();
        LocalDateTime since = LocalDateTime.now().minusDays(messageRetentionDays);
        try {
            List<ChatMessage> persisted = repository.loadSince(since);
            List<ChatMessage> sorted = new ArrayList<>(persisted);
            Collections.sort(sorted, (a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));
            for (ChatMessage m : sorted) {
                if (m.getId() != null) {
                    messages.put(m.getId(), m);
                }
            }
            log.info("Reloaded {} messages from Azure", sorted.size());
            return sorted.size();
        } catch (Exception e) {
            log.warn("Reload from Azure failed: {}", e.getMessage());
            return 0;
        }
    }
}
