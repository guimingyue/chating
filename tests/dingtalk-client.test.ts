import { DingTalkClient } from '../src/dingtalk-client';
import axios from 'axios';
import { jest } from '@jest/globals';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DingTalkClient', () => {
  const webhookUrl = 'https://oapi.dingtalk.com/robot/send?access_token=test_token';
  const secret = 'test_secret';
  let client: DingTalkClient;

  beforeEach(() => {
    client = new DingTalkClient({ webhook: webhookUrl, secret });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a text message correctly', async () => {
    const mockResponse = { data: { errcode: 0, errmsg: 'ok' } };
    mockedAxios.post.mockResolvedValue(mockResponse);

    const content = 'Hello, DingTalk!';
    const response = await client.sendText(content);

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(response).toEqual(mockResponse);
  });

  it('should send a markdown message correctly', async () => {
    const mockResponse = { data: { errcode: 0, errmsg: 'ok' } };
    mockedAxios.post.mockResolvedValue(mockResponse);

    const title = 'Test Title';
    const text = 'Test markdown text';
    const response = await client.sendMarkdown(title, text);

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(response).toEqual(mockResponse);
  });

  it('should generate a signed URL when secret is provided', () => {
    // Testing private method by accessing it through any type
    const getSignedWebhookUrl = (client as any).getSignedWebhookUrl.bind(client);
    const signedUrl = getSignedWebhookUrl();

    expect(signedUrl).toContain('timestamp=');
    expect(signedUrl).toContain('sign=');
  });
});