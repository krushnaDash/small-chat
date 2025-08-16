package com.krushna.smallchat.repository;

import com.krushna.smallchat.model.ChatMessage;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageRepository {
    void save(ChatMessage message) throws Exception;
    List<ChatMessage> loadSince(LocalDateTime since) throws Exception;
    int deleteBefore(LocalDateTime cutoff) throws Exception;
    boolean isEnabled();
}
