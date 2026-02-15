import express, { Request, Response } from 'express';
import { DingTalkQwenConnector, ConnectorConfig } from './connector';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class WebhookServer {
  private app: express.Application;
  private port: number;
  private connector: DingTalkQwenConnector;

  constructor(connector: DingTalkQwenConnector, port = 3000) {
    this.app = express();
    this.port = port;
    this.connector = connector;

    // Middleware to parse JSON bodies
    this.app.use(express.json({ verify: (req, res, buf) => {
      // Store raw body for signature verification if needed
      (req as any).rawBody = buf;
    }}));

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // DingTalk webhook endpoint
    this.app.post('/webhook/dingtalk', async (req: Request, res: Response) => {
      try {
        console.log('Received webhook request:', req.body);

        // Verify request if needed (signature verification would go here)
        
        // Extract the message text from DingTalk webhook payload
        const { text, msgtype } = req.body;
        
        if (!text || !text.content) {
          return res.status(400).json({ error: 'Invalid message format' });
        }

        // Process the message
        await this.connector.handleMessageFromDingTalk(text.content);

        // Respond to DingTalk
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`Webhook server listening on port ${this.port}`);
    });
  }
}