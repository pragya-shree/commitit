# CommitIt

An AI-powered codebase understanding platform that analyzes GitHub repositories and helps developers quickly understand project architecture, dependencies, and implementation details through intelligent search and natural language explanations.

---

## Features

- Clone and analyze any public GitHub repository
- Build a structured knowledge model of the codebase
- Parse source files to extract classes, functions, imports, and modules
- Generate dependency graphs
- Search code symbols and files
- Semantic repository queries
- Context generation for developer questions
- Deterministic explanation engine
- Optional Gemini AI integration with automatic fallback
- REST API built with FastAPI

---

## Tech Stack

### Backend

- Python
- FastAPI
- Pydantic
- GitPython

### AI

- Google Gemini API (optional)
- Deterministic explanation engine (offline fallback)

### Testing

- Pytest

---

## Project Structure

```text
backend/
│
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── services/
│   │   └── llm/
│   └── utils/
│
├── tests/
├── requirements.txt
├── run.py
└── README.md
```

---

## API Overview

### Repository

- Clone Repository
- Repository Health

### Analysis

- Scan Repository
- Parse Repository
- Dependency Graph
- Knowledge Model

### Query Engine

- List Classes
- List Functions
- List Imports
- List Files
- Symbol Search
- Relationship Search

### AI Features

- Context Builder
- Explanation Engine
- AI Explain Endpoint

---

## Installation

Clone the repository

```bash
git clone https://github.com/pragya-shree/commitit.git
cd commitit/backend
```

Create a virtual environment

```bash
python -m venv .venv
```

Activate it

Windows

```bash
.venv\Scripts\activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Create a `.env` file

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

The Gemini API key is optional. If it is not provided, CommitIt automatically falls back to its deterministic explanation engine.

---

## Run

```bash
python run.py
```

The API will be available at

```
http://localhost:8000
```

Interactive documentation

```
http://localhost:8000/docs
```

---

## Architecture

```
GitHub Repository
        │
        ▼
 Repository Clone
        │
        ▼
 Repository Scanner
        │
        ▼
 Source Parser
        │
        ▼
 Dependency Graph
        │
        ▼
 Knowledge Model
        │
        ▼
 Query Engine
        │
        ▼
 Context Builder
        │
        ▼
 Explanation Engine
        │
        ▼
 Optional Gemini AI
```

---

## Design Highlights

- Single-build repository analysis
- Cached in-memory knowledge model
- Read-only query layer
- Deterministic explanation pipeline
- Optional AI enhancement
- Automatic fallback when AI is unavailable
- No databases
- No Redis
- No Docker required

---

## Testing

Run all tests

```bash
pytest
```

---

## Future Work

- Support additional LLM providers
- Repository visualization
- Interactive frontend
- Multi-repository analysis
- Conversation memory
- Code editing assistance

---

## License

This project is licensed under the MIT License.