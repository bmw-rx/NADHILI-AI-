# NADHILI AI - Production Cloudflare Worker Deployment

NADHILI AI is a powerful AI chat application completely powered by Cloudflare Workers, Cloudflare D1 (SQLite), and Groq's `llama-3.3-70b-versatile` model.

## Quick Start (Deploy in 3 minutes)

### 1. Prerequisites
- Node.js 18+ installed
- A Cloudflare account and Cloudflare Wrangler CLI (`npm i -g wrangler`)
- A free Groq API key from [groq.com](https://console.groq.com)

### 2. Setup Cloudflare D1 Database
```bash
# Log in to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create nadhili-db
```
Copy the `database_id` output from the command and paste it into `wrangler.toml` under `database_id`.

### 3. Initialize the Database Schema
```bash
# Run schema against your remote D1 database
npx wrangler d1 execute nadhili-db --remote --file=./schema.sql

# (Optional) For local testing
npx wrangler d1 execute nadhili-db --local --file=./schema.sql
```

### 4. Configure Secrets
```bash
# Add your Groq API Key
npx wrangler secret put GROQ_API_KEY

# Add a secure JWT Secret
npx wrangler secret put JWT_SECRET
```

### 5. Deploy to Cloudflare Workers
```bash
npx wrangler deploy
```

Your NADHILI AI site is now live globally on Cloudflare's edge network!

## Features Included
- **Auth**: Sign up, Sign in, Guest mode, JWT with HMAC-SHA256, crypto password hashing.
- **Database**: Cloudflare D1 for full user profiles, conversation memory, and message histories.
- **AI Streaming**: Real-time SSE streaming from Groq `llama-3.3-70b-versatile`.
- **UI**: NADHILI dark theme (`#0a0a0a`, `#111111`, `#f5a623`), Markdown tables/code blocks, syntax highlighting, voice input, image vision support, and PDF/text export.
