# GitHub Project Analyst

AI-powered repository analysis tool for understanding unfamiliar GitHub codebases through automated structure analysis, dependency mapping, technology detection, and AI-generated insights.

## Live Demo

Try the deployed application:
https://github-project-analyst.vercel.app/

**Frontend:**  
https://github-project-analyst.vercel.app

**Backend API:**  
https://github-project-analyst-api.onrender.com

Paste a public GitHub repository URL into the dashboard and start the analysis.

## Overview

**GitHub Project Analyst** takes a public GitHub repository URL and analyzes the codebase to produce a compact technical overview.

```text
GitHub Repository
       ↓
Repository Crawler
       ↓
File & Code Analysis
       ↓
Technology Detection
       ↓
Dependency Graph
       ↓
AI Analysis
       ↓
React Dashboard
```

The goal is to make it easier to understand a project's structure, technologies, architecture, dependencies, testing, and potential improvements from a single dashboard.

## Features

- Analyze public GitHub repositories from a URL
- Detect programming languages and common technologies
- Identify important files, configuration files, dependencies, tests, and entry points
- Count source files and lines of code
- Extract Python functions, classes, imports, and API endpoints
- Perform generic source analysis for multiple programming languages
- Build an internal source-file dependency graph
- Visualize dependencies interactively with React Flow
- Inspect individual files from the dependency graph
- Analyze dependency manifests such as `package.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, and others
- Generate concise AI-powered repository analysis
- Cover architecture, code quality, testing, and potential improvements
- Apply repository and graph size limits for predictable analysis

## AI Analysis

The AI analysis is generated from facts collected by the repository analyzer.

Each analysis contains:

1. Project Overview
2. Technology Stack
3. Project Structure
4. Architecture
5. Dependency Structure
6. Code Quality
7. Testing
8. Potential Improvements

The AI is instructed to use only supplied repository information and avoid inventing technologies, architecture, features, deployment details, or implementation details.

## Technology Stack

### Backend

- Python
- FastAPI
- GitPython
- OpenAI API
- Pydantic
- python-dotenv

### Frontend

- React
- Vite
- React Flow (`@xyflow/react`)
- CSS

### Deployment

- Render — backend API
- Vercel — frontend

## Supported Analysis

The analyzer currently recognizes source files from:

- Python
- JavaScript
- TypeScript
- Java
- Go
- Rust
- C
- C++
- C#
- PHP
- Ruby

Additional technologies can be detected from dependency manifests and repository configuration.

## Dependency Graph

The backend builds a graph of locally resolvable source-file dependencies.

Each graph node contains:

- File name and path
- Programming language
- Function count
- Class count
- Import count

Edges represent resolved import relationships between files.

The frontend renders the graph using React Flow and allows developers to select a file and inspect its analysis.

For large repositories, the graph is limited to 300 nodes before being sent to the frontend and AI analysis.

## Project Structure

```text
github-project-analyst/
├── backend/
│   ├── __init__.py
│   └── main.py
├── analyzer/
│   └── code_parser.py
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.*
├── tests/
├── .gitignore
└── README.md
```

### Backend

The FastAPI application handles repository cloning, metadata collection, source analysis, dependency graph generation, and AI analysis.

### Analyzer

The analyzer package contains source parsing and dependency-resolution logic.

### Frontend

The React application provides the repository input, analysis dashboard, AI analysis view, and interactive dependency graph.

## API

### `GET /`

Health check endpoint.

Example response:

```json
{
  "status": "online",
  "service": "GitHub Project Analyst"
}
```

### `POST /analyze`

Analyzes a GitHub repository.

Request:

```json
{
  "url": "https://github.com/olegicks/restaurant-service"
}
```

The endpoint performs a shallow clone, analyzes the repository, builds the dependency graph, and generates the AI analysis.

## Local Development

### Requirements

- Python 3.11+
- Node.js 18+
- Git
- OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/olegicks/github-project-analyst.git
cd github-project-analyst
```

### 2. Backend

Create and activate a virtual environment:

```bash
py -m venv .venv
source .venv/Scripts/activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Create `.env`:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6
```

Start the API:

```bash
uvicorn backend.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Production build:

```bash
npm run build
```

## Configuration

Frontend API URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Production:

```env
VITE_API_URL=https://github-project-analyst-api.onrender.com
```

AI model:

```env
OPENAI_MODEL=gpt-5.6
```

## Analysis Limits

The backend currently applies limits to keep analysis bounded:

| Limit                                     |        Value |
| ----------------------------------------- | -----------: |
| Maximum analyzed files                    |        5,000 |
| Maximum source file size for LOC counting |       512 KB |
| Maximum README sent to AI                 | 12,000 chars |
| Maximum dependency graph nodes            |          300 |

Large repositories may therefore be represented by a truncated analysis.

## Deployment

The application is split into a frontend and backend:

```text
                         ┌─────────────────────┐
                         │       Vercel        │
                         │   React Frontend    │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP API
                                    ↓
                         ┌─────────────────────┐
                         │       Render        │
                         │    FastAPI Backend  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         ↓                     ↓
                  GitHub Repository       OpenAI API
```

### Production

Frontend:

https://github-project-analyst.vercel.app

Backend:

https://github-project-analyst-api.onrender.com

## Security Considerations

The application accepts external GitHub repository URLs and clones repositories for analysis.

Basic safeguards include:

- GitHub URL validation
- Shallow repository cloning
- File-count limits
- File-size limits
- Limited README and dependency-manifest input
- Limited dependency graph size

Repository contents are sent to the configured OpenAI model during AI analysis. Do not analyze repositories containing content that should not be sent to the configured AI service.

## Roadmap

- More accurate AST-based analysis with Tree-sitter
- Deeper cross-language dependency resolution
- Embeddings and vector search
- Repository-aware RAG
- AI chat with repository context
- File and code references in AI responses
- More detailed architecture visualization
- Improved large-repository handling
- Additional language-specific analyzers
- More comprehensive automated tests

## Why This Project?

Understanding an unfamiliar repository often requires manually reading the README, exploring directories, checking dependencies, and tracing imports between files.

GitHub Project Analyst combines these steps into one workflow and presents the results through an interactive developer dashboard.

## License

This project is for educational and portfolio purposes.
