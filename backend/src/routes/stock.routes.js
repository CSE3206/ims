/** Owner: Rukaiya — feature/inventory-reports */
import { Router } from 'express';
import * as stockService from '../services/stock.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { stockInOutSchema, stockAdjustSchema, movementQuerySchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

// GET /api/stock/movements?productId=&type=in&from=&to=
router.get(
  '/movements',
  validate({ query: movementQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await stockService.listMovements(req.query));
  }),
);

router.post(
  '/in',
  validate({ body: stockInOutSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await stockService.stockIn(req.body, req.user.id) });
  }),
);

router.post(
  '/out',
  validate({ body: stockInOutSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await stockService.stockOut(req.body, req.user.id) });
  }),
);

// Stock-take correction — trusted roles only, since it can create stock
// out of nothing.
router.post(
  '/adjust',
  requireRole('admin', 'manager'),
  validate({ body: stockAdjustSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await stockService.adjustStock(req.body, req.user.id) });
  }),
);

export default router;
