# SkillForge AI

SkillForge AI is an adaptive programming education platform for Python. It provides real-time, privacy-preserving code execution, personalized feedback, and instructor analytics—all in the browser.


## Features
- Client-side Python execution using Pyodide (no student code sent to a server for execution)
- AST-based static analysis for instant, educational feedback on code structure and common errors
- Bayesian Knowledge Tracing (BKT) per-concept learner modeling, seeded by a placement quiz
- Bloom's Taxonomy-calibrated hints for adaptive scaffolding
- Progress persistence and role-based access (student/admin)
- Instructor dashboard with analytics, user management, and problem editing


## Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (for backend persistence)

### Setup
1. Install dependencies
   npm install
   
2. Configure the backend
   - Copy you details to src/backend/.env and set your database credentials.
   - Ensure PostgreSQL is running and a database named skillforge exists.

3. Start the backend
   cd src/backend
   node --loader ts-node/esm server.ts    

4. Start the frontend
   
   npm run dev
   
   The app will be available at (http://localhost:5173)

### Running Tests

npm test


## Development Commands


npm install                # Install dependencies
npm run dev                # Run frontend dev server (Vite)
cd src/backend && npx ts-node server.ts   # Run backend server (Express)
npm run build              # Build for production
npm run lint               # Lint with ESLint
npm test                   # Run all tests
npx vitest run src/tests/visualizers.test.ts # Run a specific test file
npx vitest                 # Run tests in watch mode


## Backend Setup

The backend requires PostgreSQL and environment variables in src/backend/.env:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skillforge
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=your-jwt-secret


## Architecture Overview

### Frontend (React + TypeScript + Vite)
- src/App.tsx: Main application with problem selection, code editor and progress tracking
- src/components/: UI components including CodeEditor.tsx (Monaco), visualizers (FactorialVisualizer, BubbleSortVisualizer, BinarySearchVisualizer), Login.tsx, ASTTestPanel.tsx
- src/hooks/useASTComparison.ts: React hook for AST comparison workflow

### Python Execution & Analysis
- src/workers/pythonWorker.js: Web Worker running Pyodide with embedded Python AST analyzer (anti-pattern detection: infinite loops, mutable defaults, print vs return, etc.) and AST comparator for structural comparison against golden references
- src/utils/pythonRunner.ts: TypeScript interface to the Python worker

### AST Comparison System (src/utils/ast/)
- types.ts: Type definitions for AST nodes, divergences, golden references
- comparator.ts: Orchestrator for comparing student code against references
- goldenReferences.ts: Problem-specific canonical solutions and flexibility rules
- astComparisonEngine.py: Full Python AST comparison implementation

### Problem Database
- src/utils/problemDatabase.ts: All problems with test cases, hints (Bloom levels), and optional visualizations
- src/models/Hint.ts: Hint type with scaffolding levels

### Backend (Express + PostgreSQL)
- src/backend/server.ts: Express server on port 4000
- src/backend/db.ts: PostgreSQL connection pool
- src/backend/routes/auth.ts: Registration and login (bcrypt + JWT)
- src/backend/routes/progress.ts: Save/load user progress
- src/backend/middleware/auth.ts: JWT authentication middleware
- src/backend/routes/admin.ts: Admin routes for user and problem management
- src/backend/routes/feedback.ts: Problem feedback
- src/backend/routes/problems.ts: Problem CRUD

### Key Data Flow
1. User writes Python code in Monaco editor
2. On "Run Code", code is sent to Pyodide worker
3. Worker runs AST analysis (detects anti-patterns), then executes code
4. Results compared against test cases from problemDatabase
5. Optionally, AST comparison runs against golden references for structural feedback
6. Progress auto-saves to backend via debounced API calls



## Conventions & Extensibility

### Problem Structure
Problems in problemDatabase.ts require:
- functionName for function-style problems (enables automatic test case execution)
- hints array with Bloom levels (remember, understand, apply, analyze) and scaffolding numbers
- Optional visualization key linking to visualizer components

### AST Golden References
When adding golden references in goldenReferences.ts:
- Include requiredNodes (e.g., ['FunctionDef', 'Return'])
- Set flexibility rules when multiple approaches are valid (e.g., allowLoopTypeChange: true)
- Provide alternatives array for problems with multiple valid solutions

### Test Files
- Tests are in src/tests/ using Vitest
- Visualizer step generators should be exported for testing



## Key Technologies
- React (frontend)
- TypeScript (frontend/backend)
- Pyodide (Python in browser)
- PostgreSQL (backend persistence)
- Express (backend API)
- Vitest (testing)


## Deployment
- For production, build the frontend with npm run build and deploy the backend as a Node.js service.
- Ensure environment variables are set for database and JWT secret.


## Acknowledgements
- Pyodide (https://pyodide.org/)
- Bloom's Taxonomy
- Bayesian Knowledge Tracing (Corbett & Anderson, 1995)

For more details, see the code comments and source files. This README combines all setup, architecture, and development conventions for SkillForge AI.
