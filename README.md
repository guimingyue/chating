# DingTalk-Qwen Connector

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

A connector that bridges DingTalk robot with Qwen Code using **Stream mode**, enabling multi-turn AI conversations directly within DingTalk chat.

## ✨ Features

- **Stream Mode**: Uses DingTalk Stream WebSocket - no public IP or webhook server required
- **Multi-turn Conversations**: Automatic session management with configurable timeout
- **Message Deduplication**: Prevents duplicate message processing
- **Session Commands**: Support for `/new`, `/reset`, `/clear` and Chinese equivalents
- **Multiple Message Types**: Text, audio (voice recognition), images, videos, and files
- **Qwen Code Integration**: Official @qwen-code/sdk for AI capabilities
- **Graceful Shutdown**: Handles SIGINT and SIGTERM signals properly

## 📋 Prerequisites

- **Node.js** >= 20.x
- **Qwen Code** >= 0.4.0 (installed as `qwen` command in PATH)
- **DingTalk Developer Account** with an app created
- **DingTalk Robot** configured for **Stream mode** (not Webhook mode)

## 🔐 Required DingTalk Permissions

- `Card.Streaming.Write`
- `Card.Instance.Write`
- `qyapi_robot_sendmsg`

## 🚀 Quick Start

### Using npx (Recommended)

```bash
npx dingtalk-qwen-connector \
  --dingtalk-client-id YOUR_APP_KEY \
  --dingtalk-client-secret YOUR_APP_SECRET \
  --model qwen-code
```

### Install Locally

```bash
git clone https://github.com/guimingyue/chating.git
cd chating
npm install
npm run build
npm start
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# DingTalk Stream Configuration (Required)
DINGTALK_CLIENT_ID=your_app_key_here        # DingTalk AppKey
DINGTALK_CLIENT_SECRET=your_app_secret_here # DingTalk AppSecret

# Qwen Code Configuration
QWEN_CWD=/path/to/your/project              # Working directory (optional)
QWEN_MODEL=qwen-code                        # Model to use
QWEN_PERMISSION_MODE=default                # default|plan|auto-edit|yolo

# Optional Settings
DEBUG=false                                 # Enable debug logging
SESSION_TIMEOUT=1800000                     # Session timeout in ms (default: 30 min)
```

### CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--dingtalk-client-id` | `-d` | DingTalk AppKey | Required |
| `--dingtalk-client-secret` | `-s` | DingTalk AppSecret | Required |
| `--cwd` | `-c` | Qwen Code working directory | `process.cwd()` |
| `--model` | `-m` | Qwen model to use | `qwen-code` |
| `--permission-mode` | - | Permission mode | `default` |
| `--session-timeout` | - | Session timeout (ms) | `1800000` |
| `--debug` | - | Enable debug mode | `false` |

### Example

```bash
npx dingtalk-qwen-connector \
  --dingtalk-client-id "dingxxxxxxxxx" \
  --dingtalk-client-secret "xxxxxxxxxxxxxx" \
  --cwd "/Users/username/projects/my-app" \
  --model "qwen-plus" \
  --permission-mode "auto-edit" \
  --debug
```

## 📖 Setup Guide

### 1. Create DingTalk App

