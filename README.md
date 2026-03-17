# Project Management Dashboard

Local Kanban dashboard for a secondary monitor. State is controlled via Stream Deck buttons through Bitfocus Companion hitting local REST endpoints. UI reflects changes instantly via SSE — no manual refresh.

## Setup

```bash
npm install
npm run seed    # creates data/db.json with sample projects/tasks
npm run dev     # starts on http://localhost:3000
```

## API Reference

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | — | All projects, tasks, and current view filter |
| POST | `/api/projects/:id/status` | `{"status":"todo"\|"in-progress"\|"blocked"\|"done"}` | Update project status |
| POST | `/api/projects/:id/tasks/:taskId/timer` | `{"action":"start"\|"stop"}` | Start or stop a task timer |
| GET | `/api/events` | — | SSE stream; emits `update` event on any data change |
| POST | `/api/view` | `{"filter":"all"\|"todo"\|"in-progress"\|"blocked"\|"done"}` | Set visible columns |

All routes return `Access-Control-Allow-Origin: *`.

## Bitfocus Companion — HTTP Actions

Configure each Stream Deck button as an HTTP action with these settings:

### Project Status

| Button | URL | Method | Body |
|--------|-----|--------|------|
| proj-1 → To Do | `http://localhost:3000/api/projects/proj-1/status` | POST | `{"status":"todo"}` |
| proj-1 → In Progress | `http://localhost:3000/api/projects/proj-1/status` | POST | `{"status":"in-progress"}` |
| proj-1 → Blocked | `http://localhost:3000/api/projects/proj-1/status` | POST | `{"status":"blocked"}` |
| proj-1 → Done | `http://localhost:3000/api/projects/proj-1/status` | POST | `{"status":"done"}` |
| proj-2 → To Do | `http://localhost:3000/api/projects/proj-2/status` | POST | `{"status":"todo"}` |
| proj-2 → In Progress | `http://localhost:3000/api/projects/proj-2/status` | POST | `{"status":"in-progress"}` |
| proj-2 → Blocked | `http://localhost:3000/api/projects/proj-2/status` | POST | `{"status":"blocked"}` |
| proj-2 → Done | `http://localhost:3000/api/projects/proj-2/status` | POST | `{"status":"done"}` |
| proj-3 → To Do | `http://localhost:3000/api/projects/proj-3/status` | POST | `{"status":"todo"}` |
| proj-3 → In Progress | `http://localhost:3000/api/projects/proj-3/status` | POST | `{"status":"in-progress"}` |
| proj-3 → Blocked | `http://localhost:3000/api/projects/proj-3/status` | POST | `{"status":"blocked"}` |
| proj-3 → Done | `http://localhost:3000/api/projects/proj-3/status` | POST | `{"status":"done"}` |
| proj-4 → To Do | `http://localhost:3000/api/projects/proj-4/status` | POST | `{"status":"todo"}` |
| proj-4 → In Progress | `http://localhost:3000/api/projects/proj-4/status` | POST | `{"status":"in-progress"}` |
| proj-4 → Blocked | `http://localhost:3000/api/projects/proj-4/status` | POST | `{"status":"blocked"}` |
| proj-4 → Done | `http://localhost:3000/api/projects/proj-4/status` | POST | `{"status":"done"}` |

### Task Timers

| Button | URL | Method | Body |
|--------|-----|--------|------|
| task-1 Start | `http://localhost:3000/api/projects/proj-1/tasks/task-1/timer` | POST | `{"action":"start"}` |
| task-1 Stop | `http://localhost:3000/api/projects/proj-1/tasks/task-1/timer` | POST | `{"action":"stop"}` |
| task-2 Start | `http://localhost:3000/api/projects/proj-1/tasks/task-2/timer` | POST | `{"action":"start"}` |
| task-2 Stop | `http://localhost:3000/api/projects/proj-1/tasks/task-2/timer` | POST | `{"action":"stop"}` |
| task-3 Start | `http://localhost:3000/api/projects/proj-2/tasks/task-3/timer` | POST | `{"action":"start"}` |
| task-3 Stop | `http://localhost:3000/api/projects/proj-2/tasks/task-3/timer` | POST | `{"action":"stop"}` |
| task-4 Start | `http://localhost:3000/api/projects/proj-3/tasks/task-4/timer` | POST | `{"action":"start"}` |
| task-4 Stop | `http://localhost:3000/api/projects/proj-3/tasks/task-4/timer` | POST | `{"action":"stop"}` |
| task-5 Start | `http://localhost:3000/api/projects/proj-4/tasks/task-5/timer` | POST | `{"action":"start"}` |
| task-5 Stop | `http://localhost:3000/api/projects/proj-4/tasks/task-5/timer` | POST | `{"action":"stop"}` |

### View Filter

| Button | URL | Method | Body |
|--------|-----|--------|------|
| Show All | `http://localhost:3000/api/view` | POST | `{"filter":"all"}` |
| Show To Do | `http://localhost:3000/api/view` | POST | `{"filter":"todo"}` |
| Show In Progress | `http://localhost:3000/api/view` | POST | `{"filter":"in-progress"}` |
| Show Blocked | `http://localhost:3000/api/view` | POST | `{"filter":"blocked"}` |
| Show Done | `http://localhost:3000/api/view` | POST | `{"filter":"done"}` |

**Companion settings for all actions:**
- Method: `POST`
- Header: `Content-Type: application/json`

## Data

`data/db.json` is gitignored. Re-create it any time with `npm run seed`.
Projects and tasks use plain string IDs — edit `scripts/seed.ts` to customize.

## Architecture

- **SSE:** `GET /api/events` keeps a `ReadableStream` open per client. All mutation routes emit on a `globalThis` `EventEmitter`; the SSE route listens on it. Client re-fetches `/api/projects` on each event.
- **Concurrency:** `mutateDB()` chains writes through a `globalThis` promise mutex — concurrent Stream Deck presses serialize safely.
- **Timer display:** Stored as `totalSeconds` + `lastStarted` ISO timestamp. The `Timer` component computes live elapsed via `setInterval` — no server writes while running.
