<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database Schema & Foreign Key Conventions

- **Integer Foreign Key Types**: All relational foreign key fields in Supabase tables referencing users or organizations (such as `auditors.user_id`, `investors.user_id`, `memberships.user_id`, etc.) are of type **`bigint`/`integer`** (referencing the internal table primary key `users.id` / `organizations.id`), **NOT** the Clerk string IDs (`"user_3KBAY..."` or `"org_3KBAY..."`).
- **Id Resolution Rule**: ALWAYS resolve the internal integer ID first by querying `users.id` (where `users.user_id = clerkUserId`) or `organizations.id` (where `organizations.org_id = clerkOrgId`) before querying, inserting, or updating relational foreign key rows in Supabase.
