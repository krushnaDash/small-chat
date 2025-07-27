package com.krushna.smallchat.websocket;

import com.krushna.smallchat.model.ChatMessage;
import com.krushna.smallchat.service.MessageStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @Autowired
    private MessageStorageService messageStorageService;

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        // Save message to in-memory storage
        messageStorageService.saveMessage(chatMessage);
        return chatMessage;
    }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage,
                               SimpMessageHeaderAccessor headerAccessor) {
        // Add username in web socket session
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        
        // Create join message
        ChatMessage joinMessage = new ChatMessage(
            chatMessage.getSender(),
            chatMessage.getSender() + " joined the chat!",
            ChatMessage.MessageType.JOIN
        );
        
        // Save join message
        messageStorageService.saveMessage(joinMessage);
        
        return joinMessage;
    }
}
