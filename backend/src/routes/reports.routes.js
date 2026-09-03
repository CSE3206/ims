/**
 * Owner: Rukaiya — feature/inventory-reports
 * Every report accepts ?format=csv to download the same data as a spreadsheet.
 */
import { Router } from 'express';
import * as reports from '../services/report.service.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { reportQuerySchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

/** Sends `rows` as JSON, or as a CSV attachment when ?format=csv. */
function send(res, rows, filename, format) {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(reports.toCsv(rows));
  }
  return res.json({ data: rows });
}

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    res.json(await reports.getDashboard());
  }),
);

router.get(
  '/valuation',
  validate({ query: reportQuerySchema }),
  asyncHandler(async (req, res) => {
    send(res, await reports.getInventoryValuation(), 'inventory-valuation', req.query.format);
  }),
);

router.get(
  '/stock-flow',
  validate({ query: reportQuerySchema }),
  asyncHandler(async (req, res) => {
    send(res, await reports.getStockFlow(req.query), 'stock-flow', req.query.format);
  }),
);

router.get(
  '/top-products',
  validate({ query: reportQuerySchema }),
  asyncHandler(async (req, res) => {
    send(res, await reports.getTopProducts(), 'top-products', req.query.format);
  }),
);

export default router;
