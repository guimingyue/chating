# DingTalk-Qwen Connector

A connector that bridges DingTalk robot with Qwen Code SDK using **Stream mode**, allowing users to interact with the Qwen Code AI through DingTalk with multi-turn conversation support.

## Features

- **Stream Mode**: Uses DingTalk Stream WebSocket (no public IP required)
- **Multi-turn Conversations**: Session management with configurable timeout
- **Message Deduplication**: Prevents duplicate processing
- **Session Commands**: Support for `/new`, `/reset`, `/clear` and Chinese equivalents
- **Multiple Message Types**: Supports text, audio (voice recognition), images, videos, and files
- **Qwen Code Integration**: Uses official @qwen-code/sdk for AI capabilities

## Prerequisites

- Node.js >= 20.x
- Qwen Code >= 0.4.0 installed and accessible as `qwen` command in PATH
- DingTalk Developer Account with an app created
- DingTalk robot configured for **Stream mode**

## Required DingTalk Permissions

- `Card.Streaming.Write`
- `Card.Instance.Write`
- `qyapi_robot_sendmsg`

## Installation

### Option 1: Using npx (Recommended)

```bash
npx dingtalk-qwen-connector \
  --dingtalk-client-id YOUR_APP_KEY \
  --dingtalk-client-secret YOUR_APP_SECRET \
  --model qwen-code
```

### Option 2: Clone and Install

```bash
git clone <repository-url>
cd dingtalk-qwen-connector
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# DingTalk Stream Configuration
DINGTALK_CLIENT_ID=your_app_key_here       # DingTalk AppKey
DINGTALK_CLIENT_SECRET=your_app_secret_here # DingTalk AppSecret

# Qwen Code SDK Configuration
QWEN_CWD=                    # Working directory (optional)
QWEN_MODEL=qwen-code        # Model to use
QWEN_PERMISSION_MODE=default # Permission mode (default|plan|auto-edit|yolo)

# Optional Settings
DEBUG=false
SESSION_TIMEOUT=1800000      # Session timeout in ms (default: 30 min)
```

### Command Line Options

```bash
npx dingtalk-qwen-connector \
  --dingtalk-client-id "YOUR_APP_KEY" \
  --dingtalk-client-secret "YOUR_APP_SECRET" \
  --cwd "/path/to/project" \
  --model "qwen-code" \
  --permission-mode "auto-edit" \
  --session-timeout 1800000 \
  --debug
```

## Usage

### Running the Connector

```bash
npm start
```

Or using npx:

```bash
npx dingtalk-qwen-connector --dingtalk-client-id YOUR_APP_KEY --dingtalk-client-secret YOUR_APP_SECRET
```

### Setting Up DingTalk Robot

1. **Create a DingTalk App** in [DingTalk Developer Platform](https://open.dingtalk.com/)
2. **Add Robot Capability** to your app
3. **Configure Robot for Stream Mode**:
   - Go to Robot settings
   - Select **Stream mode** (not Webhook mode)
   - Note your AppKey and AppSecret
4. **Grant Required Permissions**:
   - `Card.Streaming.Write`
   - `Card.Instance.Write`
   - `qyapi_robot_sendmsg`
5. **Publish the App** and install it to your organization

### Session Management

The connector automatically manages conversation sessions:

- **New Session**: Automatically created after 30 minutes of inactivity (configurable)
- **Manual Reset**: Send `/new`, `/reset`, `/clear`, `新会话`, `重新开始`, or `清空对话`
- **Session Persistence**: Conversation history is maintained for context-aware responses

### Supported Message Types

| Type | Description |
|------|-------------|
| Text | Plain text messages |
| Audio | Voice messages (with speech recognition) |
| Picture | Image messages |
| Video | Video messages |
| File | File attachments |
| RichText | Rich text messages |

## Development

### Building from Source

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

## Architecture

```
┌─────────────────┐
│ DingTalk Stream │
│   (WebSocket)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  DWClient       │────▶│ Message Dedup    │
│  Callback       │     │ (5min TTL cache) │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│ Session Manager │───▶ userSessions Map
│ (30min timeout) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QwenAgentService│───▶ @qwen-code/sdk
│                 │     (qwen command in PATH)
└─────────────────┘
```

### Components

- `DingTalkStreamClient`: Handles DingTalk Stream WebSocket connection
- `DingTalkQwenConnector`: Main connector logic with session management
- `QwenAgentService`: Interfaces with Qwen Code via TypeScript SDK
- `cli.ts`: Command-line entry point

## Security

- Uses DingTalk OAuth 2.0 for authentication
- Access tokens are cached and refreshed automatically
- Message deduplication prevents replay attacks
- Session timeout limits exposure window
- All sensitive configuration via environment variables

## Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Write tools rejected unless approved |
| `plan` | Blocks all write tools, AI proposes plan first |
| `auto-edit` | Auto-approves edit tools, others need confirmation |
| `yolo` | All tools execute automatically |

## Troubleshooting

### Common Issues

1. **Connection failed**: Check that your AppKey and AppSecret are correct
2. **Qwen command not found**: Ensure Qwen Code is installed and in PATH
3. **Duplicate messages**: Message deduplication is working correctly
4. **Session timeout**: Adjust `SESSION_TIMEOUT` environment variable

### Verifying Installation

```bash
# Check Qwen Code installation
qwen --version

# Check DingTalk credentials
echo $DINGTALK_CLIENT_ID
echo $DINGTALK_CLIENT_SECRET
```

### Debug Mode

Enable debug mode for detailed logs:

```bash
npx dingtalk-qwen-connector \
  --dingtalk-client-id YOUR_APP_KEY \
  --dingtalk-client-secret YOUR_APP_SECRET \
  --debug
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## References

- [DingTalk OpenClaw Connector](https://github.com/DingTalk-Real-AI/dingtalk-openclaw-connector/)
- [Qwen Code TypeScript SDK](https://qwenlm.github.io/qwen-code-docs/zh/developers/sdk-typescript/)
- [DingTalk Stream Documentation](https://open.dingtalk.com/document/)