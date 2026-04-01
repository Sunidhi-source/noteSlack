# NoteSlack 🚀

A real-time collaborative workspace with Slack-style chat and live document editing.

**Stack:** Next.js 15 · Clerk · Supabase · TipTap · Zustand · TypeScript

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/workspace
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/workspace

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Supabase setup

- Run the SQL schema from the project guide in Supabase SQL Editor
- Enable Realtime for `messages` and `documents` tables

### 4. Clerk setup

- Create JWT Template named `supabase` (see project guide)
- Add Clerk webhook pointing to `https://your-domain.com/api/webhooks/clerk`
  - Events: `user.created`, `user.updated`

### 5. Run dev server

```bash
npm run dev
```

---

## Project Structure

```
NoteSlack/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Sign-in / Sign-up
│   ├── (dashboard)/        # Protected workspace pages
│   └── api/                # API routes
├── components/
│   ├── chat/               # ChatView with real-time messages
│   ├── editor/             # DocumentView with TipTap
│   ├── sidebar/            # Navigation, modals
│   ├── workspace/          # WorkspaceHome
│   └── ui/                 # Shared UI (Modal)
├── hooks/                  # useRealtime, usePresence, useWorkspace
├── lib/supabase/           # Supabase clients (browser + server)
├── store/                  # Zustand workspace store
└── types/                  # TypeScript interfaces
```

## Key Features

- ⚡ Real-time chat with typing indicators
- 📝 Rich text editor (TipTap) with formatting toolbar
- 👁️ Live presence cursors on documents
- 🔐 Clerk auth synced to Supabase via webhooks + JWT
- 🏠 Multiple workspaces with channels and documents
- 💾 Auto-saving documents with visual save status
