# SmallChat - WhatsApp Web-like Chat Application

SmallChat is a real-time chat application built with Spring Boot that allows two or more people to chat without requiring user accounts. Messages are stored in memory and automatically purged after 3 days (configurable).

## Features

- **Real-time messaging** using WebSocket technology
- **No user registration required** - just enter your name and start chatting
- **In-memory storage** with automatic message cleanup after 3 days
- **WhatsApp Web-like UI** with modern, responsive design
- **Browser notifications** for new messages when tab is not active
- **RESTful API** for message management and statistics
- **Configurable message retention** period
- **Health monitoring** with Spring Boot Actuator

## Technology Stack

- **Backend**: Java 17, Spring Boot 3.2.0, Maven
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Real-time Communication**: WebSocket with STOMP protocol
- **Build Tool**: Maven
- **Deployment**: Azure App Service ready

## Getting Started

### Prerequisites

- Java 17 or higher
- Maven 3.6+

### Running the Application

1. Clone the repository
2. Navigate to the project directory
3. Run the application:

```bash
mvn spring-boot:run
```

4. Open your browser and go to `http://localhost:8080`
5. Enter your name and start chatting!

### Configuration

You can configure the message retention period in `application.properties`:

```properties
# Message retention in days (default: 3)
smallchat.message.retention.days=3
```

## API Endpoints

### REST API

- `GET /api/messages` - Get all messages
- `GET /api/messages/recent?limit=50` - Get recent messages
- `GET /api/stats` - Get chat statistics
- `POST /api/messages/clear` - Clear all messages
- `GET /api/health` - Health check

### WebSocket Endpoints

- `/ws` - WebSocket connection endpoint
- `/app/chat.sendMessage` - Send a chat message
- `/app/chat.addUser` - Add user to chat
- `/topic/public` - Subscribe to receive messages

## Project Structure

```
src/
├── main/
│   ├── java/com/krushna/smallchat/
│   │   ├── SmallChatApplication.java
│   │   ├── config/
│   │   │   └── WebSocketConfig.java
│   │   ├── controller/
│   │   │   ├── ChatRestController.java
│   │   │   └── WebController.java
│   │   ├── model/
│   │   │   └── ChatMessage.java
│   │   ├── service/
│   │   │   └── MessageStorageService.java
│   │   └── websocket/
│   │       ├── ChatController.java
│   │       └── WebSocketEventListener.java
│   └── resources/
│       ├── static/
│       │   ├── css/main.css
│       │   └── js/
│       │       ├── main.js
│       │       └── chat.js
│       ├── templates/
│       │   ├── index.html
│       │   └── chat.html
│       └── application.properties
└── test/
    └── java/com/krushna/smallchat/
        └── SmallChatApplicationTests.java
```

## Deployment to Azure

The application is configured for deployment to Azure App Service. See the GitHub Actions workflow in `.github/workflows/azure-deploy.yml` for automated CI/CD.

## Features in Detail

### Message Storage
- Messages are stored in a thread-safe ConcurrentHashMap
- Automatic cleanup runs every hour to remove messages older than the configured retention period
- No database required - everything runs in memory

### Real-time Communication
- Uses WebSocket with STOMP protocol for real-time messaging
- Supports join/leave notifications
- Message broadcasting to all connected users

### User Experience
- WhatsApp Web-inspired design
- Responsive layout for mobile and desktop
- Browser notifications for new messages
- Message timestamps and sender identification
- Automatic scrolling to latest messages

### Monitoring
- Health check endpoint for deployment monitoring
- Message statistics API
- Configurable logging levels

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.
