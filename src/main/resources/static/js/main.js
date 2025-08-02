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
    console.log('Connect function called');
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    console.log('Authentication attempt:', { username: username, passwordLength: password.length });
    
    if (!username) {
        alert('Please enter your username.');
        usernameInput.focus();
        return;
    }
    
    if (!password) {
        alert('Please enter the chat password.');
        passwordInput.focus();
        return;
    }
    
    // Simple client-side password validation
    if (password === 'aga') {
        console.log('Password correct, redirecting to chat');
        try {
            sessionStorage.setItem('username', username);
            console.log('Username stored in sessionStorage:', sessionStorage.getItem('username'));
            
            // Use a more reliable redirect method
            setTimeout(function() {
                window.location.href = '/chat';
            }, 100);
            
        } catch (error) {
            console.error('Error during authentication:', error);
            alert('Authentication error. Please try again.');
        }
    } else {
        console.log('Incorrect password provided');
        alert('Incorrect password. Please try again.');
        passwordInput.value = '';
        passwordInput.focus();
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
