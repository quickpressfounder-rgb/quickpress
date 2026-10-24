# QuickPress Multi-Console Marketplace Platform

QuickPress is a hyper-local on-demand laundry and garment care marketplace connecting Customers, Laundromat Partners, and Delivery Captains.

## Technology Stack
- **Frontend Applications:** React 19 + TanStack Router / TanStack Start + Vite + Tailwind CSS
- **Admin Console:** TanStack Router + React + Vite + Tailwind CSS
- **Customer / Partner / Rider Web Apps:** TanStack Router + React + Vite + Tailwind CSS
- **Backend API:** Python 3.12 + FastAPI
- **Database:** Supabase PostgreSQL (JSONB + GIN Indexing)
- **Payments & Treasury:** Razorpay, Cashfree, UPI, and Fleet COD Float

## Core Engineering Principles
1. **Financial Precision:** All financial calculations, double-entry ledgers, and settlements must balance exactly without rounding loss.
2. **Real Data Integration:** Zero mock or fake seed data; all metrics must aggregate directly from live Supabase collections.
3. **Clean Code & Git History:** Maintain documentation integrity, run build verifications before pushing, and maintain linear git history.
4. **Automatic Git Push:** Always commit and push changes directly to GitHub `main` immediately after completing verified changes.
5. **Persistent Memory Maintenance:** Always log and update completed work in `Memory/WORK_HISTORY.md` after completing tasks, recording modified files, architectural decisions, and commit hashes so context is never lost across sessions.
