/**
 * AI Career Coach Backend Entry Point
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StorageService } from './db/storage.js';
import { GitHubService } from './github/githubService.js';
import { JobDiscoveryService } from './jobs/jobDiscoveryService.js';
import { ResumeParserService } from './resume/resumeParser.js';
import { WebhookProcessor } from './webhooks/webhookHandler.js';
import { createApiRouter } from './routes/api.js';

import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS
app.use(cors({ origin: '*' }));

// Parse JSON with raw body capture for webhook HMAC signature verification
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Initialize Services
const storage = new StorageService();
const github = new GitHubService();
const jobDiscovery = new JobDiscoveryService();
const resumeParser = new ResumeParserService();
const webhookProcessor = new WebhookProcessor(storage, github);

// Preload sample jobs if storage is empty
if (storage.listJobs().length === 0) {
  const sampleJob = jobDiscovery.parsePastedJobDescription({
    title: 'Full Stack Engineer - Cloud & Web Platform',
    company: 'Acme Systems',
    location: 'Remote',
    url: 'https://careers.acme.example/jobs/full-stack-1',
    text: `About the Role:
We are seeking a Full Stack Engineer to build developer platforms and APIs.
Requirements:
- Strong experience with TypeScript and modern JavaScript.
- Proficiency with React for frontend component engineering.
- Deep understanding of Node.js and Express.js REST API architecture.
- Experience with PostgreSQL relational databases and database migrations.
- Familiarity with Docker containerization and CI/CD pipelines.
- Commitment to Unit Testing and engineering excellence.
Nice to have:
- Experience with Python, FastAPI, or GraphQL.`,
  });
  storage.saveJob(sampleJob);
}

// Mount API router
const apiRouter = createApiRouter(storage, github, jobDiscovery, resumeParser, webhookProcessor);
app.use('/api', apiRouter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-career-coach-backend',
  });
});

const server = app.listen(PORT, () => {
  console.log(`AI Career Coach Backend running on http://localhost:${PORT}`);
});

export { app, server };
