'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');
var connectedUserElement = document.querySelector('#connected-user-name');

var stompClient = null;
var username = null;

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

// Get username from URL parameters or localStorage
function getUsername() {
    const urlParams = new URLSearchParams(window.location.search);
    const usernameFromUrl = urlParams.get('username');
    
    if (usernameFromUrl) {
        return decodeURIComponent(usernameFromUrl);
    }
    
    return localStorage.getItem('username');
}

function connect(event) {
    username = document.querySelector('#name').value.trim();

    if(username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        var socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Tell your username to the server
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    );

    connectingElement.classList.add('hidden');
    connectedUserElement.textContent = username;
    
    // Load recent messages
    loadRecentMessages();
    
    // Request notification permission
    requestNotificationPermission();
}

function onError(error) {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}

function sendMessage(event) {
    var messageContent = messageInput.value.trim();
    if(messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    var messageElement = document.createElement('li');

    if(message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left!';
    } else {
        messageElement.classList.add('chat-message');
        
        // Determine if message is sent by current user
        if(message.sender === username) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
            // Show notification for received messages
            showNotification(message.sender, message.content);
        }
    }

    var messageContent = createMessageContent(message);
    messageElement.appendChild(messageContent);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function createMessageContent(message) {
    var messageContent = document.createElement('div');
    
    if(message.type === 'JOIN' || message.type === 'LEAVE') {
        messageContent.classList.add('event-message');
        var messageText = document.createElement('p');
        messageText.textContent = message.content;
        messageContent.appendChild(messageText);
    } else {
        messageContent.classList.add('message-content');
        
        if(message.sender === username) {
            messageContent.classList.add('sent');
        } else {
            messageContent.classList.add('received');
            
            var senderElement = document.createElement('div');
            senderElement.classList.add('message-sender');
            senderElement.textContent = message.sender;
            senderElement.style.color = getAvatarColor(message.sender);
            messageContent.appendChild(senderElement);
        }
        
        var textElement = document.createElement('div');
        textElement.textContent = message.content;
        messageContent.appendChild(textElement);
        
        var timeElement = document.createElement('div');
        timeElement.classList.add('message-time');
        timeElement.textContent = formatTime(message.timestamp);
        messageContent.appendChild(timeElement);
    }
    
    return messageContent;
}

function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    } catch (e) {
        return '';
    }
}

function loadRecentMessages() {
    fetch('/api/messages/recent?limit=50')
        .then(response => response.json())
        .then(messages => {
            messages.forEach(message => {
                var messageElement = document.createElement('li');
                
                if(message.type === 'JOIN' || message.type === 'LEAVE') {
                    messageElement.classList.add('event-message');
                } else {
                    messageElement.classList.add('chat-message');
                    if(message.sender === username) {
                        messageElement.classList.add('sent');
                    } else {
                        messageElement.classList.add('received');
                    }
                }
                
                var messageContent = createMessageContent(message);
                messageElement.appendChild(messageContent);
                messageArea.appendChild(messageElement);
            });
            
            messageArea.scrollTop = messageArea.scrollHeight;
        })
        .catch(error => {
            console.error('Error loading recent messages:', error);
        });
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(sender, content) {
    if ('Notification' in window && Notification.permission === 'granted') {
        var notification = new Notification(`New message from ${sender}`, {
            body: content,
            icon: '/favicon.ico',
            tag: 'smallchat-message'
        });
        
        // Auto close notification after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
        
        // Focus window when notification is clicked
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    username = getUsername();
    
    if (username) {
        // User has username, connect directly
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        
        var socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.connect({}, onConnected, onError);
    } else {
        // Show username form
        usernamePage.classList.remove('hidden');
        chatPage.classList.add('hidden');
    }
});

// Event listeners
if (usernameForm) {
    usernameForm.addEventListener('submit', connect, true);
}

if (messageForm) {
    messageForm.addEventListener('submit', sendMessage, true);
}

// Focus on message input when page loads
window.addEventListener('load', function() {
    if (messageInput) {
        messageInput.focus();
    }
});

// Handle page visibility change to show notifications
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, enable notifications
    } else {
        // Page is visible, user is actively viewing
    }
});
