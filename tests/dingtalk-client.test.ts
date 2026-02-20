import { DingTalkStreamClient } from '../src/dingtalk-client';
import axios from 'axios';
import { DWClient } from 'dingtalk-stream';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('dingtalk-stream');
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedDWClient = DWClient as jest.MockedClass<typeof DWClient>;

describe('DingTalkStreamClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    debug: false,
    sessionTimeout: 1800000,
  };

  let client: DingTalkStreamClient;
  let mockDWClient: any;

  beforeEach(() => {
    mockDWClient = {
      registerCallbackListener: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      socketCallBackResponse: jest.fn(),
    };

    MockedDWClient.mockImplementation(() => mockDWClient);

    client = new DingTalkStreamClient(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct config', () => {
    expect(MockedDWClient).toHaveBeenCalledWith({
      clientId: mockConfig.clientId,
      clientSecret: mockConfig.clientSecret,
      debug: mockConfig.debug,
    });
  });

  it('should connect to DingTalk Stream', async () => {
    await client.connect();

    expect(mockDWClient.registerCallbackListener).toHaveBeenCalledWith(
      'robot',
      expect.any(Function)
    );
    expect(mockDWClient.connect).toHaveBeenCalled();
  });

  it('should handle incoming messages', async () => {
    const mockResponse = {
      messageId: 'test-message-id',
      data: {
        senderStaffId: 'user123',
        senderNick: 'Test User',
        conversationId: 'conv123',
        msgtype: 'text',
        text: { content: 'Hello' },
        conversationType: '1',
      },
    };

    const mockHandler = jest.fn();
    (client as any).messageHandlers = [mockHandler];

    // Get the callback registered
    const callback = (mockDWClient.registerCallbackListener as jest.Mock).mock.calls[0][1] as (response: any) => Promise<void>;
    await callback(mockResponse);

    expect(mockDWClient.socketCallBackResponse).toHaveBeenCalledWith(
      'test-message-id',
      { success: true }
    );
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should deduplicate messages', async () => {
    const mockResponse = {
      messageId: 'duplicate-message-id',
      data: {
        senderStaffId: 'user123',
        senderNick: 'Test User',
        conversationId: 'conv123',
        msgtype: 'text',
        text: { content: 'Hello' },
        conversationType: '1',
      },
    };

    const mockHandler = jest.fn();
    (client as any).messageHandlers = [mockHandler];

    const callback = (mockDWClient.registerCallbackListener as jest.Mock).mock.calls[0][1] as (response: any) => Promise<void>;

    // First call should process
    await callback(mockResponse);
    expect(mockHandler).toHaveBeenCalledTimes(1);

    // Second call should be ignored (duplicate)
    await callback(mockResponse);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should get session key for user', () => {
    const { sessionKey, isNew } = client.getSessionKey('user123');

    expect(sessionKey).toContain('user123');
    expect(isNew).toBe(false);
  });

  it('should create new session when forced', () => {
    const { sessionKey, isNew } = client.getSessionKey('user123', true);

    expect(sessionKey).toContain('user123');
    expect(isNew).toBe(true);
  });

  it('should get access token', async () => {
    const mockToken = 'test-access-token';
    mockedAxios.post.mockResolvedValue({
      data: {
        accessToken: mockToken,
        expiresIn: 7200,
      },
    });

    const token = await client.getAccessToken();

    expect(token).toBe(mockToken);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.dingtalk.com/v1.0/oauth2/accessToken',
      expect.any(Object)
    );
  });

  it('should cache access token', async () => {
    const mockToken = 'test-access-token';
    mockedAxios.post.mockResolvedValue({
      data: {
        accessToken: mockToken,
        expiresIn: 7200,
      },
    });

    // First call
    await client.getAccessToken();
    // Second call (should use cache)
    await client.getAccessToken();

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('should send text message', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        messageId: 'msg123',
      },
    });

    (client as any).accessToken = 'cached-token';
    (client as any).accessTokenExpiry = Date.now() + 1000000;

    const result = await client.sendTextMessage('conv123', '1', 'Hello');

    expect(result.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.dingtalk.com/v1.0/robot/groupMessages/send',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should disconnect from DingTalk', async () => {
    await client.disconnect();

    expect(mockDWClient.close).toHaveBeenCalled();
  });
});