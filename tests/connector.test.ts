import { DingTalkQwenConnector } from '../src/connector';
import { DingTalkClient } from '../src/dingtalk-client';
import { QwenAgentService } from '../src/qwen-agent-service';
import { mock, MockProxy } from 'jest-mock-extended';

describe('DingTalkQwenConnector', () => {
  let connector: DingTalkQwenConnector;
  let mockDingTalkClient: MockProxy<DingTalkClient>;
  let mockQwenAgentService: MockProxy<QwenAgentService>;

  beforeEach(() => {
    mockDingTalkClient = mock<DingTalkClient>();
    mockQwenAgentService = mock<QwenAgentService>();
    
    // Since we can't easily mock the constructor, we'll test differently
    connector = new (DingTalkQwenConnector as any)(mockDingTalkClient, mockQwenAgentService);
  });

  it('should process a message and return a response', async () => {
    const inputText = 'Hello, Qwen!';
    const agentResponse = { result: 'Hello, user!' };
    
    mockQwenAgentService.sendPrompt.mockResolvedValue(agentResponse as any);

    const result = await (connector as any).processMessage(inputText);

    expect(result).toBe(agentResponse.result);
    expect(mockQwenAgentService.sendPrompt).toHaveBeenCalledWith(inputText);
  });

  it('should handle errors gracefully when processing messages', async () => {
    const inputText = 'Problematic input';
    
    mockQwenAgentService.sendPrompt.mockRejectedValue(new Error('Test error'));

    const result = await (connector as any).processMessage(inputText);

    expect(result).toContain('Sorry, I encountered an error');
  });
});