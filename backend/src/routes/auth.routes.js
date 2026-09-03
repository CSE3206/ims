/** Owner: Evan — feature/auth-catalog */
import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';

const router = Router();

// POST /api/auth/register — open so the first admin can bootstrap the system.
router.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),
);

// POST /api/auth/login
router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    res.json(await authService.login(req.body));
  }),
);

// GET /api/auth/me — who is this token?
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await authService.getById(req.user.id) });
  }),
);

export default router;
