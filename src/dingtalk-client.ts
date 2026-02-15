import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import * as qs from 'querystring';

export interface DingTalkMessage {
  msgtype: string;
  [key: string]: any;
}

export interface DingTalkConfig {
  webhook: string;
  secret?: string;
}

export class DingTalkClient {
  private config: DingTalkConfig;

  constructor(config: DingTalkConfig) {
    this.config = config;
  }

  /**
   * Send a message to DingTalk robot
   */
  async sendMessage(message: DingTalkMessage): Promise<AxiosResponse> {
    const url = this.getSignedWebhookUrl();
    
    const response = await axios.post(url, message, {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
    });

    return response;
  }

  /**
   * Generate signed webhook URL if secret is provided
   */
  private getSignedWebhookUrl(): string {
    if (!this.config.secret) {
      return this.config.webhook;
    }

    const timestamp = Date.now();
    const secret = this.config.secret;
    
    // Create signature using HMAC-SHA256
    const signData = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signData);
    const signature = encodeURIComponent(hmac.digest('base64'));

    // Append timestamp and signature to the webhook URL
    const separator = this.config.webhook.includes('?') ? '&' : '?';
    return `${this.config.webhook}${separator}timestamp=${timestamp}&sign=${signature}`;
  }

  /**
   * Send a text message
   */
  async sendText(content: string, atMobiles?: string[], isAtAll?: boolean): Promise<AxiosResponse> {
    const message: DingTalkMessage = {
      msgtype: 'text',
      text: {
        content: content
      }
    };

    if (atMobiles || isAtAll) {
      message.at = {
        atMobiles: atMobiles || [],
        isAtAll: isAtAll || false
      };
    }

    return this.sendMessage(message);
  }

  /**
   * Send a markdown message
   */
  async sendMarkdown(title: string, text: string, atMobiles?: string[], isAtAll?: boolean): Promise<AxiosResponse> {
    const message: DingTalkMessage = {
      msgtype: 'markdown',
      markdown: {
        title: title,
        text: text
      }
    };

    if (atMobiles || isAtAll) {
      message.at = {
        atMobiles: atMobiles || [],
        isAtAll: isAtAll || false
      };
    }

    return this.sendMessage(message);
  }
}