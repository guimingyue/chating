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
        if ('type' in message && message.type === 'assistant' && 'message' in message) {
          if (typeof message.message === 'object' && message.message !== null && 'content' in message.message) {
            fullResponse += (message.message as any).content;
          } else if (typeof message.message === 'string') {
            fullResponse += message.message;
          }
        } else if ('type' in message && message.type === 'result' && 'result' in message) {
          fullResponse += (message as any).result;
        }
      }

      return {
        result: fullResponse.trim()
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