1. Visit [DingTalk Developer Platform](https://open.dingtalk.com/)
2. Create a new enterprise app
3. Add **Robot** capability to your app

### 2. Configure Robot for Stream Mode

1. Go to **Robot** settings in your app
2. Select **Stream mode** (⚠️ NOT Webhook mode)
3. Save your **AppKey** and **AppSecret**

### 3. Grant Permissions

In the DingTalk Developer Platform, grant these permissions:
- `Card.Streaming.Write`
- `Card.Instance.Write`
- `qyapi_robot_sendmsg`

### 4. Publish and Install

1. Publish your app
2. Install it to your organization or test group

### 5. Run the Connector

```bash
export DINGTALK_CLIENT_ID="your_app_key"
export DINGTALK_CLIENT_SECRET="your_app_secret"
npm start
```

## 💬 Usage

### Session Management

The connector automatically manages conversation sessions:

| Event | Behavior |
|-------|----------|
| First message | Creates new session |
| Within 30 min | Continues existing session |
| After 30 min inactivity | Creates new session |
| Session commands | Forces new session |

### Session Commands

Send any of these to start a fresh conversation:
- `/new`, `/reset`, `/clear`, `/restart`
- `新会话`, `重新开始`, `清空对话`, `重启`

### Supported Message Types

| Type | User Sends | Bot Responds |
|------|-----------|--------------|
| **Text** | ✅ | ✅ |
| **Audio** | ✅ (with recognition) | ✅ |
| **Picture** | ✅ | ✅ |
| **Video** | ✅ | ✅ |
| **File** | ✅ | ✅ |
| **RichText** | ✅ | ✅ |

## 🏗️ Architecture

```
┌─────────────────┐
│  DingTalk App   │
│  ┌───────────┐  │
│  │   User    │  │
│  └─────┬─────┘  │
│        ▼        │
│  ┌───────────┐  │
│  │   Robot   │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │ (Stream WebSocket)
         ▼
┌─────────────────────────────────┐
│  DingTalk-Qwen Connector        │
│  ┌───────────────────────────┐  │
│  │  DingTalkStreamClient     │  │
│  │  - WebSocket Connection   │  │
│  │  - Message Deduplication  │  │
│  │  - Session Management     │  │
│  └───────────┬───────────────┘  │
│              │                   │
│  ┌───────────▼───────────────┐  │
│  │  DingTalkQwenConnector    │  │
│  │  - Message Processing     │  │
│  │  - History Management     │  │
│  └───────────┬───────────────┘  │
│              │                   │
│  ┌───────────▼───────────────┐  │
│  │  QwenAgentService         │  │
│  │  - @qwen-code/sdk         │  │
│  │  - Local qwen command     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Core Components

| Component | Description |
|-----------|-------------|
| `DingTalkStreamClient` | Manages WebSocket connection, authentication, and message routing |
| `DingTalkQwenConnector` | Orchestrates message flow and session management |
| `QwenAgentService` | Interfaces with Qwen Code via TypeScript SDK |
| `cli.ts` | Command-line entry point with graceful shutdown |

## 🔒 Security

- **OAuth 2.0**: Uses DingTalk's official authentication
- **Token Caching**: Access tokens cached and auto-refreshed
- **Message Deduplication**: Prevents replay attacks (5-min TTL)
- **Session Timeout**: Limits exposure window (configurable)
- **Environment Variables**: Sensitive config never hardcoded

## 🎛️ Permission Modes

| Mode | Read Tools | Write Tools | Use Case |
|------|-----------|-------------|----------|
| `default` | ✅ Auto | ❌ Require approval | General use |
| `plan` | ✅ Auto | ❌ Blocked (plan only) | Code review |
| `auto-edit` | ✅ Auto | ✅ Edit only | Development |
| `yolo` | ✅ Auto | ✅ Auto | Trusted environments |

## 🐛 Troubleshooting

### Connection Issues

**Problem**: `Connection failed`
```bash
# Verify credentials
echo $DINGTALK_CLIENT_ID
echo $DINGTALK_CLIENT_SECRET

# Check robot is in Stream mode (not Webhook mode)
```

**Problem**: `Qwen command not found`
```bash
# Verify Qwen Code installation
qwen --version

# Ensure qwen is in PATH
which qwen
```

### Session Issues

**Problem**: Sessions timing out too quickly
```bash
# Increase session timeout (default: 30 min)
export SESSION_TIMEOUT=3600000  # 1 hour
```

**Problem**: Duplicate messages
```bash
# This is expected behavior - deduplication is working
# Messages with same ID within 5 min are ignored
```

### Debug Mode

Enable detailed logging:
```bash
export DEBUG=true
npm start
```

## 🧪 Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

### Permission Issues

If you encounter permission errors during installation:

```bash
# Fix ownership of project directory
sudo chown -R $(whoami) .

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Verification

After successful build, verify the CLI:

```bash
npm run build
node dist/cli.js --help
```

## 📁 Project Structure

```
chating/
├── src/
│   ├── cli.ts                 # Command-line entry point
│   ├── connector.ts           # Main connector logic
│   ├── dingtalk-client.ts     # DingTalk Stream client
│   ├── qwen-agent-service.ts  # Qwen Code SDK wrapper
│   └── index.ts               # Public exports
├── tests/
│   ├── connector.test.ts      # Connector tests
│   ├── dingtalk-client.test.ts # Client tests
│   └── qwen-agent-service.test.ts # Service tests
├── .env                       # Environment variables (template)
├── .env.example               # Environment variables (example)
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── jest.config.js             # Jest test config
└── README.md                  # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style (Prettier)
- Write tests for new features
- Update documentation as needed
- Use meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 References

- [DingTalk OpenClaw Connector](https://github.com/DingTalk-Real-AI/dingtalk-openclaw-connector/)
- [Qwen Code TypeScript SDK Docs](https://qwenlm.github.io/qwen-code-docs/zh/developers/sdk-typescript/)
- [DingTalk Stream API](https://open.dingtalk.com/document/orgapp/stream-mode)
- [@qwen-code/sdk on npm](https://www.npmjs.com/package/@qwen-code/sdk)
- [dingtalk-stream on npm](https://www.npmjs.com/package/dingtalk-stream)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/guimingyue/chating/issues)
- **Discussions**: [GitHub Discussions](https://github.com/guimingyue/chating/discussions)