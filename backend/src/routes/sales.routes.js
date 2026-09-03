/** Owner: Rukaiya — feature/inventory-reports */
import { Router } from 'express';
import * as sales from '../services/sales.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uuidParam, createSalesOrderSchema, salesOrderQuerySchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  validate({ query: salesOrderQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await sales.listSalesOrders(req.query));
  }),
);

router.get(
  '/:id',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await sales.getSalesOrder(req.params.id) });
  }),
);

router.post(
  '/',
  validate({ body: createSalesOrderSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await sales.createSalesOrder(req.body, req.user.id) });
  }),
);

// draft → confirmed (availability checked)
router.post(
  '/:id/confirm',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await sales.confirmSalesOrder(req.params.id) });
  }),
);

// confirmed → fulfilled (this is what removes stock)
router.post(
  '/:id/fulfil',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await sales.fulfilSalesOrder(req.params.id, req.user.id) });
  }),
);

router.post(
  '/:id/cancel',
  requireRole('admin', 'manager'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await sales.cancelSalesOrder(req.params.id) });
  }),
);

export default router;
