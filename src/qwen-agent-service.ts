// Import the Qwen Code TypeScript SDK
import { query, type QueryOptions } from '@qwen-code/sdk';

export interface QwenAgentConfig {
  options?: Partial<QueryOptions>;   // Configuration options for the Qwen Code query
}

export interface QwenResponse {
  result: string;
  error?: string;
}

export class QwenAgentService {
  private config: QwenAgentConfig;

  constructor(config: QwenAgentConfig) {
    this.config = config;
  }

  /**
   * Send a request to the Qwen Code SDK
   */
  async sendRequest(prompt: string): Promise<QwenResponse> {
    try {
      // Create default query options, with path to qwen executable assumed to be in PATH
      const defaultOptions: QueryOptions = {
        pathToQwenExecutable: 'qwen', // Assume qwen is in PATH
      };

      // Merge default options with provided config
      const queryOptions: QueryOptions = {
        ...defaultOptions,
        ...this.config.options,
      };

      // Call the Qwen Code SDK to get a response
      const result = query({
        prompt: prompt,
        options: queryOptions
      });

      // Collect the response from the async iterator
      let fullResponse = '';

      for await (const message of result) {
        if (message && typeof message === 'object') {
          // Handle assistant messages
          if ('type' in message && message.type === 'assistant' && 'message' in message) {
            const msgContent = (message as any).message;
            if (typeof msgContent === 'string') {
              fullResponse += msgContent;
            } else if (msgContent && typeof msgContent === 'object' && 'content' in msgContent) {
              const content = (msgContent as any).content;
              fullResponse += typeof content === 'string' ? content : JSON.stringify(content);
            }
          }
          // Handle result messages
          else if ('type' in message && message.type === 'result' && 'result' in message) {
            const resultContent = (message as any).result;
            fullResponse += typeof resultContent === 'string' ? resultContent : JSON.stringify(resultContent);
          }
          // Handle content field directly (some SDK versions)
          else if ('content' in message) {
            const content = (message as any).content;
            fullResponse += typeof content === 'string' ? content : JSON.stringify(content);
          }
        }
      }

      // Clean up the response - remove thinking blocks and JSON artifacts
      let cleanedResponse = fullResponse.trim();
      
      // Remove thinking blocks (JSON arrays with thinking type)
      cleanedResponse = cleanedResponse.replace(/\[\{"type":"thinking"[^\]]*\}\]/g, '');
      
      // Remove any remaining JSON array artifacts at the start
      cleanedResponse = cleanedResponse.replace(/^\[\{[^\]]*\}\]/g, '');
      
      // Clean up multiple spaces and newlines
      cleanedResponse = cleanedResponse.replace(/\s+/g, ' ').trim();

      return {
        result: cleanedResponse || 'No response from Qwen agent'
      };
    } catch (error: any) {
      console.error('Error communicating with Qwen Code:', error.message);
      return {
        result: '',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Send a simple text prompt to Qwen Code
   */
  async sendPrompt(prompt: string): Promise<QwenResponse> {
    return this.sendRequest(prompt);
  }
}