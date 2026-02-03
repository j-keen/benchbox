# BenchBox Project Instructions

## API KEY SECURITY - CRITICAL RULE

**NEVER hardcode API keys in source code files.** This includes:
- `client/src/utils/api.js`
- `client/api/*.js` (serverless functions)
- Any `.js`, `.jsx`, `.ts`, `.tsx` file

API keys MUST be stored in:
- **Client-side (Vite):** `client/.env.local` with `VITE_` prefix → access via `import.meta.env.VITE_GOOGLE_API_KEY`
- **Serverless functions:** Vercel environment variables → access via `process.env.GOOGLE_API_KEY`
- **NEVER commit `.env.local`** - it's gitignored

### History
- Google automatically revoked `AIzaSyBP72SA8upFcS5Buykjn5oSfvfWnvDosAw` after it was committed to GitHub
- All API keys (Gemini, YouTube, Supabase) must use environment variables

### Current Environment Variables
| Variable | Where Used | Purpose |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase public anon key |
| `VITE_GOOGLE_API_KEY` | Client | Google Gemini AI + YouTube Data API |
| `GOOGLE_API_KEY` | Serverless (Vercel) | Same key, server-side access |

## Tech Stack
- React 18 + Vite 5 + Tailwind CSS 3.4
- Supabase (direct client access, no backend server)
- Vercel serverless functions (api/ directory)
- Google Gemini 2.0 Flash for AI features
- YouTube Data API v3 for comments

## Project Structure
- `client/src/pages/` - Route pages (Home, ChannelDetail, BrowsePage, etc.)
- `client/src/components/` - Reusable components (VideoModal, FABMenu, etc.)
- `client/src/utils/api.js` - All API calls (Supabase, Gemini, YouTube)
- `client/src/lib/supabase.js` - Supabase client initialization
- `client/api/` - Vercel serverless functions

## Key Patterns
- Mobile-first responsive design (Tailwind sm:/md:/lg: breakpoints)
- Bottom-sheet modals on mobile (rounded-t-2xl pattern)
- Server-first with client fallback for AI/YouTube APIs
- Supabase queries wrapped in `withRetry()` for 503 resilience
- Primary color: sky-blue (#0ea5e9)
