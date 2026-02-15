# DingTalk-Qwen Connector

A connector that bridges DingTalk robot with Qwen Code SDK, allowing users to interact with the Qwen Code AI through DingTalk.

## Features

- Receive messages from DingTalk robot
- Forward messages to Qwen Code via SDK
- Return Qwen's responses to DingTalk
- Support for message signing for security
- Configurable via environment variables
- Simple setup assuming `qwen` command is in PATH

## Prerequisites

- Node.js >= 20.x
- A DingTalk robot webhook URL and secret (optional)
- Qwen Code >= 0.4.0 installed and accessible as `qwen` command in PATH
- Install the Qwen Code TypeScript SDK: `npm install @qwen-code/sdk`

## Installation

### Option 1: Using npx (Recommended)

```bash
npx dingtalk-qwen-connector --dingtalk-webhook YOUR_WEBHOOK_URL --model qwen-code
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

Create a `.env` file in the root directory with the following variables:

```env
# DingTalk Bot Configuration
DINGTALK_BOT_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=your_token
DINGTALK_BOT_SECRET=your_secret # Optional, for signature verification

# Qwen Code SDK Configuration
QWEN_CWD=                    # Working directory for Qwen Code (optional, defaults to current directory)
QWEN_MODEL=qwen-code        # Model to use
QWEN_PERMISSION_MODE=default # Permission mode (default|plan|auto-edit|yolo)
```

### Command Line Options

Alternatively, you can specify configuration via command line options:

```bash
npx dingtalk-qwen-connector \
  --port 3000 \
  --dingtalk-webhook "https://oapi.dingtalk.com/robot/send?access_token=xxx" \
  --dingtalk-secret "xxx" \
  --cwd "/path/to/project" \
  --model "qwen-code" \
  --permission-mode "auto-edit"
```

## Usage

### Running the Connector

After installation, run the connector with:

```bash
npm start
```

Or using npx:

```bash
npx dingtalk-qwen-connector
```

The connector will start a server that listens for DingTalk webhooks and forwards messages to Qwen Code via the SDK.

### Setting Up DingTalk Robot Webhook

1. Create a custom robot in your DingTalk group
2. Copy the webhook URL and (optionally) the secret
3. Configure the connector with these values
4. Set the webhook URL in DingTalk to point to your connector server: `http://your-server:3000/webhook/dingtalk`

## Permission Modes

The connector supports different permission modes for Qwen Code:

- `default`: Write tools are rejected unless approved via permission callbacks or in allowed tools. Read-only tools execute without confirmation.
- `plan`: Blocks all write tools, directing AI to propose a plan first.
- `auto-edit`: Automatically approves edit tools (edit, write_file), other tools need confirmation.
- `yolo`: All tools execute automatically without confirmation.

Choose the appropriate permission mode based on your security requirements.

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

The connector consists of several key components:

- `DingTalkClient`: Handles communication with DingTalk robot API
- `QwenAgentService`: Interfaces with the Qwen Code via the TypeScript SDK
- `DingTalkQwenConnector`: Main connector logic that ties everything together
- `WebhookServer`: HTTP server that receives DingTalk webhooks
- `cli.ts`: Entry point for the command-line interface

## Security

- The connector supports DingTalk's signature verification for webhook requests
- All sensitive configuration is handled through environment variables
- The connector uses the Qwen Code SDK's permission system to control tool execution
- Assumes Qwen Code is installed locally and accessible via the `qwen` command

## Troubleshooting

### Common Issues

1. **Qwen command not found**: Ensure Qwen Code is installed and the `qwen` command is available in your PATH.
2. **Connection timeout**: Check that your webhook URL is accessible and properly configured.
3. **Permission errors**: Adjust the permission mode according to your security requirements.

### Verifying Installation

To verify that Qwen Code is properly installed, run:
```bash
qwen --version
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.