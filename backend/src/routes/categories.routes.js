/** Owner: Evan — feature/auth-catalog */
import { Router } from 'express';
import * as categoryService from '../services/category.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uuidParam, categorySchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await categoryService.listCategories() });
  }),
);

router.get(
  '/:id',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await categoryService.getCategory(req.params.id) });
  }),
);

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate({ body: categorySchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await categoryService.createCategory(req.body) });
  }),
);

router.patch(
  '/:id',
  requireRole('admin', 'manager'),
  validate({ params: uuidParam, body: categorySchema.partial() }),
  asyncHandler(async (req, res) => {
    res.json({ data: await categoryService.updateCategory(req.params.id, req.body) });
  }),
);

router.delete(
  '/:id',
  requireRole('admin', 'manager'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await categoryService.deleteCategory(req.params.id) });
  }),
);

export default router;
