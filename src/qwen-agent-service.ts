// Import the Qwen Code TypeScript SDK
import { query, type QueryOptions, type Query } from '@qwen-code/sdk';

export interface QwenAgentConfig {
  options?: Partial<QueryOptions>;   // Configuration options for the Qwen Code query
}

export interface QwenResponse {
  result: string;
  error?: string;
}

export interface SessionState {
  cwd: string;
  model: string;
  permissionMode: string;
  queryInstance: Query | null;
}

export class QwenAgentService {
  private config: QwenAgentConfig;
  private sessionStates: Map<string, SessionState> = new Map();

  constructor(config: QwenAgentConfig) {
    this.config = config;
  }

  /**
   * Get or create session state for a given session key
   */
  private getOrCreateSessionState(sessionKey: string): SessionState {
    if (!this.sessionStates.has(sessionKey)) {
      // Initialize with default values from config
      const initialState: SessionState = {
        cwd: this.config.options?.cwd || process.cwd(),
        model: this.config.options?.model || 'qwen-code',
        permissionMode: this.config.options?.permissionMode || 'default',
        queryInstance: null
      };
      this.sessionStates.set(sessionKey, initialState);
    }
    return this.sessionStates.get(sessionKey)!;
  }

  /**
   * Get current session state
   */
  getSessionState(sessionKey: string): SessionState {
    return this.getOrCreateSessionState(sessionKey);
  }

  /**
   * Change working directory for a session
   */
  async setCwd(sessionKey: string, cwd: string): Promise<{ success: boolean; error?: string }> {
    try {
      const state = this.getOrCreateSessionState(sessionKey);
      state.cwd = cwd;
      // Close existing query instance if any, to force recreation with new cwd
      if (state.queryInstance) {
        await state.queryInstance.close();
        state.queryInstance = null;
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current working directory
   */
  getCwd(sessionKey: string): string {
    return this.getOrCreateSessionState(sessionKey).cwd;
  }

  /**
   * Change model for a session
   */
  async setModel(sessionKey: string, model: string): Promise<{ success: boolean; error?: string }> {
    try {
      const state = this.getOrCreateSessionState(sessionKey);
      state.model = model;
      if (state.queryInstance) {
        await state.queryInstance.setModel(model);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current model
   */
  getModel(sessionKey: string): string {
    return this.getOrCreateSessionState(sessionKey).model;
  }

  /**
   * Change permission mode for a session
   */
  async setPermissionMode(sessionKey: string, mode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const state = this.getOrCreateSessionState(sessionKey);
      state.permissionMode = mode;
      if (state.queryInstance) {
        await state.queryInstance.setPermissionMode(mode);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current permission mode
   */
  getPermissionMode(sessionKey: string): string {
    return this.getOrCreateSessionState(sessionKey).permissionMode;
  }

  /**
   * Clear session state
   */
  clearSession(sessionKey: string): void {
    this.sessionStates.delete(sessionKey);
  }

  /**
   * Send a request to the Qwen Code SDK
   */
  async sendRequest(prompt: string, sessionKey?: string): Promise<QwenResponse> {
    try {
      // Get session state (creates default if not exists)
      const sessionState = sessionKey ? this.getOrCreateSessionState(sessionKey) : null;

      // Create default query options, with path to qwen executable assumed to be in PATH
      const defaultOptions: QueryOptions = {
        pathToQwenExecutable: 'qwen', // Assume qwen is in PATH
        cwd: sessionState?.cwd || process.cwd(),
        model: sessionState?.model || 'qwen-code',
        permissionMode: sessionState?.permissionMode as 'default' | 'plan' | 'auto-edit' | 'yolo' || 'default',
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

      // Store query instance for session state if session key provided
      if (sessionKey && sessionState) {
        sessionState.queryInstance = result;
      }

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
  async sendPrompt(prompt: string, sessionKey?: string): Promise<QwenResponse> {
    return this.sendRequest(prompt, sessionKey);
  }
}