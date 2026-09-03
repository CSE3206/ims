/** Owner: Evan — feature/auth-catalog. Admin-only user administration. */
import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uuidParam, updateUserSchema, registerSchema } from '../validators/schemas.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await authService.listUsers() });
  }),
);

router.post(
  '/',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { user } = await authService.register(req.body);
    res.status(201).json({ data: user });
  }),
);

router.patch(
  '/:id',
  validate({ params: uuidParam, body: updateUserSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await authService.updateUser(req.params.id, req.body) });
  }),
);

router.delete(
  '/:id',
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    // Deleting yourself would lock you out of the admin screen mid-session.
    if (req.params.id === req.user.id) {
      throw ApiError.badRequest('You cannot delete your own account');
    }
    res.json({ data: await authService.deleteUser(req.params.id) });
  }),
);

export default router;
