import { DWClient, TOPIC_ROBOT } from 'dingtalk-stream';
import axios from 'axios';

export interface DingTalkStreamConfig {
  clientId: string;       // DingTalk AppKey
  clientSecret: string;   // DingTalk AppSecret
  debug?: boolean;        // Enable debug mode
  sessionTimeout?: number; // Session timeout in milliseconds (default: 30 min)
}

export interface DingTalkMessage {
  messageId: string;
  senderId: string;       // This is the unionId or openId from stream
  senderStaffId?: string; // Actual staffId for API calls
  senderNick: string;
  conversationId: string;
  msgtype: string;
  text?: {
    content: string;
  };
  content?: {
    recognition?: string;
  };
  conversationType?: string;
  chatbotUserId?: string;
  incomingWebhook?: string;
  [key: string]: any;
}

export interface DingTalkResponse {
  success: boolean;
  messageId: string;
}

export class DingTalkStreamClient {
  private client: DWClient;
  private config: DingTalkStreamConfig;
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;
  private processedMessages: Map<string, number> = new Map();
  private userSessions: Map<string, { sessionId: string; lastActivity: number }> = new Map();
  private messageHandlers: Array<(message: DingTalkMessage) => Promise<void>> = [];

  constructor(config: DingTalkStreamConfig) {
    this.config = config;
    this.client = new DWClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      debug: config.debug || false,
    });
  }

  /**
   * Connect to DingTalk Stream WebSocket
   */
  async connect(): Promise<void> {
    this.client.registerCallbackListener(TOPIC_ROBOT, async (res: any) => {
      try {
        console.log('[DingTalk] message received, ' + res);
        const message = this.parseMessage(res);

        // Skip system messages (e.g., heartbeats) that don't have messageId
        if (!message.messageId) {
          console.log('[DingTalk] System message received, skipping acknowledgment');
          return;
        }

        // Message deduplication
        if (this.isMessageProcessed(message.messageId)) {
          console.log(`[DingTalk] Duplicate message ignored: ${message.messageId}`);
          return;
        }
        this.markMessageProcessed(message.messageId);

        // Acknowledge immediately to prevent DingTalk server retries
        await this.client.socketCallBackResponse(message.messageId, { success: true });

        // Process the message
        await this.handleMessage(message);
      } catch (error) {
        console.error('[DingTalk] Error processing message:', error);
      }
    });

    await this.client.connect();
    console.log('[DingTalk] Connected to Stream WebSocket');
  }

  /**
   * Parse incoming message to DingTalkMessage format
   */
  private parseMessage(res: any): DingTalkMessage {
    // Parse data if it's a JSON string
    let data = res.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        console.error('[DingTalk] Failed to parse message data:', error);
        data = {};
      }
    }

    // Debug: log the full data structure
    console.log('[DingTalk] Raw message data:', JSON.stringify(data, null, 2));
    console.log('[DingTalk] Message headers:', JSON.stringify(res.headers, null, 2));

    return {
      messageId: res.headers?.messageId,
      senderId: data.senderStaffId || data.senderId,
      senderStaffId: data.senderStaffId,
      senderNick: data.senderNick || 'User',
      conversationId: data.conversationId,
      msgtype: data.msgtype,
      text: data.text,
      content: data.content,
      conversationType: data.conversationType,
      chatbotUserId: data.chatbotUserId,
      ...data,
    };
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: DingTalkMessage): Promise<void> {
    for (const handler of this.messageHandlers) {
      await handler(message);
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: (message: DingTalkMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Get session key for multi-turn conversation
   */
  getSessionKey(senderId: string, forceNew: boolean = false): { sessionKey: string; isNew: boolean } {
    const now = Date.now();
    const sessionTimeout = this.config.sessionTimeout || 30 * 60 * 1000; // 30 minutes default
    const existing = this.userSessions.get(senderId);

    // Force new session (user commands: /new, /reset, etc.)
    if (forceNew) {
      const sessionId = `dingtalk-qwen:${senderId}:${now}`;
      this.userSessions.set(senderId, { sessionId, lastActivity: now });
      return { sessionKey: sessionId, isNew: true };
    }

    // Check timeout
    if (existing && now - existing.lastActivity > sessionTimeout) {
      const sessionId = `dingtalk-qwen:${senderId}:${now}`;
      this.userSessions.set(senderId, { sessionId, lastActivity: now });
      return { sessionKey: sessionId, isNew: true };
    }

    // Reuse existing session
    if (existing) {
      existing.lastActivity = now;
      return { sessionKey: existing.sessionId, isNew: false };
    }

    // First-time session
    const sessionId = `dingtalk-qwen:${senderId}`;
    this.userSessions.set(senderId, { sessionId, lastActivity: now });
    return { sessionKey: sessionId, isNew: false };
  }

  /**
   * Message deduplication
   */
  private isMessageProcessed(messageId: string): boolean {
    return this.processedMessages.has(messageId);
  }

  private markMessageProcessed(messageId: string): void {
    this.processedMessages.set(messageId, Date.now());
    // Cleanup old messages (keep last 100)
    if (this.processedMessages.size >= 100) {
      this.cleanupProcessedMessages();
    }
  }

  private cleanupProcessedMessages(): void {
    const now = Date.now();
    const TTL = 5 * 60 * 1000; // 5 minutes
    for (const [id, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > TTL) {
        this.processedMessages.delete(id);
      }
    }
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.accessTokenExpiry > now + 60000) {
      return this.accessToken;
    }

    const response = await axios.post(
      'https://api.dingtalk.com/v1.0/oauth2/accessToken',
      {
        appKey: this.config.clientId,
        appSecret: this.config.clientSecret,
      }
    );

    this.accessToken = response.data.accessToken;
    this.accessTokenExpiry = now + response.data.expiresIn * 1000;
    return this.accessToken!;
  }

  /**
   * Send a text message to DingTalk
   */
  async sendTextMessage(
    conversationId: string,
    conversationType: '1' | '2', // '1' for personal, '2' for group
    content: string,
    atUserIds?: string[],
    atAll?: boolean
  ): Promise<DingTalkResponse> {
    const token = await this.getAccessToken();

    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Different endpoints and request formats for personal vs group chats
    if (conversationType === '2') {
      // Group chat: use groupMessages/send
      const response = await axios.post(
        'https://api.dingtalk.com/v1.0/robot/groupMessages/send',
        {
          robotCode: this.config.clientId,
          openConversationId: conversationId,
          msgKey: 'sampleText',
          msgParam: JSON.stringify({
            content: contentStr,
          }),
        },
        {
          headers: {
            'x-acs-dingtalk-access-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.success,
        messageId: response.data.messageId,
      };
    } else {
      // Personal chat: use oToMessages/batchSend
      const response = await axios.post(
        'https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend',
        {
          robotCode: this.config.clientId,
          userIds: atUserIds || [],
          msgKey: 'sampleText',
          msgParam: JSON.stringify({
            content: contentStr,
          }),
        },
        {
          headers: {
            'x-acs-dingtalk-access-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.success,
        messageId: response.data.messageId,
      };
    }
  }

  /**
   * Disconnect from DingTalk Stream
   */
  async disconnect(): Promise<void> {
    // DWClient doesn't have a close method in the current SDK
    // The connection will be closed when the process exits
    console.log('[DingTalk] Disconnecting from Stream WebSocket');
  }
}