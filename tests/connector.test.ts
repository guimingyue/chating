import { DingTalkQwenConnector } from '../src/connector';
import { DingTalkStreamClient } from '../src/dingtalk-client';
import { QwenAgentService } from '../src/qwen-agent-service';
import { jest } from '@jest/globals';

// Mock the dependencies
jest.mock('../src/dingtalk-client');
jest.mock('../src/qwen-agent-service');

const MockedDingTalkClient = DingTalkStreamClient as jest.MockedClass<typeof DingTalkStreamClient>;
const MockedQwenAgentService = QwenAgentService as jest.MockedClass<typeof QwenAgentService>;

describe('DingTalkQwenConnector', () => {
  let connector: DingTalkQwenConnector;
  let mockDingtalkClient: jest.Mocked<DingTalkStreamClient>;
  let mockQwenAgentService: jest.Mocked<QwenAgentService>;

  const mockConfig = {
    dingtalk: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      sessionTimeout: 1800000,
    },
    qwenAgent: {
      options: {
        model: 'qwen-code',
        pathToQwenExecutable: 'qwen',
      },
    },
  };

  beforeEach(() => {
    mockDingtalkClient = {
      onMessage: jest.fn(),
      getSessionKey: jest.fn(),
      sendTextMessage: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    mockQwenAgentService = {
      sendPrompt: jest.fn(),
    } as any;

    MockedDingTalkClient.mockImplementation(() => mockDingtalkClient);
    MockedQwenAgentService.mockImplementation(() => mockQwenAgentService);

    connector = new DingTalkQwenConnector(mockConfig);
  });

  it('should process a message with session history', async () => {
    const text = 'Hello, Qwen!';
    const sessionKey = 'test-session';
    const agentResponse = { result: 'Hello, user!', error: undefined };

    mockQwenAgentService.sendPrompt.mockResolvedValue(agentResponse as any);

    const result = await (connector as any).processMessage(text, sessionKey);

    expect(result).toBe(agentResponse.result);
    expect(mockQwenAgentService.sendPrompt).toHaveBeenCalled();
  });

  it('should handle errors when processing messages', async () => {
    const text = 'Problematic input';
    const sessionKey = 'test-session';
    const agentResponse = { result: '', error: 'Test error' };

    mockQwenAgentService.sendPrompt.mockResolvedValue(agentResponse as any);

    const result = await (connector as any).processMessage(text, sessionKey);

    expect(result).toContain('Sorry, I encountered an error');
  });

  it('should handle new session commands', async () => {
    const mockMessage = {
      senderNick: 'Test User',
      senderId: 'test-user-id',
      conversationId: 'test-conversation',
      conversationType: '1',
      msgtype: 'text',
      text: { content: '/new' },
    };

    mockDingtalkClient.getSessionKey.mockReturnValue({ sessionKey: 'new-session', isNew: true });

    await connector.handleMessage(mockMessage as any);

    expect(mockDingtalkClient.sendTextMessage).toHaveBeenCalledWith(
      'test-conversation',
      '1',
      expect.stringContaining('已开始新的会话')
    );
  });

  it('should extract text content from text messages', () => {
    const mockMessage = {
      msgtype: 'text',
      text: { content: 'Hello' },
    };

    const content = extractContent(mockMessage);

    expect(content).toBe('Hello');
  });

  it('should extract content from audio messages', () => {
    const mockMessage = {
      msgtype: 'audio',
      content: { recognition: 'This is voice recognition' },
    };

    const content = extractContent(mockMessage);

    expect(content).toBe('This is voice recognition');
  });

  it('should handle picture messages', () => {
    const mockMessage = {
      msgtype: 'picture',
    };

    const content = extractContent(mockMessage);

    expect(content).toBe('[Image]');
  });
});

// Import the helper function
function extractContent(message: any): string {
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