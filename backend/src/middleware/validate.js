/**
 * Zod-based request validation. Pass the schemas you care about; the parsed
 * (and coerced) result replaces req.body / req.query / req.params.
 *
 *   router.post('/', validate({ body: createProductSchema }), handler);
 */
import { ApiError } from '../utils/ApiError.js';

export function validate(schemas) {
  return (req, _res, next) => {
    for (const key of ['body', 'query', 'params']) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.') || key,
          message: issue.message,
        }));
        return next(ApiError.badRequest(`Invalid request ${key}`, details));
      }
      // req.query is a getter in Express 5-style setups; define instead of assign.
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    return next();
  };
}
