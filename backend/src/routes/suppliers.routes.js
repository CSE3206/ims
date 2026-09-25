/** Owner: Najmul — feature/purchasing */
import { Router } from 'express';
import * as supplierService from '../services/supplier.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uuidParam, supplierSchema, updateSupplierSchema, supplierQuerySchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  validate({ query: supplierQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await supplierService.listSuppliers(req.query));
  }),
);

router.get(
  '/:id',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await supplierService.getSupplier(req.params.id) });
  }),
);

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate({ body: supplierSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await supplierService.createSupplier(req.body) });
  }),
);

router.patch(
  '/:id',
  requireRole('admin', 'manager'),
  validate({ params: uuidParam, body: updateSupplierSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await supplierService.updateSupplier(req.params.id, req.body) });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await supplierService.deleteSupplier(req.params.id) });
  }),
);

export default router;
