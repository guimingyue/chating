#!/usr/bin/env node

import { program } from 'commander';
import { ConnectorConfig } from './connector';
import { WebhookServer } from './webhook-server';
import { DingTalkQwenConnector } from './connector';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define command line options
program
  .name('dingtalk-qwen-connector')
  .description('CLI to connect DingTalk robot with Qwen Code agent')
  .version('1.0.0');

program
  .option('-p, --port <number>', 'Port to run the webhook server on', '3000')
  .option('-d, --dingtalk-webhook <url>', 'DingTalk bot webhook URL')
  .option('-s, --dingtalk-secret <secret>', 'DingTalk bot secret for signature verification')
  .option('-c, --cwd <path>', 'Working directory for Qwen Code (optional)')
  .option('-m, --model <model>', 'Qwen model to use (optional)')
  .option('--permission-mode <mode>', 'Permission mode (default|plan|auto-edit|yolo)', 'default');

program.parse();

const options = program.opts();

// Create connector configuration
const config: ConnectorConfig = {
  dingtalk: {
    webhook: options.dingtalkWebhook || process.env.DINGTALK_BOT_WEBHOOK!,
    secret: options.dingtalkSecret || process.env.DINGTALK_BOT_SECRET
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
if (!config.dingtalk.webhook) {
  console.error('Error: DingTalk webhook URL is required');
  process.exit(1);
}

// Create the connector
const connector = new DingTalkQwenConnector(config);

// Create and start the webhook server
const server = new WebhookServer(connector, parseInt(options.port));
server.start();

console.log('DingTalk-Qwen connector is running...');