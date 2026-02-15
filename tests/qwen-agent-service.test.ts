import { QwenAgentService } from '../src/qwen-agent-service';
import { query } from '@qwen-code/sdk';
import { jest } from '@jest/globals';

// Mock the Qwen Code SDK
jest.mock('@qwen-code/sdk', () => ({
  query: jest.fn(),
  isSDKAssistantMessage: jest.fn(),
  isSDKResultMessage: jest.fn(),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('QwenAgentService', () => {
  let service: QwenAgentService;

  beforeEach(() => {
    service = new QwenAgentService({ 
      options: { 
        cwd: '/test/path',
        model: 'qwen-test-model'
      } 
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a prompt to the Qwen Code SDK and return the response', async () => {
    // Create a mock async iterator for the query result
    const mockAsyncIterator = {
      [Symbol.asyncIterator]: () => {
        let count = 0;
        const messages = [
          {
            type: 'assistant',
            message: { role: 'assistant', content: 'This is the agent response' }
          }
        ];
        
        return {
          next: () => {
            if (count < messages.length) {
              return Promise.resolve({ value: messages[count++], done: false });
            } else {
              return Promise.resolve({ value: undefined, done: true });
            }
          }
        };
      }
    };

    mockedQuery.mockReturnValue(mockAsyncIterator as any);

    const prompt = 'Hello, Qwen!';
    const response = await service.sendPrompt(prompt);

    expect(mockedQuery).toHaveBeenCalledWith({
      prompt: prompt,
      options: {
        cwd: '/test/path',
        model: 'qwen-test-model'
      }
    });
    expect(response.result).toBe('This is the agent response');
  });

  it('should handle errors when the Qwen Code SDK throws', async () => {
    const errorMessage = 'Qwen Code error occurred';
    mockedQuery.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const prompt = 'Test prompt';
    const response = await service.sendPrompt(prompt);

    expect(response.result).toBe('');
    expect(response.error).toBe(errorMessage);
  });

  it('should handle result messages from the SDK', async () => {
    // Create a mock async iterator for the query result
    const mockAsyncIterator = {
      [Symbol.asyncIterator]: () => {
        let count = 0;
        const messages = [
          {
            type: 'result',
            result: 'Execution result: Success'
          }
        ];
        
        return {
          next: () => {
            if (count < messages.length) {
              return Promise.resolve({ value: messages[count++], done: false });
            } else {
              return Promise.resolve({ value: undefined, done: true });
            }
          }
        };
      }
    };

    mockedQuery.mockReturnValue(mockAsyncIterator as any);

    const prompt = 'Execute command';
    const response = await service.sendPrompt(prompt);

    expect(response.result).toBe('Execution result: Success');
  });
});