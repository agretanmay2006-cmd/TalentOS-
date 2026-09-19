# 🚀 TalentOS — Autonomous Agentic Talent Operating System

An end-to-end, multi-agent AI talent operating system and distributed intelligence platform. TalentOS leverages 6 specialized agent engines powered by Google Gemini, Neo4j Graph Database, and Qdrant Vector Search to ingest candidate profiles, verify authenticity, inspect repository ASTs, conduct real-time AI-proctored IDE assessments, synthesize candidate digital twins, and generate fraud-resistant talent intelligence.

---

## 🌟 Architecture & System Overview

```
                                  ┌──────────────────────────────────────────────┐
                                  │           TALENTOS CLIENT (REACT 18)         │
                                  │  • Candidate Portal   • Recruiter Cockpit    │
                                  │  • ShadowSprint IDE   • Career Roadmap HUD   │
                                  └──────────────────────┬───────────────────────┘
                                                         │ REST / WebSockets
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │          TALENTOS BACKEND (EXPRESS)          │
                                  │       • Auth & RBAC   • Event Telemetry      │
                                  └──────────────────────┬───────────────────────┘
                                                         │
             ┌───────────────────┬───────────────────────┼───────────────────────┬───────────────────┐
             ▼                   ▼                       ▼                       ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ ┌─────────────────┐
    │     AGENT 1     │ │     AGENT 2     │     │     AGENT 3     │     │     AGENT 4     │ │   AGENT 5 & 6   │
    │   Ingestion &   │ │ Multimodal VLM  │     │ Code Intel &    │     │  ShadowSprint   │ │ Digital Twin,   │
    │  Authenticity   │ │  Pitch / Event  │     │  AST Inspector  │     │   IDE & Alex    │ │ NL Copilot, ATS │
    └────────┬────────┘ └────────┬────────┘     └────────┬────────┘     └────────┬────────┘ └────────┬────────┘
             │                   │                       │                       │                   │
             └───────────────────┴───────────────────────┼───────────────────────┴───────────────────┘
                                                         │
                                   ┌─────────────────────┴─────────────────────┐
                                   │           STORAGE & INTELLIGENCE          │
                                   │  • Neo4j Graph DB    • Qdrant Vector DB   │
                                   │  • Google Gemini LLM • Prisma SQLite      │
                                   └───────────────────────────────────────────┘
```

---

## 🤖 The 6-Agent Intelligence Ecosystem

| Agent | Module | Primary Capabilities |
| :--- | :--- | :--- |
| **Agent 1** | **Ingestion & Authenticity Verifier** | Multi-signal resume & profile parsing, identity fraud detection, automated credential verification, and confidence scoring. |
| **Agent 2** | **Event & Pitch Deck VLM Evaluator** | Multimodal Vision-Language Model analysis of hackathon pitches, slides, project demos, and presentation delivery metrics. |
| **Agent 3** | **Code Intelligence & AST Inspector** | Deep AST parsing of Git repositories, cyclomatic complexity auditing, anti-cheat signature inspection, and style consistency scoring. |
| **Agent 4** | **ShadowSprint & Alex AI Co-Pilot** | Sandboxed Monaco IDE live coding session with an adaptive AI proctor ("Alex"), real-time hint scaffolding, and automated unit-test grading. |
| **Agent 5** | **Candidate Digital Twin & Copilot** | Comprehensive knowledge graph modeling of candidate skills and natural language to Cypher / semantic vector search across candidate pools. |
| **Agent 6** | **Recruiter Cockpit & Roadmap Engine** | Multi-tenant fraud & collusion heatmaps, comparative talent leaderboards, and personalized step-by-step career progression roadmaps. |

---

## 📁 Repository Structure

