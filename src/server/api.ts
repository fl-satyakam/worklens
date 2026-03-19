import { Router, Request, Response } from 'express';
import { WorkLensDB } from '../core/db';
import { SSEManager } from './sse';

export function createAPIRouter(db: WorkLensDB, sseManager: SSEManager): Router {
  const router = Router();

  // GET /api/events - Get paginated events
  router.get('/events', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;

    const events = db.getEvents(limit, offset, type);
    res.json({ events, limit, offset });
  });

  // GET /api/stats - Get aggregated statistics
  router.get('/stats', (req: Request, res: Response) => {
    const stats = db.getStats();
    res.json(stats);
  });

  // GET /api/timeline - Get hourly event counts
  router.get('/timeline', (req: Request, res: Response) => {
    const hours = parseInt(req.query.hours as string) || 24;
    const timeline = db.getTimeline(hours);
    res.json(timeline);
  });

  // GET /api/heatmap - Get file change frequency map
  router.get('/heatmap', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const heatmap = db.getHeatmap(limit);
    res.json(heatmap);
  });

  // GET /api/stream - Server-Sent Events endpoint
  router.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.write('data: {"type":"connected"}\n\n');

    sseManager.addClient(res);
  });

  return router;
}
