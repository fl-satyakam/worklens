# 🔍 WorkLens

Developer-first file/folder watcher with a real-time dashboard. Drop `.worklens/` in any project and see every change as it happens.

Think `.git` meets `fswatch` meets a beautiful dashboard.

![License](https://img.shields.io/badge/license-MIT-green)

## Quick Start

```bash
# Clone and build
git clone https://github.com/fl-satyakam/worklens.git
cd worklens
npm install
npm run build

# Make it globally available
npm link

# Now use it in ANY project
cd ~/your-project
worklens init
worklens watch
```

Dashboard opens at **http://localhost:3377**

## What It Does

When you run `worklens watch`, it:
1. Watches every file change in your project (create, modify, delete)
2. Stores events in a local SQLite database (`.worklens/events.db`)
3. Serves a real-time dashboard with live updates via SSE
4. Prints colored events in your terminal

## Commands

| Command | Description |
|---------|-------------|
| `worklens init` | Initialize WorkLens in current directory (creates `.worklens/`) |
| `worklens watch` | Start watching files + serve dashboard |
| `worklens status` | Show watch statistics |
| `worklens log` | Show recent file events in terminal |
| `worklens log -n 50` | Show last 50 events |
| `worklens log -t modify` | Filter by event type |

## Dashboard

Dark mode, real-time, no BS.

- **Event Feed** — Live stream of file changes with type badges
- **Activity Timeline** — Hour-by-hour bar chart (last 24h)
- **File Heatmap** — Which files get touched the most
- **Stats Panel** — Total events, most active file, create/modify/delete counts

## Config

After `worklens init`, edit `.worklens/config.yml`:

```yaml
version: 1
watch:
  include:
    - '**/*'
  exclude:
    - node_modules/**
    - .git/**
    - dist/**
    - .worklens/**
    - '*.lock'
  debounceMs: 300
dashboard:
  port: 3377
  open: true  # auto-open browser
```

## Setup on Mac

```bash
# Prerequisites
brew install node  # Node.js 18+

# Install
git clone https://github.com/fl-satyakam/worklens.git
cd worklens

# Install dependencies (both CLI and dashboard)
npm install
cd dashboard && npm install && cd ..

# Build everything
npm run build

# Link globally
npm link

# Verify
worklens --version
```

### If `better-sqlite3` fails on Mac (Apple Silicon)

```bash
npm rebuild better-sqlite3
# or
npm install better-sqlite3 --build-from-source
```

## Tech Stack

- **CLI**: TypeScript, Commander.js, chokidar, better-sqlite3, chalk
- **Dashboard**: React 19, Vite, Tailwind CSS, recharts, lucide-react
- **Server**: Express (serves API + static dashboard)
- **Storage**: SQLite (local, zero config)

## Project Structure

```
.worklens/          # Created per-project (like .git)
├── config.yml      # Watch patterns and settings
├── events.db       # SQLite event database
└── .gitignore      # Auto-ignores events.db
```

## License

MIT
