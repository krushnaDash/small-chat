'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');
var connectedUserElement = document.querySelector('#connected-user-name');
var replyPreview = document.querySelector('#replyPreview');
var replyToSender = document.querySelector('.reply-to-sender');
var replyToContent = document.querySelector('.reply-to-content');

var stompClient = null;
var username = null;

// Reply functionality state
var currentReply = null;
var selectionMenu = null;

// Check for authenticated user on page load
window.addEventListener('DOMContentLoaded', function() {
    console.log('Chat page loaded, checking for authenticated user');
    
    // Check if user is already authenticated from the login page
    var authenticatedUsername = sessionStorage.getItem('username');
    console.log('Authenticated username from sessionStorage:', authenticatedUsername);
    
    if (authenticatedUsername && authenticatedUsername.trim()) {
        console.log('User already authenticated, auto-connecting to chat');
        username = authenticatedUsername.trim();
        
        // Hide username form and show chat directly
        if (usernamePage) {
            usernamePage.classList.add('hidden');
        }
        if (chatPage) {
            chatPage.classList.remove('hidden');
        }
        
        // Auto-connect to WebSocket
        connectToChat();
    } else {
        console.log('No authenticated user found, showing username form');
        // Show username form for manual entry
        if (usernamePage) {
            usernamePage.classList.remove('hidden');
        }
        if (chatPage) {
            chatPage.classList.add('hidden');
        }
    }
});

// Function to connect to chat WebSocket
function connectToChat() {
    console.log('Connecting to chat with username:', username);
    
    var socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

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

// Reply functionality functions
function showReplyPreview(messageId, sender, content, selectedText) {
    currentReply = {
        id: messageId,
        sender: sender,
        content: selectedText || content
    };
    
    replyToSender.textContent = sender;
    replyToContent.textContent = selectedText || content;
    replyPreview.classList.remove('hidden');
    
    // Focus on message input
    messageInput.focus();
}

function cancelReply() {
    currentReply = null;
    replyPreview.classList.add('hidden');
    hideSelectionMenu();
}

function showSelectionMenu(x, y, messageId, sender, content, selectedText) {
    console.log('showSelectionMenu called:', { x, y, messageId, sender, selectedText });
    hideSelectionMenu();
    
    selectionMenu = document.createElement('div');
    selectionMenu.className = 'selection-menu';
    selectionMenu.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        z-index: 10000;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        padding: 5px;
    `;
    
    var replyButton = document.createElement('button');
    replyButton.textContent = 'Reply';
    replyButton.style.cssText = `
        background: #128C7E;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    
    replyButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Reply button clicked');
        showReplyPreview(messageId, sender, content, selectedText);
        hideSelectionMenu();
    };
    
    selectionMenu.appendChild(replyButton);
    document.body.appendChild(selectionMenu);
    console.log('Selection menu added to DOM at:', { x, y });
}

function hideSelectionMenu() {
    if (selectionMenu) {
        document.body.removeChild(selectionMenu);
        selectionMenu = null;
    }
}

function handleTextSelection(event, messageElement, messageId, sender, content) {
    console.log('handleTextSelection called:', { messageId, sender, content, eventType: event.type });
    
    // Prevent event bubbling
    event.stopPropagation();
    
    // Different delays for different event types (mobile needs more time)
    var delay = event.type === 'touchend' ? 300 : 100;
    
    // Small delay to ensure selection is complete
    setTimeout(function() {
        var selection = window.getSelection();
        var selectedText = selection.toString().trim();
        
        console.log('Selection detected:', { selectedText, length: selectedText.length, eventType: event.type });
        
        if (selectedText.length > 0) {
            try {
                var range = selection.getRangeAt(0);
                var rect = range.getBoundingClientRect();
                
                console.log('Selection rect:', rect);
                console.log('Window scroll:', { x: window.scrollX, y: window.scrollY });
                
                // Calculate position for selection menu
                var menuX = Math.max(10, rect.left + window.scrollX);
                var menuY = rect.bottom + window.scrollY + 10; // More space for mobile
                
                // Adjust for mobile viewport
                if (window.innerWidth < 768) {
                    // On mobile, position menu more centrally
                    menuX = Math.min(menuX, window.innerWidth - 100);
                    menuY = Math.min(menuY, window.innerHeight - 50);
                }
                
                // Show selection menu near the selected text
                showSelectionMenu(
                    menuX,
                    menuY,
                    messageId,
                    sender,
                    content,
                    selectedText
                );
            } catch (e) {
                console.log('Selection error:', e);
            }
        } else {
            console.log('No text selected');
            hideSelectionMenu();
        }
    }, delay);
}

