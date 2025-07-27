package com.krushna.smallchat;

import com.krushna.smallchat.model.ChatMessage;
import com.krushna.smallchat.service.MessageStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SmallChatApplicationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private MessageStorageService messageStorageService;

    @Test
    void contextLoads() {
        // Test that the Spring context loads successfully
        assertThat(messageStorageService).isNotNull();
    }

    @Test
    void healthEndpointReturnsUp() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "http://localhost:" + port + "/api/health", String.class);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).contains("UP");
    }

    @Test
    void statsEndpointReturnsValidData() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "http://localhost:" + port + "/api/stats", String.class);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).contains("totalMessages");
        assertThat(response.getBody()).contains("retentionDays");
    }

    @Test
    void messageStorageServiceWorks() {
        // Clear any existing messages
        messageStorageService.clearAllMessages();
        
        // Create and save a test message
        ChatMessage testMessage = new ChatMessage("TestUser", "Hello World", ChatMessage.MessageType.CHAT);
        messageStorageService.saveMessage(testMessage);
        
        // Verify message was saved
        assertThat(messageStorageService.getMessageCount()).isEqualTo(1);
        assertThat(messageStorageService.getAllMessages()).hasSize(1);
        assertThat(messageStorageService.getAllMessages().get(0).getContent()).isEqualTo("Hello World");
        
        // Clean up
        messageStorageService.clearAllMessages();
    }

    @Test
    void messagesEndpointReturnsEmptyListInitially() {
        // Clear messages first
        messageStorageService.clearAllMessages();
        
        ResponseEntity<String> response = restTemplate.getForEntity(
            "http://localhost:" + port + "/api/messages", String.class);
        
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo("[]");
    }
}
