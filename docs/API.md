# API reference

Base URL: `http://localhost:4000/api`

Every endpoint except `/health`, `/auth/register` and `/auth/login` requires:

```
Authorization: Bearer <token>
```

## Response shapes

```jsonc
// list endpoints
{ "data": [ … ], "pagination": { "page": 1, "limit": 20, "total": 16, "totalPages": 1 } }

// single record
{ "data": { … } }

// error
{ "error": { "message": "…", "details": [ { "field": "sku", "message": "…" } ] } }
```

| Status | Meaning |
|--------|---------|
| 200 / 201 | Success |
| 400 | Validation failed, or an illegal state transition |
| 401 | Missing or expired token |
| 403 | Signed in, but the role is not allowed |
| 404 | No such record |
| 409 | Unique constraint (duplicate SKU, email, supplier name) |

Role column below: **S** = staff, **M** = manager, **A** = admin.

---

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | none |

```bash
curl localhost:4000/api/health
# {"status":"ok","database":"up","time":"2026-09-03T07:37:48.309Z"}
```

---

