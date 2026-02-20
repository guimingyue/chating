import { DingTalkStreamClient, DingTalkStreamConfig, DingTalkMessage } from './dingtalk-client';
import { QwenAgentService, QwenAgentConfig, SessionState } from './qwen-agent-service';
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

// Control commands
const CONTROL_COMMANDS = {
  // Workspace control
  CD: ['/cd', '/cwd', '/workspace', '/workdir', '切换目录', '切换工作目录'],
  PWD: ['/pwd', '/where', '当前目录', '工作目录'],
  // Status
  STATUS: ['/status', '/info', '/state', '状态', '当前状态'],
  // Model control
  MODEL: ['/model', '/llm', '/ai', '切换模型', '模型'],
  // Permission mode control
  MODE: ['/mode', '/permission', '/perm', '权限模式', '切换模式']
};

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
   * Check if message is a control command and handle it
   */
  async handleControlCommand(content: string, sessionKey: string): Promise<{ handled: boolean; response?: string }> {
    const trimmedContent = content.trim();

    // Check for /cd or /cwd command
    for (const cmd of CONTROL_COMMANDS.CD) {
      if (trimmedContent.toLowerCase().startsWith(cmd.toLowerCase())) {
        const path = trimmedContent.substring(cmd.length).trim();
        if (!path) {
          const currentCwd = this.qwenAgentService.getCwd(sessionKey);
          return { handled: true, response: `当前工作目录：${currentCwd}\n用法：${cmd} <路径>` };
        }
        const result = await this.qwenAgentService.setCwd(sessionKey, path);
        if (result.success) {
          return { handled: true, response: `工作目录已切换为：${path}` };
        } else {
          return { handled: true, response: `切换目录失败：${result.error}` };
        }
      }
    }

    // Check for /pwd command
    for (const cmd of CONTROL_COMMANDS.PWD) {
      if (trimmedContent.toLowerCase() === cmd.toLowerCase()) {
        const currentCwd = this.qwenAgentService.getCwd(sessionKey);
        return { handled: true, response: `当前工作目录：${currentCwd}` };
      }
    }

    // Check for /status command
    for (const cmd of CONTROL_COMMANDS.STATUS) {
      if (trimmedContent.toLowerCase() === cmd.toLowerCase() || trimmedContent.toLowerCase().startsWith(cmd.toLowerCase() + ' ')) {
        const state = this.qwenAgentService.getSessionState(sessionKey);
        return {
          handled: true,
          response: `当前会话状态:\n- 工作目录：${state.cwd}\n- 模型：${state.model}\n- 权限模式：${state.permissionMode}`
        };
      }
    }

    // Check for /model command
    for (const cmd of CONTROL_COMMANDS.MODEL) {
      if (trimmedContent.toLowerCase().startsWith(cmd.toLowerCase())) {
        const model = trimmedContent.substring(cmd.length).trim();
        if (!model) {
          const currentModel = this.qwenAgentService.getModel(sessionKey);
          return { handled: true, response: `当前模型：${currentModel}\n用法：${cmd} <模型名称>` };
        }
        const result = await this.qwenAgentService.setModel(sessionKey, model);
        if (result.success) {
          return { handled: true, response: `模型已切换为：${model}` };
        } else {
          return { handled: true, response: `切换模型失败：${result.error}` };
        }
      }
    }

    // Check for /mode command
    for (const cmd of CONTROL_COMMANDS.MODE) {
      if (trimmedContent.toLowerCase().startsWith(cmd.toLowerCase())) {
        const mode = trimmedContent.substring(cmd.length).trim();
        if (!mode) {
          const currentMode = this.qwenAgentService.getPermissionMode(sessionKey);
          return { handled: true, response: `当前权限模式：${currentMode}\n可用模式：default, plan, auto-edit, yolo\n用法：${cmd} <模式>` };
        }
        const validModes = ['default', 'plan', 'auto-edit', 'yolo'];
        if (!validModes.includes(mode.toLowerCase())) {
          return { handled: true, response: `无效的权限模式：${mode}\n可用模式：default, plan, auto-edit, yolo` };
        }
        const result = await this.qwenAgentService.setPermissionMode(sessionKey, mode.toLowerCase());
        if (result.success) {
          return { handled: true, response: `权限模式已切换为：${mode}` };
        } else {
          return { handled: true, response: `切换权限模式失败：${result.error}` };
        }
      }
    }

    return { handled: false };
  }

  /**
   * Process a message received from DingTalk and send it to Qwen agent
   */
  async processMessage(text: string, sessionKey: string): Promise<string> {
    try {
      // First check if it's a control command
      const controlResult = await this.handleControlCommand(text, sessionKey);
      if (controlResult.handled) {
        return controlResult.response || '';
      }

      // Get conversation history for this session
      const history = this.sessionPrompts.get(sessionKey) || [];

      // Build prompt with history
      const fullPrompt = this.buildPromptWithHistory(text, history);

      // Send the message to Qwen agent
      const agentResponse = await this.qwenAgentService.sendPrompt(fullPrompt, sessionKey);

      // Check if there was an error
      if (agentResponse.error) {
        console.error('Qwen agent error:', agentResponse.error);
        return `Sorry, I encountered an error: ${agentResponse.error}`;
      }

      // Update conversation history
      this.updateSessionHistory(sessionKey, text, agentResponse.result);

      // Return the agent's response, ensure it's a string
      const response = agentResponse.result;
      return typeof response === 'string' ? response : JSON.stringify(response);
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
    console.log(`[Connector] senderId: ${message.senderId}, senderStaffId: ${message.senderStaffId || 'not provided'}`);

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
      // Clear session state for new session
      this.qwenAgentService.clearSession(sessionKey);
      this.sessionPrompts.delete(sessionKey);
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
      // For personal chats, use senderStaffId which is the actual userId for API calls
      const userIds = conversationType === '1' ? [message.senderStaffId || message.senderId] : undefined;
      await this.dingtalkClient.sendTextMessage(
        message.conversationId,
        conversationType,
        content,
        userIds
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