# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SkillForge AI is an adaptive programming education platform. Users solve Python coding problems with real-time feedback powered by:
- In-browser Python execution (Pyodide web worker)
- AST-based code analysis comparing student code against golden references
- Bloom's Taxonomy-aligned hint system with progressive scaffolding
- User progress tracking with PostgreSQL backend

## Development Commands

```powershell
# Install dependencies
npm install

# Run frontend dev server (Vite, localhost:5173)
npm run dev

# Run backend server (Express, localhost:4000)
# From src/backend directory:
npx ts-node server.ts

# Build for production
npm run build

# Lint with ESLint
npm run lint

# Run all tests
npm run test

# Run a specific test file
npx vitest run src/tests/visualizers.test.ts

# Run tests in watch mode
npx vitest
```

## Backend Setup

The backend requires PostgreSQL and environment variables in `src/backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skillforge
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=your-jwt-secret
```

## Architecture

### Frontend (React + TypeScript + Vite)
- `src/App.tsx` - Main application with problem selection, code editor, and progress tracking
- `src/components/` - UI components including `CodeEditor.tsx` (Monaco), visualizers (`FactorialVisualizer`, `BubbleSortVisualizer`, `BinarySearchVisualizer`), `Login.tsx`, `ASTTestPanel.tsx`
- `src/hooks/useASTComparison.ts` - React hook for AST comparison workflow

### Python Execution & Analysis
- `src/workers/pythonWorker.js` - Web Worker running Pyodide with embedded:
  - Python AST analyzer (anti-pattern detection: infinite loops, mutable defaults, print vs return, etc.)
  - AST comparator for structural comparison against golden references
- `src/utils/pythonRunner.ts` - TypeScript interface to the Python worker

### AST Comparison System (`src/utils/ast/`)
- `types.ts` - Type definitions for AST nodes, divergences, golden references
- `comparator.ts` - Orchestrator for comparing student code against references
- `goldenReferences.ts` - Problem-specific canonical solutions and flexibility rules
- `astComparisonEngine.py` - Full Python AST comparison implementation

### Problem Database
- `src/utils/problemDatabase.ts` - All problems with test cases, hints (Bloom levels), and optional visualizations
- `src/models/Hint.ts` - Hint type with scaffolding levels

### Backend (Express + PostgreSQL)
- `src/backend/server.ts` - Express server on port 4000
- `src/backend/db.ts` - PostgreSQL connection pool
- `src/backend/routes/auth.ts` - Registration and login (bcrypt + JWT)
- `src/backend/routes/progress.ts` - Save/load user progress
- `src/backend/middleware/auth.ts` - JWT authentication middleware

### Key Data Flow
1. User writes Python code in Monaco editor
2. On "Run Code", code is sent to Pyodide worker
3. Worker runs AST analysis (detects anti-patterns), then executes code
4. Results compared against test cases from `problemDatabase`
5. Optionally, AST comparison runs against golden references for structural feedback
6. Progress auto-saves to backend via debounced API calls

## Conventions

### Problem Structure
Problems in `problemDatabase.ts` require:
- `functionName` for function-style problems (enables automatic test case execution)
- `hints` array with Bloom levels (`remember`, `understand`, `apply`, `analyze`) and scaffolding numbers
- Optional `visualization` key linking to visualizer components

### AST Golden References
When adding golden references in `goldenReferences.ts`:
- Include `requiredNodes` (e.g., `['FunctionDef', 'Return']`)
- Set `flexibility` rules when multiple approaches are valid (e.g., `allowLoopTypeChange: true`)
- Provide `alternatives` array for problems with multiple valid solutions

### Test Files
- Tests are in `src/tests/` using Vitest
- Visualizer step generators should be exported for testing
