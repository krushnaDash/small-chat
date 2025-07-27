package com.krushna.smallchat.websocket;

import com.krushna.smallchat.model.ChatMessage;
import com.krushna.smallchat.service.MessageStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @Autowired
    private MessageStorageService messageStorageService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        System.out.println("Received a new web socket connection");
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username != null) {
            System.out.println("User Disconnected: " + username);

            ChatMessage leaveMessage = new ChatMessage(
                username,
                username + " left the chat!",
                ChatMessage.MessageType.LEAVE
            );

            // Save leave message
            messageStorageService.saveMessage(leaveMessage);

            messagingTemplate.convertAndSend("/topic/public", leaveMessage);
        }
    }
}
