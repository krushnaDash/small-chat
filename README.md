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
## MCP server details

SmallChat exposes MCP-style admin operations via a single Spring Boot REST controller at `/mcp/**`.

- Controller: `src/main/java/com/krushna/smallchat/controller/McpController.java`
- Auth: Bearer token required (configurable)
- Broadcasts: `POST /mcp/messages` publishes to `/topic/public`

### Configure authentication

In `src/main/resources/application.properties`:

```properties
# Enable/disable MCP auth (default: true)
mcp.auth.enabled=true
# Shared bearer token for MCP clients (change this!)
mcp.auth.token=***
```

When `mcp.auth.enabled=true`, all `/mcp/**` endpoints require:

```
Authorization: Bearer <TOKEN>
```

### Quick start (localhost)

Set environment helpers for curl:

```bash
BASE="http://localhost:8080"
TOKEN="changeme"   # replace if you changed mcp.auth.token
AUTH="Authorization: Bearer $TOKEN"
```

### Endpoints and curl examples

- __Health__ — `GET /mcp/health`

```bash
curl -sH "$AUTH" "$BASE/mcp/health"
```

- __Stats__ — `GET /mcp/stats`

```bash
curl -sH "$AUTH" "$BASE/mcp/stats"
```

- __Get recent messages__ — `GET /mcp/messages/recent?limit=50`

```bash
curl -sH "$AUTH" "$BASE/mcp/messages/recent?limit=50"
```

- __Get all messages (paged)__ — `GET /mcp/messages?page=0&size=100`

```bash
curl -sH "$AUTH" "$BASE/mcp/messages?page=0&size=100"
```

- __Post a message (broadcasts to /topic/public)__ — `POST /mcp/messages`

```bash
curl -sX POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"sender":"Admin","content":"Hello from MCP!","type":"CHAT"}' \
  "$BASE/mcp/messages"
```

Notes:

- `type` is optional; defaults to `CHAT`. Allowed: `CHAT`, `JOIN`, `LEAVE`.
- Server assigns a timestamp if not provided.

- __Clear all messages__ — `POST /mcp/messages/clear`

```bash
curl -sX POST -H "$AUTH" "$BASE/mcp/messages/clear"
```

### CORS

MCP controller is annotated with `@CrossOrigin(origins = "*")`. Restrict origins as needed for production.


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
