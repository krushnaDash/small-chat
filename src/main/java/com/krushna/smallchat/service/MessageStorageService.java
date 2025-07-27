package com.krushna.smallchat.service;

import com.krushna.smallchat.model.ChatMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

@Service
public class MessageStorageService {

    private final ConcurrentMap<String, ChatMessage> messages = new ConcurrentHashMap<>();
    
    @Value("${smallchat.message.retention.days:3}")
    private int messageRetentionDays;

    public void saveMessage(ChatMessage message) {
        messages.put(message.getId(), message);
    }

    public List<ChatMessage> getAllMessages() {
        return new ArrayList<>(messages.values())
                .stream()
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .collect(Collectors.toList());
    }

    public List<ChatMessage> getRecentMessages(int limit) {
        return getAllMessages()
                .stream()
                .skip(Math.max(0, getAllMessages().size() - limit))
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
                .filter(message -> message.getTimestamp().isBefore(cutoffTime))
                .map(ChatMessage::getId)
                .collect(Collectors.toList());

        messagesToRemove.forEach(messages::remove);
        
        if (!messagesToRemove.isEmpty()) {
            System.out.println("Cleaned up " + messagesToRemove.size() + " old messages");
        }
    }

    public int getMessageRetentionDays() {
        return messageRetentionDays;
    }
}
