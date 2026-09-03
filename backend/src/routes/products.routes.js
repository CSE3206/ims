/** Owner: Evan — feature/auth-catalog */
import { Router } from 'express';
import * as productService from '../services/product.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  uuidParam,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

// GET /api/products?search=&categoryId=&lowStock=true&page=1&limit=20&sort=name
router.get(
  '/',
  validate({ query: productQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await productService.listProducts(req.query));
  }),
);

// GET /api/products/low-stock — declared before /:id so "low-stock" is not
// parsed as an id.
router.get(
  '/low-stock',
  asyncHandler(async (_req, res) => {
    res.json({ data: await productService.listLowStock() });
  }),
);

router.get(
  '/:id',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await productService.getProduct(req.params.id) });
  }),
);

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate({ body: createProductSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await productService.createProduct(req.body, req.user.id) });
  }),
);

router.patch(
  '/:id',
  requireRole('admin', 'manager'),
  validate({ params: uuidParam, body: updateProductSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await productService.updateProduct(req.params.id, req.body) });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await productService.deleteProduct(req.params.id) });
  }),
);

export default router;
