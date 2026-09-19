# 🚀 TalentOS — Autonomous Agentic Talent Operating System

TalentOS is an end-to-end agentic platform that ingests, verifies, evaluates, auto-grades, and roadmaps technical talent.

---

## 📁 Repository Structure

```
TalentOS/
├── server/                   # Node.js + Express Backend API (Port 5000)
│   ├── services/             # 6 Specialized Agent Engines
│   │   ├── agent1Service.js  # Ingestion & Authenticity Verifier
│   │   ├── agent2Service.js  # Event & Pitch Deck VLM Evaluator
│   │   ├── agent3Service.js  # Code Intelligence & AST Inspector
│   │   ├── agent4AlexService # Agent 4 AI Co-pilot ("Alex") Hints
│   │   ├── agent4GraderService # Agent 4 Sandboxed Test Auto-Grader
│   │   ├── agent5TwinService # Agent 5 Candidate Digital Twin
│   │   ├── agent5CopilotService # Agent 5 NL → Cypher Translator
│   │   └── agent6ReportingService # Agent 6 Cockpit & Roadmap Engine
│   ├── config/               # Database & LLM Connectors (Neo4j, Qdrant, Gemini)
│   ├── routes/               # REST Route Definitions
│   ├── test_all_agents.mjs   # Master Test Suite (83/83 Assertions)
│   └── server.js             # Express & Socket.io Webserver
│
├── client/                   # Vite + React Frontend Application (Port 3000)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ShadowSprintWorkspace.jsx # Agent 4 Monaco IDE & Alex Chat
│   │   │   ├── IngestionUploadCenter.jsx # Agents 1 & 2 Resume & Pitch Upload
│   │   │   ├── RecruiterCockpit.jsx      # Agent 6 Fraud Scorecard & Leaderboards
│   │   │   └── GuidanceRoadmap.jsx       # Agent 6 Career Progression Tree
│   │   ├── App.jsx           # Core Navigation & HUD Telemetry
│   │   └── App.css           # Glassmorphic Cyberpunk Theme Styling
│   └── package.json
└── README.md
```

---

## 🚀 How to Run TalentOS

```powershell
# 1. Start Backend API Server
cd TalentOS/server
$env:GEMINI_API_KEY="your-gemini-api-key"
npm start

# 2. Start Frontend UI
cd TalentOS/client
npm run dev
```