```text
.
├── client/                      # Frontend SPA (React + Vite + Tailwind CSS + Monaco Editor)
│   ├── src/
│   │   ├── components/          # UI components (CandidatePortal, RecruiterCockpit, ShadowSprint Workspace)
│   │   ├── pages/               # Admin, Candidate, Recruiter, and Auth portal pages
│   │   ├── context/             # Auth & TalentOS state context
│   │   └── App.jsx              # Main client application shell & role-based routing
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Backend API Services & Agent Engines
│   ├── config/                  # Gemini LLM, Neo4j, & Qdrant database connectors
│   ├── routes/                  # Express REST route handlers (ATS, Auth, Copilot, Reporting, Twin)
│   ├── services/                # 6 Autonomous Agent implementation services & storage
│   ├── prisma/                  # Prisma schema & migrations
│   ├── test_all_agents.mjs      # Master Test Suite runner (83+ assertions)
│   ├── server.js                # Express & Socket.io entry point
│   └── package.json
│
├── .gitignore                   # Git exclusion rules
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### 📋 Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**, **yarn**, or **pnpm**
- **Neo4j** (Optional for local graph queries, Cloud/Aura supported)
- **Qdrant** (Optional for local vector embeddings, Cloud supported)
- **Google Gemini API Key**

---

### ⚙️ Setup & Installation

#### 1. Clone & Navigate

```bash
git clone https://github.com/agretanmay2006-cmd/TalentOS-.git
cd TalentOS-
```

#### 2. Backend Server Setup

```bash
# Navigate to the backend server directory
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=5000
NODE_ENV=development

# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Neo4j Graph Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# JWT & Authentication
JWT_SECRET=your_jwt_secret_key_here
```

Initialize Prisma database:

```bash
npx prisma generate
npx prisma db push
```

Start the backend server:

```bash
npm start
# or for development mode with hot reload
npm run dev
```

#### 3. Frontend Client Setup

```bash
# In a new terminal window, navigate to the client directory
cd client

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend will be accessible at: `http://localhost:5173` (or port configured in `vite.config.js`).

---

## 🧪 Running Test Suites

TalentOS includes extensive unit and end-to-end agent validation test suites.

```bash
# Run the Master Test Suite (All 6 Agents & Mock Assertions)
cd server
node test_all_agents.mjs

# Run Individual Agent Unit Tests
node test_agent1.mjs
node test_agent2.mjs
node test_agent3.mjs
node test_agent4.mjs
node test_agent5.mjs

# Run Live Integration & E2E Tests
node test_phase5_e2e.mjs
node test_live_db_integration.mjs
```

---

## 📡 API Endpoint Overview

### 🔐 Auth & Identity
- `POST /api/auth/register` — Register candidate or recruiter
- `POST /api/auth/login` — Authenticate and receive JWT session

### 📄 Ingestion & Pitch Evaluation (Agents 1 & 2)
- `POST /api/candidates/ingest` — Ingest resume/profile and compute authenticity score
- `POST /api/candidates/pitch` — Upload pitch deck / demo for multimodal VLM evaluation

### 💻 Code Intelligence & ShadowSprint (Agents 3 & 4)
- `POST /api/candidates/inspect-repo` — Trigger AST analysis & repository integrity check
- `POST /api/shadow-sprint/start` — Initialize sandboxed Monaco assessment session
- `POST /api/shadow-sprint/hint` — Request context-aware guidance from Alex AI Co-Pilot
- `POST /api/shadow-sprint/submit` — Execute sandboxed unit-tests & auto-grade candidate code

### 🔍 Digital Twin & Semantic Search (Agents 5 & 6)
- `POST /api/search/copilot` — Natural language query translation to Neo4j Cypher & Qdrant embeddings
- `GET /api/candidates/:id/twin` — Retrieve candidate graph digital twin
- `GET /api/recruiters/fraud-matrix` — Get collusion scorecards & fraud heatmaps
- `GET /api/candidates/:id/roadmap` — Generate personalized skill progression tree

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Monaco Editor (`@monaco-editor/react`), Lucide React Icons, Tailwind CSS
- **Backend API**: Node.js, Express.js, Socket.IO, JWT Auth, Multer
- **AI & Agents**: Google Gemini 2.0 / 1.5 Flash, Multimodal Vision Models, LangChain / Agent Chains
- **Databases**:
  - **Graph**: Neo4j (Cypher Graph Queries & Candidate Skill Graph)
  - **Vector**: Qdrant (Semantic Search & Candidate Embeddings)
  - **Relational**: SQLite / PostgreSQL via Prisma ORM
- **Automation & Integrations**: n8n Webhook workflows, Git AST parsers

---

## 🤝 Contributing & Git Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes:
   ```bash
   git commit -m "feat: add your descriptive commit message"
   ```
3. Push to your remote:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request for review.

---

## 📄 License

This project is licensed under the MIT License.
