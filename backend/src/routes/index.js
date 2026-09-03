/**
 * Route table. Every feature router is mounted here — this file is SHARED, so
 * add your own line and leave the others alone to keep merges painless.
 */
import { Router } from 'express';
import { pingDatabase } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import categoriesRoutes from './categories.routes.js';
import productsRoutes from './products.routes.js';
import suppliersRoutes from './suppliers.routes.js';
import purchaseOrdersRoutes from './purchaseOrders.routes.js';
import stockRoutes from './stock.routes.js';
import salesRoutes from './sales.routes.js';
import reportsRoutes from './reports.routes.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.json({ status: 'ok', database: (await pingDatabase()) ? 'up' : 'down', time: new Date() });
  }),
);

// Evan — feature/auth-catalog
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);

// Najmul — feature/purchasing
router.use('/suppliers', suppliersRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);

// Rukaiya — feature/inventory-reports
router.use('/stock', stockRoutes);
router.use('/sales-orders', salesRoutes);
router.use('/reports', reportsRoutes);

export default router;
