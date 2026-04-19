# Rabit CLI 🐰

Rabit is your **AI Project Manager**. The philosophy is simple: **You are the Chief Architect**, and Rabit is your trusted employee who orchestrates and commands a team of specialist agents to execute your vision.

## How it Works (The Hierarchy)

1.  **You (The Architect)**: Define the project blueprint in `architecture.md` (or via interactive mode). You give the orders and define the strategy.
2.  **Rabit (The Manager)**: Receives your instructions, analyzes the architecture, and "commands" the other agents, ensuring each performs their part in the correct order.
3.  **Agents (The Employees)**: Rabit scales Coders, Reviewers, and Organizers to transform the blueprint into real, reviewed, and ready-to-use code.

## Prerequisites

- **Node.js**: >= 18.0.0
- **Ollama**: Running locally with models like `llama3` or `qwen`.
- **Claude CLI** (Optional): For maximum code quality.

## Installation and Usage

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Rabit:
   ```bash
   npm run dev
   ```

## Key Features

- **Architecture-First**: Code is generated following a rigorous blueprint, avoiding extra file hallucinations.
- **Interactive**: Intelligent dialogue when specifications are missing in the architecture.
- **Flexible Providers**: Support for Ollama (Fully Local) and Claude (CLI or API).
- **Automatic Review**: A reviewer agent audits the generated code before finalizing the process.

---

*Note: This project has been simplified to be a clean and modular AI engine.*
