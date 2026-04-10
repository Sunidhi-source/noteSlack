# NoteSlack 🚀

**A real-time collaboration platform — Notion + Slack in one app.**

Create workspaces, chat in channels, message teammates directly, and collaborate on documents with live cursors. Built with Next.js 16, Supabase, Clerk, and Tiptap.

---

## ✨ Features

### 💬 Chat

- Real-time messaging with Supabase Realtime
- Threaded replies (click the thread icon on any message)
- Emoji reactions (hover a message → 😄)
- Edit & delete your own messages
- Typing indicators ("Alice is typing…")
- Unread message badges per channel

### 📄 Documents

- Rich-text editor powered by Tiptap (Bold, Italic, Lists, Code, Headings, Quotes)
- **Live collaborative editing** via Y.js + Supabase CRDT sync
- **Live cursors** showing other editors' positions in real time
- Auto-save with debounced title updates
- Collaborator avatars in the toolbar

### 🏠 Workspaces

- Create multiple workspaces with custom name + emoji icon
- Workspace switcher dropdown
- Invite teammates by email (they must have an account)
- Role-based access: `owner`, `admin`, `member`

### 🔍 Search

- Global ⌘K search palette
- Searches messages, documents, and channels simultaneously
- Keyboard navigation

### 🔔 Notifications

- Live bell icon with unread badge
- Mark individual or all notifications as read
- Click to navigate to the relevant resource

### 💌 Direct Messages

- 1-on-1 messaging with any workspace member
- Real-time delivery via Supabase Realtime
- Conversation persisted per workspace

### 🔐 Auth

- Clerk authentication (sign up / sign in / social)
- JWT-secured Supabase queries (RLS enforced)
- User profile synced to Supabase via Clerk webhook

---

## 🛠 Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Framework | Next.js 16 (App Router)         |
| Auth      | Clerk                           |
| Database  | Supabase (PostgreSQL)           |
| Realtime  | Supabase Realtime               |
| CRDT sync | Y.js + y-supabase               |
| Editor    | Tiptap v3                       |
| State     | Zustand                         |
| Styling   | CSS Variables + Inline Styles   |
| Fonts     | Syne (display) + DM Sans (body) |

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Sunidhi-source/noteSlack
cd noteslack
npm install
```

### 2. Set up Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create an app
2. Copy your **Publishable Key** and **Secret Key**
3. In Clerk → Webhooks, create a webhook pointing to `https://your-domain.com/api/webhooks/clerk`
   - Enable events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret**

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. In **SQL Editor**, paste and run the full contents of `supabase/schema.sql`
3. Copy your **Project URL**, **anon key**, and **service_role key**
4. In Supabase → Auth → JWT Settings, add a Clerk JWT template:
   - Template name: `supabase`
   - Claims: `{ "sub": "{{user.id}}" }`
   - (Follow [Clerk's Supabase guide](https://clerk.com/docs/integrations/databases/supabase))

### 4. Configure environment

```bash
cp .env.example .env.local
# Fill in all values from steps 2 & 3
```

### 5. Run locally

```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Sign in / sign up pages (Clerk)
│   ├── (dashboard)/
│   │   └── workspace/
│   │       └── [workspaceId]/
│   │           ├── page.tsx           # Workspace home (activity feed)
│   │           ├── channel/[id]/      # Chat view
│   │           ├── docs/[id]/         # Document editor
│   │           └── dm/[userId]/       # Direct messages
│   └── api/
│       ├── workspaces/      # ✅ Workspace CRUD (POST creates workspace)
│       ├── workspace/
│       │   └── invite/      # Invite teammates
│       ├── channels/        # Channel creation
│       ├── documents/       # Document CRUD
│       ├── search/          # Global search
│       ├── notifications/   # Read/unread notifications
│       ├── dm/              # DM conversation management
│       └── webhooks/clerk/  # Clerk → Supabase user sync
│
├── components/
│   ├── chat/ChatView.tsx         # Full-featured channel chat
│   ├── editor/DocumentView.tsx   # Collaborative Tiptap editor
│   ├── sidebar/
│   │   ├── Sidebar.tsx           # Nav: channels, DMs, docs
│   │   ├── WorkspaceSwitcher.tsx # Switch between workspaces
│   │   ├── CreateWorkspaceModal.tsx
│   │   ├── CreateChannelModal.tsx
│   │   ├── CreateDocModal.tsx
│   │   └── InviteMemberModal.tsx
│   ├── ui/
│   │   ├── SearchModal.tsx       # ⌘K global search
│   │   └── NotificationBell.tsx  # Live notification bell
│   └── workspace/WorkspaceHome.tsx # Activity feed + quick actions
│
├── hooks/
│   ├── useWorkspace.ts      # Fetch workspace data + live subscriptions
│   ├── useRealtime.ts       # useMessages, useTypingIndicator, useThreadMessages
│   ├── usePresence.ts       # Live cursors for documents
│   ├── useReactions.ts      # Emoji reaction toggle
│   ├── useSearch.ts         # Debounced global search
│   └── useDmMessages.ts     # DM realtime messages
│
├── store/workspace.ts       # Zustand: channels, docs, members, notifs, unread
├── types/index.ts           # Full TypeScript types
└── lib/
    ├── utils.ts             # getInitials, generateUserColor, formatRelativeTime
    └── supabase/
        ├── client.ts        # Clerk-authenticated Supabase client
        └── server.ts        # Server-side Supabase client (service role)

supabase/
└── schema.sql               # Full DB schema: tables, RLS, triggers, indexes
```

---

## 🐛 Bug Fixes in This Version

| Bug                                                       | Fix                                                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Workspace creation silently failed                        | `CreateWorkspaceModal` was calling `/api/workspace` (singular) but the route is `/api/workspaces` (plural). Fixed the fetch URL. |
| No error feedback on workspace creation                   | Added error state + UI error message display                                                                                     |
| Slug collision crashes insert                             | Added slug uniqueness check with timestamp fallback                                                                              |
| Webhook handler missing `user.deleted`                    | Added delete handler to clean up Supabase users table                                                                            |
| `useWorkspaceStore` missing `members` and `notifications` | Expanded store with all required state slices                                                                                    |
| Members not fetched in `useWorkspace`                     | Added members + notifications fetch with live subscriptions                                                                      |

---

## 🚢 Deployment

### Vercel (recommended)

```bash
npm run build  # verify no TypeScript errors first
vercel deploy
```

Add all env vars to your Vercel project settings. Update your Clerk webhook URL to your production domain.

### Supabase Realtime

Ensure the tables `messages`, `reactions`, `notifications`, `dm_messages`, and `channel_read_state` are added to the `supabase_realtime` publication (the schema.sql does this automatically).

---

## 📋 Supabase Checklist

- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Enable Row Level Security on all tables ✅ (done in schema)
- [ ] Add JWT template for Clerk in Supabase Auth settings
- [ ] Enable Realtime for `messages`, `reactions`, `notifications`, `dm_messages`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in server env (not exposed to client)
