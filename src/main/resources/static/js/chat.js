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

    // Use current client time for real-time messages to show user's local time
    message.timestamp = new Date();

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

// Function to convert URLs in text to clickable links
function convertUrlsToLinks(text) {
    // Regular expression to match URLs
    var urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    
    // Replace URLs with clickable links
    return text.replace(urlRegex, function(url) {
        // Remove trailing punctuation that might not be part of the URL
        var cleanUrl = url.replace(/[.,;!?]+$/, '');
        var trailingPunctuation = url.substring(cleanUrl.length);
        
        return '<a href="' + cleanUrl + '" target="_blank" rel="noopener noreferrer">' + cleanUrl + '</a>' + trailingPunctuation;
    });
}

// Function to safely set HTML content while preserving text security
function setMessageHtml(element, content) {
    // First escape any HTML to prevent XSS attacks
    var div = document.createElement('div');
    div.textContent = content;
    var escapedContent = div.innerHTML;
    
    // Then convert URLs to links
    var htmlWithLinks = convertUrlsToLinks(escapedContent);
    
    // Set the HTML content
    element.innerHTML = htmlWithLinks;
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
        // Use the new function to handle URLs instead of plain textContent
        setMessageHtml(textElement, message.content);
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
    if (!timestamp) {
        // If no timestamp provided, use current time (for real-time messages)
        timestamp = new Date();
    }
    
    try {
        let date;
        if (typeof timestamp === 'string') {
            // Server timestamp format: "yyyy-MM-dd HH:mm:ss"
            // Treat server time as if it were UTC to avoid timezone issues
            // Then convert to user's local time
            date = new Date(timestamp + ' UTC');
        } else {
            // Already a Date object or timestamp number
            date = new Date(timestamp);
        }
        
        return date.toLocaleTimeString(undefined, { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    } catch (e) {
        // Fallback: use current time if parsing fails
        return new Date().toLocaleTimeString(undefined, { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
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
