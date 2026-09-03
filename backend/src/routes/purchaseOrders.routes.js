/**
 * Owner: Najmul — feature/purchasing
 * Status transitions are POST actions rather than a generic PATCH so that each
 * one can enforce its own rules and side effects.
 */
import { Router } from 'express';
import * as purchasing from '../services/purchasing.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  uuidParam,
  createPurchaseOrderSchema,
  purchaseOrderQuerySchema,
} from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  validate({ query: purchaseOrderQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await purchasing.listPurchaseOrders(req.query));
  }),
);

router.get(
  '/:id',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await purchasing.getPurchaseOrder(req.params.id) });
  }),
);

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate({ body: createPurchaseOrderSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await purchasing.createPurchaseOrder(req.body, req.user.id) });
  }),
);

// draft → ordered
router.post(
  '/:id/order',
  requireRole('admin', 'manager'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await purchasing.markOrdered(req.params.id) });
  }),
);

// ordered → received  (this is what adds stock)
router.post(
  '/:id/receive',
  requireRole('admin', 'manager', 'staff'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await purchasing.receivePurchaseOrder(req.params.id, req.user.id) });
  }),
);

router.post(
  '/:id/cancel',
  requireRole('admin', 'manager'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await purchasing.cancelPurchaseOrder(req.params.id) });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await purchasing.deletePurchaseOrder(req.params.id) });
  }),
);

export default router;
