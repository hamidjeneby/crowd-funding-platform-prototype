# Supabase Connectivity & Storage Diagnostics (`tests/diagnostics/`)

This directory contains lightweight diagnostic scripts used to verify database connectivity, storage bucket access, and signed upload URL generation.

---

## Files in This Folder

| File | Purpose | How to Run | Expected Outcome |
| :--- | :--- | :--- | :--- |
| [`test-db.js`](./test-db.js) | Verifies database connectivity and read access on `public.project_docs` using `SUPABASE_SERVICE_ROLE_KEY`. | `node --env-file=.env.local tests/diagnostics/test-db.js` | Logs `Database connection OK. Sample row: [...]` with 0 or 1 rows. |
| [`test-service-upload.js`](./test-service-upload.js) | Verifies direct binary file upload to the `project_docs` Supabase Storage bucket using `SUPABASE_SERVICE_KEY`. | `node --env-file=.env.local tests/diagnostics/test-service-upload.js` | Logs `SERVICE KEY UPLOAD TEST — SUCCESS: { id: ..., path: ... }`. |
| [`test-upsert.js`](./test-upsert.js) | Tests `createSignedUploadUrl` with `{ upsert: true }` on the `project_docs` Storage bucket. | `node --env-file=.env.local tests/diagnostics/test-upsert.js` | Logs `Signed upload URL generation OK: { url: ..., token: ... }`. |
