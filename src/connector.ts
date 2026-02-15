import { DingTalkClient, DingTalkConfig } from './dingtalk-client';
import { QwenAgentService, QwenAgentConfig } from './qwen-agent-service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface ConnectorConfig {
  dingtalk: DingTalkConfig;
  qwenAgent: QwenAgentConfig;
}

export class DingTalkQwenConnector {
  private dingtalkClient: DingTalkClient;
  private qwenAgentService: QwenAgentService;

  constructor(config: ConnectorConfig) {
    this.dingtalkClient = new DingTalkClient(config.dingtalk);
    this.qwenAgentService = new QwenAgentService(config.qwenAgent);
  }

  /**
   * Process a message received from DingTalk and send it to Qwen agent
   */
  async processMessage(text: string): Promise<string> {
    try {
      // Send the message to Qwen agent
      const agentResponse = await this.qwenAgentService.sendPrompt(text);
      
      // Check if there was an error
      if (agentResponse.error) {
        console.error('Qwen agent error:', agentResponse.error);
        return `Sorry, I encountered an error: ${agentResponse.error}`;
      }
      
      // Return the agent's response
      return agentResponse.result || 'No response from Qwen agent';
    } catch (error) {
      console.error('Error processing message:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  /**
   * Send a response back to DingTalk
   */
  async sendResponseToDingTalk(content: string) {
    try {
      await this.dingtalkClient.sendText(content);
      console.log('Response sent to DingTalk successfully');
    } catch (error) {
      console.error('Error sending response to DingTalk:', error);
    }
  }

  /**
   * Handle incoming message from DingTalk
   */
  async handleMessageFromDingTalk(text: string): Promise<void> {
    console.log(`Received message from DingTalk: ${text}`);
    
    // Process the message with Qwen agent
    const response = await this.processMessage(text);
    
    // Send the response back to DingTalk
    await this.sendResponseToDingTalk(response);
  }

  /**
   * Start the connector (for webhook-based listening)
   */
  async start(): Promise<void> {
    console.log('DingTalk-Qwen connector started...');
    // In a real implementation, this would start an HTTP server to listen for webhooks
    // For now, we'll just log that it's running
  }
}