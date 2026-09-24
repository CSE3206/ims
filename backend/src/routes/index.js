/**
 * Route table. Every feature router is mounted here — this file is SHARED, so
 * add your own line and leave the others alone to keep merges painless.
 */
import { Router } from 'express';
import { pingDatabase } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';


const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.json({ status: 'ok', database: (await pingDatabase()) ? 'up' : 'down', time: new Date() });
  }),
);

// Evan — feature/auth-catalog

// Najmul — feature/purchasing

// Rukaiya — feature/inventory-reports

export default router;
