#!/usr/bin/env node

import { program } from 'commander';
import { ConnectorConfig } from './connector';
import { DingTalkQwenConnector } from './connector';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define command line options
program
  .name('dingtalk-qwen-connector')
  .description('CLI to connect DingTalk robot with Qwen Code agent using Stream mode')
  .version('1.0.0');

program
  .option('-d, --dingtalk-client-id <id>', 'DingTalk AppKey (clientId)')
  .option('-s, --dingtalk-client-secret <secret>', 'DingTalk AppSecret (clientSecret)')
  .option('--debug', 'Enable debug mode')
  .option('--session-timeout <ms>', 'Session timeout in milliseconds', '1800000')
  .option('-c, --cwd <path>', 'Working directory for Qwen Code (optional)')
  .option('-m, --model <model>', 'Qwen model to use (optional)')
  .option('--permission-mode <mode>', 'Permission mode (default|plan|auto-edit|yolo)', 'default');

program.parse();

const options = program.opts();

// Create connector configuration
const config: ConnectorConfig = {
  dingtalk: {
    clientId: options.dingtalkClientId || process.env.DINGTALK_CLIENT_ID!,
    clientSecret: options.dingtalkClientSecret || process.env.DINGTALK_CLIENT_SECRET!,
    debug: options.debug || process.env.DEBUG === 'true',
    sessionTimeout: parseInt(options.sessionTimeout || process.env.SESSION_TIMEOUT || '1800000')
  },
  qwenAgent: {
    options: {
      cwd: options.cwd || process.env.QWEN_CWD,
      model: options.model || process.env.QWEN_MODEL,
      permissionMode: options.permissionMode as 'default' | 'plan' | 'auto-edit' | 'yolo' || process.env.QWEN_PERMISSION_MODE as 'default' | 'plan' | 'auto-edit' | 'yolo',
      pathToQwenExecutable: 'qwen' // Assume qwen is in PATH
    }
  }
};

// Validate required configuration
if (!config.dingtalk.clientId) {
  console.error('Error: DingTalk Client ID (AppKey) is required');
  console.error('Please set --dingtalk-client-id or DINGTALK_CLIENT_ID environment variable');
  process.exit(1);
}

if (!config.dingtalk.clientSecret) {
  console.error('Error: DingTalk Client Secret (AppSecret) is required');
  console.error('Please set --dingtalk-client-secret or DINGTALK_CLIENT_SECRET environment variable');
  process.exit(1);
}

// Create the connector
const connector = new DingTalkQwenConnector(config);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[CLI] Shutting down...');
  await connector.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[CLI] Shutting down...');
  await connector.stop();
  process.exit(0);
});

// Start the connector
connector.start().catch((error) => {
  console.error('[CLI] Failed to start connector:', error);
  process.exit(1);
});