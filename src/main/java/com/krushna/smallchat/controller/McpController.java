package com.krushna.smallchat.controller;

import com.krushna.smallchat.model.ChatMessage;
import com.krushna.smallchat.service.MessageStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/mcp")
@CrossOrigin(origins = "*")
public class McpController {

    @Autowired
    private MessageStorageService messageStorageService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Value("${mcp.auth.enabled:true}")
    private boolean authEnabled;

    @Value("${mcp.auth.token:changeme}")
    private String authToken;

    // --- Utility: Simple bearer token check, per-request ---
    private ResponseEntity<Map<String, Object>> authorizeOrUnauthorized(HttpServletRequest request) {
        if (!authEnabled) return null; // skip auth
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return unauthorized("Missing or invalid Authorization header");
        }
        String token = header.substring("Bearer ".length()).trim();
        if (!Objects.equals(token, authToken)) {
            return unauthorized("Invalid token");
        }
        return null; // authorized
    }

    private ResponseEntity<Map<String, Object>> unauthorized(String message) {
        Map<String, Object> err = new HashMap<>();
        Map<String, Object> body = new HashMap<>();
        err.put("code", HttpStatus.UNAUTHORIZED.value());
        err.put("message", message);
        body.put("error", err);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private ResponseEntity<Map<String, Object>> badRequest(String message) {
        Map<String, Object> err = new HashMap<>();
        Map<String, Object> body = new HashMap<>();
        err.put("code", HttpStatus.BAD_REQUEST.value());
        err.put("message", message);
        body.put("error", err);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON).body(body);
    }

    // --- Health ---
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> auth = authorizeOrUnauthorized(request);
        if (auth != null) return (ResponseEntity) auth;

        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "SmallChat");
        return ResponseEntity.ok(health);
    }

    // --- Stats ---
    @GetMapping("/stats")
    public ResponseEntity<?> stats(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> auth = authorizeOrUnauthorized(request);
        if (auth != null) return auth;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalMessages", messageStorageService.getMessageCount());
        stats.put("retentionDays", messageStorageService.getMessageRetentionDays());
        return ResponseEntity.ok(stats);
    }

    // --- Get all messages with optional pagination ---
    @GetMapping("/messages")
    public ResponseEntity<?> getAllMessages(
            HttpServletRequest request,
            @RequestParam(name = "page", required = false, defaultValue = "0") int page,
            @RequestParam(name = "size", required = false, defaultValue = "100") int size
    ) {
        ResponseEntity<Map<String, Object>> auth = authorizeOrUnauthorized(request);
        if (auth != null) return auth;

        if (page < 0 || size <= 0 || size > 1000) {
            return badRequest("Invalid page/size");
        }

        List<ChatMessage> all = messageStorageService.getAllMessages();
        int from = Math.min(page * size, Math.max(all.size() - 1, 0));
        int to = Math.min(from + size, all.size());
        List<ChatMessage> slice = from <= to ? all.subList(from, to) : Collections.emptyList();
        Map<String, Object> result = new HashMap<>();
        result.put("page", page);
        result.put("size", size);
        result.put("total", all.size());
        result.put("messages", slice);
        return ResponseEntity.ok(result);
    }

    // --- Get recent messages ---
    @GetMapping("/messages/recent")
    public ResponseEntity<?> getRecentMessages(
            HttpServletRequest request,
            @RequestParam(name = "limit", required = false, defaultValue = "50") int limit
    ) {
        ResponseEntity<Map<String, Object>> auth = authorizeOrUnauthorized(request);
        if (auth != null) return auth;

        int capped = Math.max(1, Math.min(limit, 200));
        List<ChatMessage> recent = messageStorageService.getRecentMessages(capped);
        return ResponseEntity.ok(recent);
    }

    // --- Post a message and broadcast ---
    @PostMapping("/messages")
    public ResponseEntity<?> postMessage(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body
    ) {
        ResponseEntity<Map<String, Object>> auth = authorizeOrUnauthorized(request);
        if (auth != null) return auth;

        String sender = body.get("sender") != null ? String.valueOf(body.get("sender")).trim() : null;
        String content = body.get("content") != null ? String.valueOf(body.get("content")) : null;
        String typeStr = body.get("type") != null ? String.valueOf(body.get("type")) : "CHAT";

        if (sender == null || sender.isEmpty()) {
            return badRequest("'sender' is required");
        }
        if (content == null) {
            return badRequest("'content' is required");
        }

        ChatMessage.MessageType type;
        try {
            type = ChatMessage.MessageType.valueOf(typeStr.toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            return badRequest("Invalid 'type'. Allowed: CHAT|JOIN|LEAVE");
        }

        ChatMessage msg = new ChatMessage();
        msg.setSender(sender);
        msg.setContent(content);
        msg.setType(type);
        if (msg.getTimestamp() == null) {
            msg.setTimestamp(LocalDateTime.now());
        }

        messageStorageService.saveMessage(msg);
        // WS broadcast so connected clients receive it
        messagingTemplate.convertAndSend("/topic/public", msg);

        return ResponseEntity.ok(msg);
    }

    // --- Clear all messages ---
    @PostMapping("/messages/clear")
    public ResponseEntity<?> clearAllMessages(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> auth = authorizeOrUnauthorized(request);
        if (auth != null) return auth;

        messageStorageService.clearAllMessages();
        Map<String, String> res = new HashMap<>();
        res.put("message", "All messages cleared successfully");
        return ResponseEntity.ok(res);
    }
}
