import { Router, Request, Response } from 'express';
import { WorkLensDB } from '../core/db';
import { SSEManager } from './sse';
import { loadWorkspaces, addWorkspace, removeWorkspace } from '../core/config';

export function createAPIRouter(db: WorkLensDB, sseManager: SSEManager): Router {
  const router = Router();

  // GET /api/events - Get paginated events
  router.get('/events', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;
    const workspace = req.query.workspace as string | undefined;

    const events = db.getEvents(limit, offset, type, workspace);
    res.json({ events, limit, offset });
  });

  // GET /api/stats - Get aggregated statistics
  router.get('/stats', (req: Request, res: Response) => {
    const workspace = req.query.workspace as string | undefined;
    const stats = db.getStats(workspace);
    res.json(stats);
  });

  // GET /api/timeline - Get hourly event counts
  router.get('/timeline', (req: Request, res: Response) => {
    const hours = parseInt(req.query.hours as string) || 24;
    const workspace = req.query.workspace as string | undefined;
    const timeline = db.getTimeline(hours, workspace);
    res.json(timeline);
  });

  // GET /api/heatmap - Get file change frequency map
  router.get('/heatmap', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const workspace = req.query.workspace as string | undefined;
    const heatmap = db.getHeatmap(limit, workspace);
    res.json(heatmap);
  });

  // GET /api/cycles - Get scan cycles
  router.get('/cycles', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const workspace = req.query.workspace as string | undefined;
    const cycles = db.getScanCycles(limit, workspace);
    res.json({ cycles, limit });
  });

  // GET /api/workspaces - List all workspaces
  router.get('/workspaces', (req: Request, res: Response) => {
    const workspaces = loadWorkspaces();
    res.json({ workspaces });
  });

  // POST /api/workspaces - Add a workspace
  router.post('/workspaces', (req: Request, res: Response) => {
    const { name, path } = req.body;

    if (!name || !path) {
      return res.status(400).json({ error: 'Name and path are required' });
    }

    try {
      addWorkspace(name, path);
      res.json({ success: true, workspace: { name, path, enabled: true } });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // DELETE /api/workspaces/:name - Remove a workspace
  router.delete('/workspaces/:name', (req: Request, res: Response) => {
    const { name } = req.params;
    const removed = removeWorkspace(name);

    if (removed) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Workspace not found' });
    }
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

  // --- v0.2 routes ---

  // GET /api/sessions - Auto-detected work sessions
  router.get('/sessions', (req: Request, res: Response) => {
    const workspace = req.query.workspace as string | undefined;
    const sessions = db.getSessions(workspace);
    res.json({ sessions });
  });

  // GET /api/codebase - Codebase tree from events
  router.get('/codebase', (req: Request, res: Response) => {
    const workspace = req.query.workspace as string | undefined;
    const tree = db.getCodebaseTree(workspace);
    res.json(tree);
  });

  // GET /api/activity/daily - Daily event counts
  router.get('/activity/daily', (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 90;
    const workspace = req.query.workspace as string | undefined;
    const activity = db.getDailyActivity(days, workspace);
    res.json({ activity });
  });

  // GET /api/activity/by-extension - Daily activity grouped by file extension
  router.get('/activity/by-extension', (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const workspace = req.query.workspace as string | undefined;
    const activity = db.getActivityByExtension(days, workspace);
    res.json({ activity });
  });

  // GET /api/cochanges - Files that change together
  router.get('/cochanges', (req: Request, res: Response) => {
    const workspace = req.query.workspace as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const cochanges = db.getCoChanges(workspace, limit);
    res.json({ cochanges });
  });

  return router;
}