function connect(event) {
    if (event) {
        event.preventDefault();
    }
    
    // Get username from form input
    var nameInput = document.querySelector('#name');
    if (nameInput && nameInput.value.trim()) {
        username = nameInput.value.trim();
        console.log('Username entered manually:', username);
        
        // Store in sessionStorage for future use
        sessionStorage.setItem('username', username);
    }

    if(username) {
        console.log('Connecting with username:', username);
        
        // Hide username form and show chat
        if (usernamePage) {
            usernamePage.classList.add('hidden');
        }
        if (chatPage) {
            chatPage.classList.remove('hidden');
        }

        // Connect to WebSocket
        connectToChat();
    } else {
        console.log('No username provided');
        alert('Please enter your username.');
    }
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
        
        // Add reply information if replying to a message
        if (currentReply) {
            chatMessage.replyToId = currentReply.id;
            chatMessage.replyToSender = currentReply.sender;
            chatMessage.replyToContent = currentReply.content;
        }
        
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
        
        // Clear reply after sending
        if (currentReply) {
            cancelReply();
        }
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
            
            // Only show sender name for received messages, not sent ones
            var senderElement = document.createElement('div');
            senderElement.classList.add('message-sender');
            senderElement.textContent = message.sender;
            senderElement.style.color = getAvatarColor(message.sender);
            messageContent.appendChild(senderElement);
        }
        
        // Add reply section if this message is a reply
        if (message.replyToId && message.replyToSender && message.replyToContent) {
            var replySection = document.createElement('div');
            replySection.classList.add('message-reply');
            
            var replyHeader = document.createElement('div');
            replyHeader.classList.add('reply-original-sender');
            replyHeader.textContent = '↳ ' + message.replyToSender;
            replySection.appendChild(replyHeader);
            
            var replyContent = document.createElement('div');
            replyContent.classList.add('reply-original-content');
            replyContent.textContent = message.replyToContent.substring(0, 50) + (message.replyToContent.length > 50 ? '...' : '');
            replySection.appendChild(replyContent);
            
            messageContent.appendChild(replySection);
        }
        
        var textElement = document.createElement('div');
        textElement.classList.add('message-text');
        textElement.setAttribute('data-message-id', message.id);
        textElement.setAttribute('data-sender', message.sender);
        textElement.setAttribute('data-content', message.content);
        
        // Use the new function to handle URLs instead of plain textContent
        setMessageHtml(textElement, message.content);
        messageContent.appendChild(textElement);
        
        // Add text selection event listeners for both desktop and mobile
        // Desktop: mouseup event
        textElement.addEventListener('mouseup', function(event) {
            console.log('Text element mouseup for selection');
            handleTextSelection(event, textElement, message.id, message.sender, message.content);
        });
        
        // Mobile: touchend event
        textElement.addEventListener('touchend', function(event) {
            console.log('Text element touchend for selection');
            // Prevent default to avoid triggering mouseup as well
            event.preventDefault();
            handleTextSelection(event, textElement, message.id, message.sender, message.content);
        });
        
        // Additional mobile support: selectionchange event
        textElement.addEventListener('selectionchange', function(event) {
            console.log('Selection changed on text element');
            // Small delay to handle mobile selection
            setTimeout(function() {
                handleTextSelection(event, textElement, message.id, message.sender, message.content);
            }, 200);
        });
        
        // Ensure text is selectable
        textElement.style.userSelect = 'text';
        textElement.style.cursor = 'text';
        
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

// Global event listeners for reply functionality
document.addEventListener('click', function(event) {
    // Hide selection menu when clicking outside
    if (!event.target.closest('.selection-menu')) {
        hideSelectionMenu();
    }
});

// Clear text selection when clicking outside messages
document.addEventListener('mousedown', function(event) {
    if (!event.target.closest('.message-content')) {
        window.getSelection().removeAllRanges();
        hideSelectionMenu();
    }
});

// Mobile-specific: Global selection change handler
document.addEventListener('selectionchange', function() {
    // Only handle if we're on mobile
    if (window.innerWidth <= 768) {
        setTimeout(function() {
            var selection = window.getSelection();
            var selectedText = selection.toString().trim();
            
            if (selectedText.length > 0) {
                // Find the message element containing the selection
                var range = selection.getRangeAt(0);
                var container = range.commonAncestorContainer;
                
                // Walk up the DOM to find the message text element
                var messageTextElement = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
                while (messageTextElement && !messageTextElement.classList.contains('message-text')) {
                    messageTextElement = messageTextElement.parentNode;
                    if (!messageTextElement || messageTextElement === document.body) {
                        return; // Not within a message
                    }
                }
                
                if (messageTextElement && messageTextElement.classList.contains('message-text')) {
                    var messageId = messageTextElement.getAttribute('data-message-id');
                    var sender = messageTextElement.getAttribute('data-sender');
                    var content = messageTextElement.getAttribute('data-content');
                    
                    if (messageId && sender && content) {
                        console.log('Mobile selection detected via selectionchange:', { messageId, sender, selectedText });
                        
                        try {
                            var rect = range.getBoundingClientRect();
                            var menuX = Math.max(10, rect.left + window.scrollX);
                            var menuY = rect.bottom + window.scrollY + 15;
                            
                            // Adjust for mobile viewport
                            menuX = Math.min(menuX, window.innerWidth - 100);
                            menuY = Math.min(menuY, window.innerHeight - 60);
                            
                            showSelectionMenu(menuX, menuY, messageId, sender, content, selectedText);
                        } catch (e) {
                            console.log('Mobile selection error:', e);
                        }
                    }
                }
            } else {
                hideSelectionMenu();
            }
        }, 500); // Longer delay for mobile
    }
});

// Event listeners for form submissions
if (usernameForm) {
    usernameForm.addEventListener('submit', connect, true);
}

if (messageForm) {
    messageForm.addEventListener('submit', sendMessage, true);
}
