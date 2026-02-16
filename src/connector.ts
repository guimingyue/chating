import { DingTalkStreamClient, DingTalkStreamConfig, DingTalkMessage } from './dingtalk-client';
import { QwenAgentService, QwenAgentConfig } from './qwen-agent-service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface ConnectorConfig {
  dingtalk: DingTalkStreamConfig;
  qwenAgent: QwenAgentConfig;
}

// Commands to start a new session
const NEW_SESSION_COMMANDS = [
  '/new', '/reset', '/clear', '/restart',
  '新会话', '重新开始', '清空对话', '重启'
];

export class DingTalkQwenConnector {
  private dingtalkClient: DingTalkStreamClient;
  private qwenAgentService: QwenAgentService;
  private sessionPrompts: Map<string, string[]> = new Map(); // Store conversation history per session

  constructor(config: ConnectorConfig) {
    this.dingtalkClient = new DingTalkStreamClient(config.dingtalk);
    this.qwenAgentService = new QwenAgentService(config.qwenAgent);
    
    // Register message handler
    this.dingtalkClient.onMessage(this.handleMessage.bind(this));
  }

  /**
   * Process a message received from DingTalk and send it to Qwen agent
   */
  async processMessage(text: string, sessionKey: string): Promise<string> {
    try {
      // Get conversation history for this session
      const history = this.sessionPrompts.get(sessionKey) || [];
      
      // Build prompt with history
      const fullPrompt = this.buildPromptWithHistory(text, history);
      
      // Send the message to Qwen agent
      const agentResponse = await this.qwenAgentService.sendPrompt(fullPrompt);
      
      // Check if there was an error
      if (agentResponse.error) {
        console.error('Qwen agent error:', agentResponse.error);
        return `Sorry, I encountered an error: ${agentResponse.error}`;
      }
      
      // Update conversation history
      this.updateSessionHistory(sessionKey, text, agentResponse.result);
      
      // Return the agent's response
      return agentResponse.result || 'No response from Qwen agent';
    } catch (error) {
      console.error('Error processing message:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  /**
   * Build prompt with conversation history
   */
  private buildPromptWithHistory(currentMessage: string, history: string[]): string {
    // Include last 5 exchanges for context (adjust as needed)
    const recentHistory = history.slice(-10);
    return [...recentHistory, currentMessage].join('\n\n');
  }

  /**
   * Update session conversation history
   */
  private updateSessionHistory(sessionKey: string, userMessage: string, assistantResponse: string): void {
    if (!this.sessionPrompts.has(sessionKey)) {
      this.sessionPrompts.set(sessionKey, []);
    }
    
    const history = this.sessionPrompts.get(sessionKey)!;
    history.push(`User: ${userMessage}`);
    history.push(`Assistant: ${assistantResponse}`);
    
    // Limit history to last 20 messages to prevent memory issues
    if (history.length > 20) {
      this.sessionPrompts.set(sessionKey, history.slice(-20));
    }
  }

  /**
   * Handle incoming message from DingTalk
   */
  async handleMessage(message: DingTalkMessage): Promise<void> {
    console.log(`[Connector] Received message from ${message.senderNick}: ${message.text?.content || message.content?.recognition || ''}`);
    
    // Extract message content
    const content = extractContent(message);
    if (!content) {
      console.log('[Connector] No text content in message');
      return;
    }

    // Check for new session commands
    const forceNewSession = NEW_SESSION_COMMANDS.some(cmd => 
      content.toLowerCase().includes(cmd.toLowerCase())
    );

    // Get session key
    const { sessionKey, isNew } = this.dingtalkClient.getSessionKey(message.senderId, forceNewSession);
    
    if (forceNewSession) {
      await this.replyToMessage(message, '已开始新的会话，请问有什么可以帮您？');
      return;
    }

    if (isNew) {
      console.log(`[Connector] New session started for user ${message.senderNick}`);
    }

    // Process the message with Qwen agent
    const response = await this.processMessage(content, sessionKey);
    
    // Send the response back to DingTalk
    await this.replyToMessage(message, response);
  }

  /**
   * Reply to a message
   */
  private async replyToMessage(message: DingTalkMessage, content: string): Promise<void> {
    try {
      const conversationType = message.conversationType === 'group' ? '2' : '1';
      await this.dingtalkClient.sendTextMessage(
        message.conversationId,
        conversationType,
        content
      );
      console.log(`[Connector] Response sent to ${message.senderNick}`);
    } catch (error) {
      console.error('[Connector] Error sending response:', error);
    }
  }

  /**
   * Start the connector
   */
  async start(): Promise<void> {
    console.log('[Connector] Starting DingTalk-Qwen connector...');
    await this.dingtalkClient.connect();
    console.log('[Connector] DingTalk-Qwen connector is running');
  }

  /**
   * Stop the connector
   */
  async stop(): Promise<void> {
    console.log('[Connector] Stopping DingTalk-Qwen connector...');
    await this.dingtalkClient.disconnect();
    console.log('[Connector] DingTalk-Qwen connector stopped');
  }
}

// Helper function to extract message content
function extractContent(message: DingTalkMessage): string {
  switch (message.msgtype) {
    case 'text':
      return message.text?.content || '';
    case 'richText':
      if (message.richText?.parts) {
        return message.richText.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.content)
          .join('');
      }
      return '';
    case 'audio':
      return message.content?.recognition || '[Voice Message]';
    case 'picture':
      return '[Image]';
    case 'video':
      return '[Video]';
    case 'file':
      return '[File]';
    default:
      return message.text?.content || '';
  }
}