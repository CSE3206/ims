/**
 * Express 4 does not catch rejected promises from async route handlers, so
 * every async handler is wrapped in this to forward errors to next().
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
