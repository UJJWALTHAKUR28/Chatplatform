<div align="center">

# 🔥 Ember

**Real-time chat, built to feel instant.**

Live typing indicators, accurate presence, encrypted messages, and delivery
the moment you hit send — powered by Django Channels on the backend and
Next.js on the frontend.

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Django](https://img.shields.io/badge/Django_5-092E20?style=flat-square&logo=django&logoColor=white)
![Django Channels](https://img.shields.io/badge/Channels-ASGI-0C4B33?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**[🌐 Live Demo →](https://ember-chatplatforrm.vercel.app/)**

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Design Decisions](#design-decisions)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the repo](#1-clone-the-repo)
  - [2. Backend setup (Django)](#2-backend-setup-django)
  - [3. Frontend setup (Next.js)](#3-frontend-setup-nextjs)
  - [4. Run everything with Docker instead](#4-run-everything-with-docker-instead)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [REST endpoints](#rest-endpoints)
  - [WebSocket protocol](#websocket-protocol)
- [Security](#security)
- [Deployment](#deployment)
- [Useful Commands](#useful-commands)
- [License](#license)

---

## Overview

Ember is a full-stack, real-time 1‑on‑1 messaging app. The backend is a
**Django + Django Channels** API that serves both a REST interface (auth,
conversations, message history) and a WebSocket interface (live messages,
typing, presence). The frontend is a **Next.js (App Router)** single-page
experience that talks to both.

Messages are stored **AES-encrypted at rest**, auth is handled with
**short-lived JWTs + refresh rotation**, and the WebSocket layer is backed by
**Redis** so it can fan out across multiple workers in production (with an
automatic in-memory fallback for local dev).

### ⚡ Quick start

```bash
git clone https://github.com/UJJWALTHAKUR28/Chatplatform.git && cd Chatplatform

# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY, DATABASE_URL, MESSAGE_ENCRYPTION_KEY
python manage.py migrate
daphne -b 0.0.0.0 -p 8000 core.asgi:application

# Frontend (new terminal)
cd frontend && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws" > .env.local
npm run dev
```

Full walkthrough (Postgres/Redis setup, Docker option, every env var) below. 👇

## Features

- ⚡ **Instant delivery** — messages are pushed over a persistent WebSocket, no polling
- ✍️ **Live typing indicators** — per-conversation, auto-expiring via Redis TTL
- 🟢 **Accurate presence** — online/offline state driven by heartbeats + TTL, not just "last seen"
- 🔍 **User search** — find people by email or display name and start a DM in two taps
- 🔐 **JWT authentication** — access/refresh tokens with rotation and refresh-token blacklisting on logout
- 🛡️ **Encrypted messages at rest** — AES-128-CBC + HMAC (Fernet), transparent encrypt/decrypt at the ORM layer
- 🧵 **Soft-deleted messages** — deleted messages show "This message was deleted" instead of vanishing
- 📄 **Cursor-paginated history** — efficient infinite-scroll-friendly message loading
- 🌓 **Light/dark theme** — persisted per user
- 🔔 **Sound notifications** — toggleable
- 😀 **Emoji picker** built in
- 🩺 **Health check endpoint** for uptime monitors / Railway

## Tech Stack

### Frontend

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)

Next.js 16 (App Router) + React 19, written in TypeScript and styled with
Tailwind CSS v4. REST calls go through an Axios instance with an automatic
token-refresh interceptor; realtime updates use a native `WebSocket` client
with auto-reconnect and a heartbeat. Icons via **lucide-react**, emoji
support via **emoji-picker-react**, tokens stored via **js-cookie**.

### Backend

![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django_5-092E20?style=flat-square&logo=django&logoColor=white)
![Django REST Framework](https://img.shields.io/badge/DRF-A30000?style=flat-square)
![Django Channels](https://img.shields.io/badge/Channels_4-ASGI-0C4B33?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens&logoColor=white)

Django 5 + Django REST Framework for the API, Django Channels 4 (ASGI, served
by Daphne) for WebSockets. PostgreSQL is the primary datastore; Redis backs
the Channels layer plus presence/typing state (with an automatic in-memory
fallback for local dev). Auth is JWT via `simplejwt` with refresh rotation
and blacklisting. Message bodies are encrypted at rest with `cryptography`
(Fernet). CORS via `django-cors-headers`, static files via **WhiteNoise**,
config via `python-decouple`.

### Infra / Deployment

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

Multi-stage Docker build with a non-root runtime user, orchestrated locally
via **Docker Compose** (Redis + backend). Production start command lives in
a `Procfile` (Daphne, Railway-style). Suggested hosting: Railway/Render/Fly
for the backend + Postgres + Redis, Vercel for the Next.js frontend.

## Architecture

```mermaid
flowchart LR
    subgraph Client["Browser — Next.js App"]
        UI[React UI]
        Axios[Axios REST client]
        WS[WebSocket client]
    end

    subgraph Backend["Django Backend (ASGI / Daphne)"]
        DRF[DRF Views\n/api/v1/auth, /api/v1/chat]
        Consumer[ChatConsumer\n/ws/chat/:id]
        JWT[SimpleJWT]
    end

    PG[(PostgreSQL\nUsers · Conversations · Messages)]
    Redis[(Redis\nChannel layer · Presence · Typing TTL)]

    UI --> Axios --> DRF
    UI --> WS --> Consumer
    DRF --> JWT
    DRF --> PG
    Consumer --> PG
    Consumer <--> Redis
```

**Request flow, in words:**

1. **Auth** — the frontend calls `/api/v1/auth/login/` (or `/register/`), gets
   back a JWT access/refresh pair, and stores it. Axios attaches
   `Authorization: Bearer <access>` to every REST call and silently refreshes
   on a 401.
2. **REST** — conversation list, message history (cursor-paginated), user
   search, and profile updates all go through DRF views under `/api/v1/`.
3. **WebSocket** — once inside a conversation, the client opens
   `ws://.../ws/chat/<conversation_id>/?token=<access_token>`. The
   `ChatConsumer` authenticates the token, verifies the user is a
   participant, joins a per-conversation Channels group, and starts
   exchanging typed JSON frames (see [WebSocket protocol](#websocket-protocol)).
4. **Fan-out** — Redis acts as the Channels layer backend so a message sent
   to one Daphne worker reaches every other worker/subscriber in that
   conversation's group. It also backs presence (`PRESENCE_TTL`) and typing
   indicators (`TYPING_TTL`) as short-lived cache keys. If `REDIS_URL` is
   unset, everything still works on a single process via an in-memory
   fallback — just without cross-worker fan-out.
5. **Persistence** — messages are written to Postgres through a custom
   `EncryptedTextField` that encrypts on save and decrypts on read, so the
   database column always holds ciphertext while the app only ever sees
   plaintext.

## Design Decisions

A few choices in this codebase aren't the "default" option, so here's the
reasoning behind them — and what they cost.

**Django Channels over a separate Node/Socket.IO service.**
Presence, typing, and message delivery all need to touch the same
Postgres-backed permission model (is this user actually a participant in
this conversation?). Keeping that in Django means the WebSocket consumer can
reuse the same models, serializers, and auth as the REST API instead of
duplicating auth logic in a second service written in a second language. The
trade-off is that Channels is less battle-tested at scale than Socket.IO, and
running ASGI in production (Daphne) is one more moving part than plain WSGI.

**Redis for the channel layer, with an in-memory fallback.**
A single Daphne process can fan out messages to connected clients on its own,
but the moment there's more than one worker, "user A's message" and "user B's
socket" might live on different processes — Redis is what lets any worker
publish to a group and have every worker's sockets receive it. Presence and
typing state ride on the same Redis connection as short-lived TTL keys (a
"typing" flag that expires on its own is simpler than one that has to be
explicitly cleared). Locally, none of that cross-process fan-out matters, so
`REDIS_URL` is optional — Channels drops to `InMemoryChannelLayer`, and the
cache does the same, purely so a contributor can `git clone` and run the app
without installing Redis first.

**Encrypting message bodies at the ORM layer, not the database's.**
`EncryptedTextField` encrypts on save and decrypts on read so every other
part of the app — serializers, views, the consumer — can keep treating
`message.content` as a plain string. The alternative (Postgres-native
encryption, or encrypting/decrypting in every view) either needs
infrastructure most cheap Postgres hosts don't offer, or spreads
crypto-shaped bugs across the codebase. Fernet specifically was picked over
raw AES because it bundles authentication (HMAC) with encryption — a tampered
ciphertext fails to decrypt instead of silently returning garbage. The real
cost is key management: there's no built-in key rotation, so the `.env`
warns not to rotate `MESSAGE_ENCRYPTION_KEY` without re-encrypting existing
rows first (`encrypt_existing_messages` exists for exactly that migration
path).

**JWT with refresh rotation instead of session cookies.**
The frontend and backend are deployed on different domains (Vercel +
Railway/Render), which makes classic same-site session cookies awkward.
Short-lived (15 min) access tokens limit how long a leaked token is useful;
rotating refresh tokens with blacklist-on-rotation means a stolen refresh
token can be used once before it's invalidated, not indefinitely. The cost is
complexity on the frontend — `apiClient.ts` needs an interceptor that catches
401s, refreshes silently, and retries — rather than the browser handling
auth transparently.

**UUID primary keys everywhere.**
Sequential integer IDs leak information (how many users signed up, how many
messages exist) and make conversation/message IDs guessable in URLs and
WebSocket frames. UUIDs cost a little index/storage overhead versus a plain
`bigint`, which is an easy trade for a chat app where IDs are user-visible.

**Soft-deleting messages instead of hard-deleting them.**
A deleted message renders as "This message was deleted" rather than
disappearing, so the conversation doesn't visibly shift or leave a
confusing gap for the other participant mid-read. It also means delivery
receipts and pagination cursors that already reference that message ID
don't break.

**Cursor pagination for message history, not page numbers.**
Chat history is append-only and read backwards from "most recent," which is
exactly the case cursor pagination is good at (stable results even while new
messages are being inserted) and page-number pagination is bad at (page 2
shifts underneath you as new rows land at the top).

**What this repo deliberately doesn't do:** there's no message queue
(Celery/RQ) — the only background-ish work is presence TTL expiry, which
Redis handles natively — and there's no rate limiting on the WebSocket
consumer yet, which is the first thing to add before this goes in front of
untrusted traffic at scale.

## Project Structure

```
Chatplatform/
├── backend/                     # Django project
│   ├── core/                    # Project config
│   │   ├── settings.py          # Django/DRF/Channels/JWT/Redis config
│   │   ├── urls.py              # HTTP routes
│   │   └── asgi.py              # ASGI entrypoint (HTTP + WebSocket router)
│   ├── apps/
│   │   ├── accounts/            # Custom User model, register/login/me/search
│   │   ├── chat/                # Conversation, Message models + ChatConsumer (WS)
│   │   │   ├── models.py        # Conversation, ConversationParticipant, Message
│   │   │   ├── consumers.py     # WebSocket consumer (typing/presence/messages)
│   │   │   ├── encryption.py    # Fernet encrypt/decrypt helpers
│   │   │   ├── routing.py       # WebSocket URL patterns
│   │   │   └── management/commands/encrypt_existing_messages.py
│   │   └── common/               # Shared pagination + exception handling
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── Procfile                 # Production start command (Railway-style)
│   ├── entrypoint.sh            # Docker entrypoint: migrate → collectstatic → daphne
│   └── .env.example
│
├── frontend/                    # Next.js app (App Router)
│   ├── app/
│   │   ├── page.tsx              # Landing page (signed-out) / redirects to /chat (signed-in)
│   │   ├── login/ , signup/      # Auth pages
│   │   ├── profile/              # Profile settings
│   │   └── chat/
│   │       ├── page.tsx          # Conversation list
│   │       └── [conversationId]/ # Active thread
│   ├── components/
│   │   ├── chat/                 # ConversationList, MessageThread, MessageBubble, MessageInput
│   │   ├── layout/                # Navbar
│   │   └── ui/                    # Embermark, SignalMeter, ThemeToggle, SoundToggle
│   ├── context/                  # AuthContext, SocketContext, ThemeContext
│   ├── lib/
│   │   ├── apiClient.ts          # Axios instance + refresh-on-401 interceptor
│   │   ├── wsClient.ts            # WebSocket factory (reconnect + heartbeat)
│   │   ├── tokenStorage.ts        # Cookie-based token storage
│   │   └── avatarColors.ts, sound.ts
│   ├── types/                    # Shared TS types (User, Message, Conversation, WSFrame)
│   └── package.json
│
└── docker-compose.yml            # Redis + backend for local/dev orchestration
```

## Getting Started

### Prerequisites

- **Python** 3.12+
- **Node.js** 20+ and npm
- **PostgreSQL** 14+ (local install, or use Docker/Supabase/Railway)
- **Redis** 7+ (optional locally — falls back to in-memory if not configured)
- **Git**

### 1. Clone the repo

```bash
git clone https://github.com/UJJWALTHAKUR28/Chatplatform.git
cd Chatplatform
```

### 2. Backend setup (Django)

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` — at minimum set `SECRET_KEY`, `DATABASE_URL`, and
`MESSAGE_ENCRYPTION_KEY` (see [Environment Variables](#environment-variables)
below for the full list and how to generate each value).

```bash
# Make sure Postgres is running and the DB in DATABASE_URL exists, e.g.:
#   createdb chatdb   (or via psql: CREATE DATABASE chatdb;)

# Apply migrations
python manage.py migrate

# (Optional) create an admin user for /admin/
python manage.py createsuperuser

# Run the ASGI dev server (Channels needs ASGI, not `runserver`'s default WSGI-only mode —
# Daphne is used here so WebSockets work locally too)
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

The API is now live at `http://localhost:8000`, and WebSockets at
`ws://localhost:8000/ws/chat/<conversation_id>/`.

> No Redis configured? That's fine for local dev — Channels and the cache
> both fall back to in-memory backends automatically (single process only).

### 3. Frontend setup (Next.js)

In a second terminal:

```bash
cd frontend
npm install

# Configure environment variables
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
EOF

npm run dev
```

Open **http://localhost:3000** — you should see the Ember landing page.
Sign up, and you're in.

### 4. Run everything with Docker instead

`docker-compose.yml` at the repo root spins up **Redis + the backend**
together (the frontend is run separately with `npm run dev`, or containerize
it yourself if you prefer):

```bash
# From the repo root
cp backend/.env.example backend/.env   # fill in SECRET_KEY, DATABASE_URL, MESSAGE_ENCRYPTION_KEY

docker compose up --build
```

This builds the backend image (multi-stage, non-root user), starts Redis with
a healthcheck, and runs Daphne on `http://localhost:8000`. Note that
`DATABASE_URL` still needs to point at a reachable Postgres instance (local,
Docker, or a hosted one like Supabase/Railway) — Postgres itself isn't in
this compose file.

## Environment Variables

### Backend — `backend/.env`

```dotenv
# ── Django core ──────────────────────────────────────────────
SECRET_KEY=                        # REQUIRED — generate: python -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG=True                         # set False in production
ALLOWED_HOSTS=localhost,127.0.0.1  # comma-separated

# ── Database (PostgreSQL) ────────────────────────────────────
DATABASE_URL=postgres://chatuser:chatpass@localhost:5432/chatdb   # REQUIRED
DB_PERSISTENT_CONNECTIONS=False    # True = persistent connections (Railway-internal Postgres)
                                    # False = open/close per request (required for poolers like Supabase)

# ── Redis ─────────────────────────────────────────────────────
# Leave blank to fall back to InMemoryChannelLayer (single worker only, no cross-process fan-out)
REDIS_URL=redis://localhost:6379/0
# TLS (Upstash): REDIS_URL=rediss://:token@host:6379

# ── CORS ─────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:3000   # comma-separated list of allowed frontend origins

# ── Message encryption (Fernet — AES-128-CBC + HMAC-SHA256) ──
MESSAGE_ENCRYPTION_KEY=            # REQUIRED — generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# ⚠️  Never rotate this key without re-encrypting existing messages first.
```

### Frontend — `frontend/.env.local`

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1   # base URL for REST calls
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws          # base URL for the WebSocket connection
```

## API Reference

Base URL: `/api/v1/`

### REST endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register/` | Create an account, returns JWT pair |
| `POST` | `/auth/login/` | Authenticate, returns JWT pair |
| `POST` | `/auth/logout/` | Blacklist the refresh token |
| `GET` | `/auth/me/` | Current user profile |
| `PATCH` | `/auth/me/` | Update `display_name` |
| `GET` | `/auth/users/search/?q=` | Search users by email / display name |
| `POST` | `/token/refresh/` | Exchange refresh token for a new access token |
| `POST` | `/token/blacklist/` | Manually blacklist a refresh token |
| `GET` | `/chat/conversations/` | List the current user's conversations |
| `POST` | `/chat/conversations/` | Create (or fetch existing) 1‑on‑1 conversation |
| `GET` | `/chat/conversations/<uuid>/` | Conversation detail |
| `POST` | `/chat/conversations/<uuid>/read/` | Mark conversation as read |
| `GET` | `/chat/conversations/<uuid>/messages/` | Cursor-paginated message history |
| `GET` | `/health/` | Health check (no auth) |

All authenticated routes expect `Authorization: Bearer <access_token>`.

### WebSocket protocol

```
ws://localhost:8000/ws/chat/<conversation_id>/?token=<jwt_access_token>
```

**Client → Server**

| Frame | Payload | Effect |
|---|---|---|
| `message.send` | `{ "content": "Hello 👋" }` | Persists (encrypted) message, broadcasts `message.new` |
| `typing` | `{ "is_typing": true }` | Broadcasts typing state, no DB write |
| `mark_read` | `{}` | Updates `last_read_at` for this participant |
| `heartbeat` | `{}` | Refreshes the online-presence TTL |

**Server → Client**

| Frame | Payload |
|---|---|
| `connection_established` | `{ "conversation_id", "user_id" }` |
| `message.new` | `{ "message": { ...serialized Message } }` |
| `typing` | `{ "user_id", "display_name", "is_typing" }` |
| `presence` | `{ "user_id", "display_name", "is_online" }` |
| `error` | `{ "code", "message" }` |

The frontend's `wsClient.ts` wraps this with automatic reconnect
(exponential backoff, capped at 30s) and a 30s heartbeat interval.

## Security

- **Passwords** — hashed via Django's built-in password hasher; never stored or logged in plaintext.
- **Tokens** — short-lived access tokens (15 min) + rotating refresh tokens (7 days) with blacklist-on-rotation, so a stolen refresh token can't be replayed indefinitely.
- **Message encryption** — message bodies are Fernet-encrypted (AES-128-CBC + HMAC-SHA256) before hitting Postgres; the app layer only ever sees plaintext, so a raw DB dump doesn't leak conversation content.
- **IDs** — UUID primary keys everywhere (users, conversations, messages) so no sequential IDs are exposed in URLs or WebSocket frames.
- **CORS** — locked down to `CORS_ALLOWED_ORIGINS`, credentials allowed only for that origin.
- **Non-root container** — the production Docker image runs as an unprivileged `appuser`.

## Deployment

**Live:** the frontend is deployed on Vercel at
[ember-chatplatforrm.vercel.app](https://ember-chatplatforrm.vercel.app/).

The backend ships with everything needed for a Railway-style deploy:

- `Procfile` — runs migrations, collects static files, then starts Daphne on `$PORT`
- `Dockerfile` — multi-stage build, non-root runtime user, container `HEALTHCHECK` against `/health/`
- `entrypoint.sh` — same migrate → collectstatic → Daphne sequence, for plain Docker deploys

Typical production setup: **Railway/Render/Fly** for the backend + Postgres +
Redis, **Vercel** for the Next.js frontend, with `CORS_ALLOWED_ORIGINS` and
`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` pointed at each other's deployed
URLs (remember to switch `ws://`/`http://` to `wss://`/`https://` in production).

## Useful Commands

```bash
# Backend
python manage.py migrate                     # apply migrations
python manage.py createsuperuser              # create an admin user
python manage.py encrypt_existing_messages     # backfill-encrypt any legacy plaintext messages
python manage.py collectstatic --noinput       # for production static files

# Frontend
npm run dev      # local dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # eslint
```

## License

No license file is currently included in this repository — all rights
reserved by default until one is added. If you intend for this project to be
open source, consider adding a `LICENSE` file (MIT is a common choice for
projects like this).
