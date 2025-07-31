'use strict';

var usernameForm = document.querySelector('#usernameForm');
var usernameInput = document.querySelector('#name');
var passwordInput = document.querySelector('#password');
var statsInfo = document.querySelector('#stats-info');

// Load chat statistics
function loadStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            statsInfo.textContent = `Total messages: ${data.totalMessages} | Messages are kept for ${data.retentionDays} days`;
        })
        .catch(error => {
            console.error('Error loading stats:', error);
            statsInfo.textContent = 'Unable to load chat statistics';
        });
}

function onConnected() {
    // Tell everyone that a new user has joined
    var chatMessage = {
        sender: username,
        type: 'JOIN'
    };
    stompClient.send("/app/chat.addUser", {}, JSON.stringify(chatMessage));
}

function connect(event) {
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (username && password) {
        // Simple client-side password validation
        if (password === 'aga') {
            sessionStorage.setItem('username', username);
            window.location.href = '/chat';
        } else {
            alert('Incorrect password');
            passwordInput.focus();
        }
    } else {
        alert('Please enter both username and password.');
        if(!username) {
            usernameInput.focus();
        } else {
            passwordInput.focus();
        }
    }
}

// Event listeners
usernameForm.addEventListener('submit', connect, true);

// Load stats on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    
    // Focus on username input
    usernameInput.focus();
    
    // Check if username is already stored
    var storedUsername = localStorage.getItem('username');
    if (storedUsername) {
        usernameInput.value = storedUsername;
    }
});
