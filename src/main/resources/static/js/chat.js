'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');
var connectedUserElement = document.querySelector('#connected-user-name');
var systemToggleEl = null; // will be set on DOMContentLoaded
var showSystem = true;

var stompClient = null;
var username = null;
var loadedInitialHistory = false;
var reconnectAttempts = 0;
var reconnectTimer = null;
var maxReconnectDelayMs = 30000;

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
    console.log('Connect function called');
    event.preventDefault();
    
    username = document.querySelector('#name').value.trim();
    console.log('Username:', username);

    if(username) {
        try { localStorage.setItem('username', username); } catch (e) {}
        
        // Blur the input to dismiss keyboard on iOS
        const nameInput = document.querySelector('#name');
        if (nameInput) nameInput.blur();
        
        console.log('Transitioning to chat page...');
        console.log('Before transition - usernamePage classes:', usernamePage.className);
        console.log('Before transition - chatPage classes:', chatPage.className);
        
        // Use requestAnimationFrame for smooth transition on all browsers
        requestAnimationFrame(() => {
            usernamePage.classList.add('hidden');
            chatPage.classList.remove('hidden');
            
            console.log('After transition - usernamePage classes:', usernamePage.className);
            console.log('After transition - chatPage classes:', chatPage.className);
            
            // Scroll to top to ensure chat page is visible on iOS
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            
            console.log('Initializing STOMP connection...');
            initAndConnectStomp();
        });
    } else {
        console.log('No username entered');
    }
}

function onConnected() {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Announce join on connect so users see you entered the room
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    );

    connectingElement.classList.add('hidden');
    connectedUserElement.textContent = username;
    setConnectionStatus('Connected');
    reconnectAttempts = 0;
    
    // Load recent messages only once per page load
    if (!loadedInitialHistory) {
        loadRecentMessages();
        loadedInitialHistory = true;
    }
    
    // Request notification permission
    requestNotificationPermission();
}

function onError(error) {
    setConnectionStatus('Disconnected');
    scheduleReconnect();
}

function initAndConnectStomp() {
    // Clear any existing client
    try { if (stompClient && stompClient.connected) stompClient.disconnect(() => {}); } catch (e) {}
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);

    // Optional debug via ?debug=1
    const debug = new URLSearchParams(location.search).get('debug') === '1';
    if (!debug) {
        stompClient.debug = null;
    }

    // Heartbeats: send every 15s; expect from server every 15s (0 to disable incoming check)
    stompClient.heartbeat.outgoing = 15000;
    stompClient.heartbeat.incoming = 15000;

    // Socket close should trigger reconnect
    socket.onclose = function() {
        setConnectionStatus('Disconnected');
        scheduleReconnect();
    };

    setConnectionStatus('Connecting...');
    stompClient.connect({}, onConnected, onError);
}

function isConnected() {
    return !!(stompClient && stompClient.connected);
}

function scheduleReconnect() {
    if (reconnectTimer) return; // already scheduled
    // Exponential backoff with cap
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelayMs);
    reconnectAttempts++;
    const secs = Math.round(delay / 1000);
    setConnectionStatus('Reconnecting in ' + secs + 's...');
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        initAndConnectStomp();
    }, delay);
}

function setConnectionStatus(text) {
    const pill = document.getElementById('conn-status');
    if (pill) pill.textContent = text;
    if (connectingElement) {
        if (text && text !== 'Connected') {
            connectingElement.classList.remove('hidden');
            connectingElement.textContent = text;
            connectingElement.style.color = (text.startsWith('Connect')) ? '' : 'red';
        } else {
            connectingElement.classList.add('hidden');
        }
    }
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

    // Optionally hide system messages
    if (!showSystem && (message.type === 'JOIN' || message.type === 'LEAVE')) {
        return;
    }

    // Do NOT override server timestamp. If missing, fallback to client time.
    if (!message.timestamp) {
        message.timestamp = new Date();
    }

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
            const raw = timestamp.trim();
            // Handle common server formats robustly
            // Case 1: "yyyy-MM-dd HH:mm:ss" (no timezone) -> interpret as LOCAL time
            const ldtMatch = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw);
            if (ldtMatch) {
                const [, y, mo, d, h, mi, s] = ldtMatch.map(Number);
                date = new Date(y, mo - 1, d, h, mi, s);
            } else {
                // Case 2: ISO-like without timezone -> interpret as LOCAL time
                const isoNoZone = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(raw);
                if (isoNoZone) {
                    const [, y, mo, d, h, mi, s, msStr] = isoNoZone;
                    const ms = msStr ? Number(msStr.padEnd(3, '0').slice(0, 3)) : 0;
                    date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), ms);
                } else {
                    // Any other parseable format; let Date try
                    date = new Date(raw);
                }
            }
        } else {
            // Already a Date object or timestamp number
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) {
            // Fallback: use current time if parsing fails
            date = new Date();
        }

        return date.toLocaleString(undefined, {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        // Fallback: use current time if parsing fails
        return new Date().toLocaleString(undefined, {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
}

function loadRecentMessages() {
    const url = '/api/messages' + '?includeSystem=' + (showSystem ? 'true' : 'false');
    fetch(url)
        .then(response => response.json())
        .then(messages => {
            messages.forEach(message => {
                if (!showSystem && (message.type === 'JOIN' || message.type === 'LEAVE')) return;
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

function refreshMessages() {
    if (messageArea) {
        messageArea.innerHTML = '';
    }
    loadedInitialHistory = false;
    loadRecentMessages();
    loadedInitialHistory = true;
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
    // Hook system toggle
    systemToggleEl = document.getElementById('toggle-system');
    try {
        const saved = localStorage.getItem('showSystem');
        if (saved === 'true' || saved === 'false') showSystem = (saved === 'true');
    } catch (e) {}
    if (systemToggleEl) {
        systemToggleEl.checked = showSystem;
        systemToggleEl.addEventListener('change', function() {
            showSystem = !!systemToggleEl.checked;
            try { localStorage.setItem('showSystem', String(showSystem)); } catch (e) {}
            // Re-render history according to preference
            if (messageArea) messageArea.innerHTML = '';
            loadedInitialHistory = false; // allow reload
            if (isConnected()) {
                loadRecentMessages();
                loadedInitialHistory = true;
            }
        });
    }
    
    // Hook refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            refreshMessages();
        });
    }
    
    // Attach form event listeners
    console.log('usernameForm element:', usernameForm);
    console.log('messageForm element:', messageForm);
    console.log('usernamePage element:', usernamePage);
    console.log('chatPage element:', chatPage);
    
    if (usernameForm) {
        console.log('Attaching submit listener to username form');
        usernameForm.addEventListener('submit', connect, { once: false });
    } else {
        console.error('Username form not found!');
    }
    
    if (messageForm) {
        messageForm.addEventListener('submit', sendMessage, { once: false });
    }
    
    if (username) {
        // User has username, connect directly
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        // Ensure viewport is at top on iOS
        window.scrollTo(0, 0);
        initAndConnectStomp();
    } else {
        // Show username form
        usernamePage.classList.remove('hidden');
        chatPage.classList.add('hidden');
    }
});

// Focus on message input when page loads
window.addEventListener('load', function() {
    if (messageInput) {
        messageInput.focus();
    }
});

// Handle page visibility change to show notifications
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // When returning to foreground, ensure connection is alive
        if (!isConnected()) {
            scheduleReconnect();
        }
    }
});

// Network changes: reconnect when back online
window.addEventListener('online', function(){ if (!isConnected()) scheduleReconnect(); });
window.addEventListener('offline', function(){ setConnectionStatus('Offline'); });
