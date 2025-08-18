package com.krushna.smallchat.controller;

import com.krushna.smallchat.model.ChatMessage;
import com.krushna.smallchat.service.MessageStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChatRestController {

    @Autowired
    private MessageStorageService messageStorageService;

    @GetMapping("/messages")
    public ResponseEntity<List<ChatMessage>> getAllMessages(
            @RequestParam(name = "includeSystem", defaultValue = "true") boolean includeSystem) {
        return ResponseEntity.ok(messageStorageService.getAllMessages(includeSystem));
    }

    @GetMapping("/messages/recent")
    public ResponseEntity<List<ChatMessage>> getRecentMessages(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(name = "includeSystem", defaultValue = "true") boolean includeSystem) {
        return ResponseEntity.ok(messageStorageService.getRecentMessages(limit, includeSystem));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getChatStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalMessages", messageStorageService.getMessageCount());
        stats.put("retentionDays", messageStorageService.getMessageRetentionDays());
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/messages/clear")
    public ResponseEntity<Map<String, String>> clearAllMessages() {
        messageStorageService.clearAllMessages();
        Map<String, String> response = new HashMap<>();
        response.put("message", "All messages cleared successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/messages/reload")
    public ResponseEntity<Map<String, Object>> reloadFromAzure() {
        int loaded = messageStorageService.reloadFromPersistence();
        Map<String, Object> resp = new HashMap<>();
        resp.put("loaded", loaded);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "SmallChat");
        return ResponseEntity.ok(health);
    }
}
