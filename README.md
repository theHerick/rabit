<div align="center">

```
     ██████╗  █████╗ ██████╗ ██╗████████╗
     ██╔══██╗██╔══██║██╔══██║██║╚══██╔══╝
  ██████╔╝███████║██████╔╝██║   ██║
  ██╔══██╗██╔══██║██╔══██║██║   ██║
  ██║  ██║██║  ██║██████╔╝██║   ██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝
```

**AI Project Manager · Multi-Agent Code Generation · Architecture-First**

![Node](https://img.shields.io/badge/Node.js-%3E%3D18-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![Ollama](https://img.shields.io/badge/Ollama-local-black?logo=ollama)
![License](https://img.shields.io/badge/license-MIT-purple)

</div>

---

## What is Rabit?

Rabit is a CLI that turns your `architecture.md` into working, reviewed code — automatically.

You describe **what** to build. Rabit manages a team of AI agents that figure out **how**.

```
You (Architect) → Rabit (Manager) → Agents (Coders / Reviewer / Organizer)
```

No hallucinated files. No invented features. Just what you specified.

---

## How it Works

Rabit runs a 5-stage pipeline every time you build:

```
architecture.md
      │
      ▼
  Partitioner  ──→  splits files across 1-3 Coders
      │
      ▼
  Coders (parallel)  ──→  generate code from blueprint
      │
      ▼
  Reviewer  ──→  runs npm install, tsc, build, test
      │
    ┌─┴─┐
    │   │
    ▼   ▼
  Fix  Organize  ──→  auto-fix errors or finalize structure
```

---

## Providers

Rabit supports multiple AI backends. Switch anytime from the settings menu.

| Provider | How | Requires |
|----------|-----|----------|
| **Ollama** | Fully local | Ollama running locally |
| **Claude CLI** | Local binary | `claude` CLI installed |

**Default agents (Ollama):**

| Agent | Model |
|-------|-------|
| Architect | llama3.1:8b |
| Coder / Senior | deepseek-coder-v2 |
| Junior / Design | qwen3.5 |
| Reviewer | qwen2.5-coder:7b |
| Organizer | qwen3.5 |

**Claude CLI preset** available in settings — one click to switch all agents to `claude-sonnet` / `claude-haiku`.

---

## Installation

**Requirements:** Node.js >= 18, Ollama (or Claude CLI / Anthropic API key)

```bash
git clone https://github.com/theHerick/rabit.git
cd rabit
npm install
```

**Run in dev mode:**
```bash
npm run dev
```

**Install globally** (use `rabit` from anywhere):
```bash
npm run install-rabit
# or manually:
npm run build && sudo npm link
```

---

## Usage

```
rabit
```

**Interactive session commands:**

| Command | Description |
|---------|-------------|
| `/new` | Create a new project (generates `architecture.md` template) |
| `/open` | Open and build an existing project |
| `/list` | List all created projects |
| `/adddoc` | Add reference documents for coding context |
| `/brain` | View the vector memory map |
| `/voices` | Show agent identities |
| `/reset` | Wipe vector memory |
| `/help` | Show all commands |

---

## Project Structure

```
rabit/
├── src/
│   ├── agents/        # Partitioner, Coder, Reviewer, Organizer
│   ├── providers/     # Ollama, Claude CLI, Anthropic API
│   ├── core/          # Pipeline, session loop, executor
│   ├── config/        # Agent bindings & defaults
│   ├── db/            # Vector memory (JSONL + cosine similarity)
│   ├── terminal/      # CLI menus, display, agent voices
│   └── tools/         # Prompt adaptation, project CRUD, utilities
└── cli.ts             # Entry point
```

---

## Key Features

- **Architecture-First** — agents only build what's in your blueprint, nothing more
- **Parallel Coders** — distribute work across 1, 2, or 3 coders simultaneously
- **Auto-Review** — TypeScript compile + build + test run automatically
- **Auto-Fix** — if tests fail, a Fix Organizer patches the issues and re-validates
- **Provider Agnostic** — same pipeline, any model (local or cloud)
- **Preset System** — save and load agent configurations
- **Vector Memory** — `/brain` builds a semantic knowledge map of your projects

---

## Roadmap

- [ ] Web UI dashboard
- [ ] GitHub Actions integration
- [ ] Custom agent scripting
- [ ] Project templates library

---

<div align="center">

Made by [Herick B. Tiburski](https://github.com/theHerick)

</div>
