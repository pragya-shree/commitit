# CommitIt — Backend (Milestone 8: Explanation Engine)

CommitIt is an AI-powered platform that helps developers understand any
codebase by analyzing repositories, explaining architecture, and answering
questions about the code.

This milestone adds a **deterministic Explanation Engine**: it converts
Context Builder output into structured, human-readable text — a
repository overview, an architecture overview, and per-file/class/
function/dependency explanations. Like every analysis milestone so far,
it's template-based string formatting over already-assembled data, with
no LLM or external AI service involved. This is the abstraction layer a
future milestone can swap an LLM into without changing how callers use it.

---

## Project Overview

- **Framework:** FastAPI (Python 3.12)
- **Server:** Uvicorn
- **Configuration:** Pydantic Settings, loaded from a `.env` file
- **Logging:** Python's built-in `logging` module
- **API versioning:** all endpoints live under `/api/v1`

---

## Folder Structure

```text
backend/
│
├── app/
│   ├── api/
│   │   └── routes.py        # API v1 routes (/health, /clone, /scan, /parse, /dependencies, /knowledge, /query/*, /search, /context, /explanation)
│   │
│   ├── core/
│   │   ├── config.py        # Pydantic Settings configuration
│   │   └── logging.py       # Centralized logging setup
│   │
│   ├── models/
│   │   ├── repository.py     # Request/response models for cloning and scanning
│   │   ├── parser.py         # Request/response models for Python code parsing
│   │   ├── graph.py          # Request/response models for the dependency graph
│   │   ├── knowledge.py      # The unified Knowledge Model + its response wrapper
│   │   ├── query.py          # Request/response models for the query engine
│   │   ├── context.py        # Request/response models for the AI Context Builder
│   │   └── explanation.py    # Request/response models for the Explanation Engine
│   │
│   ├── services/
│   │   ├── git_service.py        # URL validation, cloning, metadata collection
│   │   ├── repository_store.py   # In-memory repository_id -> local_path (+ metadata) registry
│   │   ├── scanner_service.py    # Folder tree, language detection, largest files
│   │   ├── parser_service.py     # AST-based Python parsing (imports, classes, functions)
│   │   ├── graph_service.py      # Deterministic dependency graph (imports/inherits/calls)
│   │   ├── knowledge_service.py  # Builds, caches, and serves the unified Knowledge Model
│   │   ├── query_service.py      # Read-only lookups over an already-built Knowledge Model
│   │   ├── context_service.py    # Deterministic keyword-based context assembly for LLMs
│   │   └── explanation_service.py # Deterministic, template-based human-readable explanations
│   │
│   ├── utils/                 # Reserved for future shared utilities
│   │
│   ├── __init__.py
│   └── main.py               # FastAPI app instance, middleware, error handling
│
├── tests/
│   ├── test_main.py           # Basic endpoint tests
│   ├── test_repository.py     # Repository ingestion tests
│   ├── test_scanner.py        # Repository scanning tests
│   ├── test_parser.py         # Python code parser tests
│   ├── test_graph.py          # Dependency graph tests
│   ├── test_knowledge.py      # Knowledge Model tests
│   ├── test_query.py          # Query engine tests
│   ├── test_context.py        # AI Context Builder tests
│   └── test_explanation.py    # Explanation Engine tests
│
├── .env.example               # Example environment variables
├── .gitignore
├── requirements.txt
├── README.md
└── run.py                     # Entrypoint: `python run.py`
```

---

## Installation

### 1. Clone or copy the project

```bash
cd backend
```

### 2. Create a virtual environment

```bash
python3.12 -m venv venv
```

### 3. Activate the virtual environment

macOS / Linux:

```bash
source venv/bin/activate
```

Windows:

```bash
venv\Scripts\activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

This includes **GitPython**, used for cloning repositories in the
repository ingestion feature (Milestone 2). It requires the `git`
command-line tool to be installed on the system.

### 5. Configure environment variables

Copy the example file and adjust values if needed:

```bash
cp .env.example .env
```

---

## Running Locally

Start the server with:

```bash
python run.py
```

By default, the API will be available at:

```
http://localhost:8000
```

You can also run it directly with Uvicorn:

```bash
uvicorn app.main:app --reload
```

---

## API Documentation

FastAPI automatically generates interactive API docs:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI schema: `http://localhost:8000/openapi.json`

---

## Available Endpoints

| Method | Endpoint                          | Description                                  |
|--------|------------------------------------|-----------------------------------------------|
| GET    | `/`                                | Returns project name and version              |
| GET    | `/api/v1/health`                   | Returns service health status                 |
| POST   | `/api/v1/repository/clone`         | Clones a public GitHub repo and returns metadata |
| GET    | `/api/v1/repository/{repository_id}/scan` | Scans a previously cloned repository   |
| GET    | `/api/v1/repository/{repository_id}/parse` | Parses the Python source of a previously cloned repository |
| GET    | `/api/v1/repository/{repository_id}/dependencies` | Builds a deterministic dependency graph |
| GET    | `/api/v1/repository/{repository_id}/knowledge` | Returns the complete, unified Knowledge Model |
| GET    | `/api/v1/repository/{repository_id}/query/symbols` | Look up classes and functions by name |
| GET    | `/api/v1/repository/{repository_id}/query/classes` | Look up classes by name |
| GET    | `/api/v1/repository/{repository_id}/query/functions` | Look up functions/methods by name |
| GET    | `/api/v1/repository/{repository_id}/query/imports` | Look up import relationships by name |
| GET    | `/api/v1/repository/{repository_id}/query/files` | Look up files by path |
| GET    | `/api/v1/repository/{repository_id}/query/relationships` | Look up dependency edges for a symbol |
| GET    | `/api/v1/repository/{repository_id}/search` | Aggregate search across metadata, files, classes, functions, imports |
| POST   | `/api/v1/repository/{repository_id}/context` | Builds a deterministic AI context object for a natural-language question |
| POST   | `/api/v1/repository/{repository_id}/explanation` | Builds a deterministic, human-readable explanation for a natural-language question |

### `GET /`

```json
{
  "project": "CommitIt",
  "version": "0.1.0"
}
```

### `GET /api/v1/health`

```json
{
  "status": "healthy"
}
```

### `POST /api/v1/repository/clone`

Clones a public GitHub repository into a temporary workspace and returns
basic metadata gathered from the filesystem (no source code is parsed).
The local filesystem path is never returned to the client — instead, an
opaque `repository_id` is issued, which is used to reference the clone in
later requests (e.g. scanning).

**Request**

```json
{
  "github_url": "https://github.com/owner/repository"
}
```

**Response — success (200)**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "repository": {
    "owner": "owner",
    "name": "repository",
    "branch": "main",
    "files": 123,
    "directories": 18,
    "size": "4.2 MB"
  }
}
```

**Error responses**

| Status | Meaning                                         |
|--------|--------------------------------------------------|
| 400    | Empty, malformed, or non-GitHub URL              |
| 404    | Repository not found, private, or inaccessible   |
| 502    | Clone failed (network error, Git failure, etc.)  |

Failed clones automatically clean up their temporary directory — no
orphaned files are left behind.

### `GET /api/v1/repository/{repository_id}/scan`

Scans a repository that was already cloned via `/repository/clone`,
identified by the `repository_id` returned at clone time. The repository
is **not** cloned again — the scanner walks the existing local copy.

The scanner:

- builds a structured, hierarchical **project tree** (JSON, not plain text)
- counts total files and directories
- detects languages by file **extension only** (no parsing)
- returns the **10 largest files** by size
- skips common non-source directories: `.git`, `node_modules`, `venv`,
  `.venv`, `dist`, `build`, `target`, `coverage`, `__pycache__`, `.idea`,
  `.vscode`, plus hidden files/folders

**Response — success (200)**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "summary": {
    "total_files": 120,
    "total_directories": 15
  },
  "languages": {
    "Python": 42,
    "JavaScript": 18,
    "Markdown": 5
  },
  "largest_files": [
    { "path": "app/main.py", "extension": ".py", "size": 4820 }
  ],
  "tree": {
    "name": "repo",
    "type": "directory",
    "children": [
      {
        "name": "app",
        "type": "directory",
        "children": [
          { "name": "main.py", "type": "file", "children": null }
        ]
      },
      { "name": "README.md", "type": "file", "children": null }
    ]
  }
}
```

**Error responses**

| Status | Meaning                                                   |
|--------|-------------------------------------------------------------|
| 404    | Unknown `repository_id` (never cloned, or process restarted) |
| 410    | Repository was cloned but no longer exists on disk           |
| 500    | Filesystem error while scanning                              |

### `GET /api/v1/repository/{repository_id}/parse`

Parses every `.py` file in a repository that was already cloned, using
only Python's built-in `ast` module — no Tree-sitter, no AI, and no
natural-language output, just structured JSON. The repository is **not**
re-cloned or re-scanned; it reuses the same local path resolved via
`repository_id`.

For each file, it extracts:

- module-level docstring and imports
- classes: name, base classes, decorators, docstring, and methods
- functions/methods: name, arguments (with type annotations where
  present), return annotation, decorators, docstring

Files that fail to read or contain a syntax error are skipped and logged,
without failing the rest of the parse.

**Response — success (200)**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "summary": {
    "total_files": 83,
    "total_classes": 63,
    "total_functions": 855,
    "total_imports": 677
  },
  "modules": [
    {
      "path": "src/flask/cli.py",
      "docstring": null,
      "imports": ["__future__.annotations", "ast", "inspect"],
      "classes": [
        {
          "name": "NoAppException",
          "bases": ["click.UsageError"],
          "decorators": [],
          "docstring": "Raised if an application cannot be found or loaded.",
          "methods": []
        }
      ],
      "functions": [
        {
          "name": "find_best_app",
          "args": [{ "name": "module", "annotation": "ModuleType" }],
          "returns": "Flask",
          "decorators": [],
          "docstring": "Given a module instance this tries to find the best possible application..."
        }
      ]
    }
  ]
}
```

**Error responses**

| Status | Meaning                                                   |
|--------|-------------------------------------------------------------|
| 404    | Unknown `repository_id` (never cloned, or process restarted) |
| 410    | Repository was cloned but no longer exists on disk           |
| 500    | Filesystem error while parsing                                |

### `GET /api/v1/repository/{repository_id}/dependencies`

Builds a deterministic **dependency graph** for a previously cloned
repository, identified by `repository_id`. It reuses `parser_service`'s
output for module/class/function metadata (no repeat directory
traversal), and makes one additional pass over the same files to extract
best-effort function call expressions, which the parser's per-file
metadata doesn't capture. No AI, no guessing — every relationship comes
directly from the AST.

**Node format**

```json
{ "id": "class:app.user_service.UserService", "type": "class", "name": "UserService" }
```

`type` is one of `module`, `class`, or `function`. `id` is a stable,
human-readable string (not a random UUID) so the same definition always
produces the same node id across requests.

**Edge format**

```json
{ "source": "class:app.user_service.UserService", "target": "class:app.base.BaseService", "relationship": "inherits" }
```

`relationship` is one of `imports`, `inherits`, or `calls`.

**What's extracted**

- **imports** — edges from the importing module to each imported name
  (both internal project modules and external packages get a `module`
  node; external ones are simply nodes without a corresponding source file)
- **inherits** — edges from a class to each of its base classes, resolved
  to a matching class elsewhere in the repository when the name matches,
  otherwise recorded as a best-effort external node
- **calls** — edges from a function/method to whatever it calls, resolved
  the same way; because call resolution from AST alone is inherently
  best-effort (no type inference, no import resolution), calls to
  built-ins, methods on unknown objects, etc. show up as external nodes
  named after the raw call expression

**Response — success (200)**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "summary": {
    "total_nodes": 1944,
    "total_edges": 3665
  },
  "nodes": [
    { "id": "module:src.flask.cli", "type": "module", "name": "src.flask.cli" },
    { "id": "class:src.flask.cli.NoAppException", "type": "class", "name": "NoAppException" }
  ],
  "edges": [
    { "source": "module:src.flask.cli", "target": "module:ast", "relationship": "imports" },
    { "source": "class:src.flask.cli.NoAppException", "target": "class:click.UsageError", "relationship": "inherits" },
    { "source": "function:src.flask.cli.find_best_app", "target": "function:getattr", "relationship": "calls" }
  ]
}
```

**Error responses**

| Status | Meaning                                                   |
|--------|-------------------------------------------------------------|
| 404    | Unknown `repository_id` (never cloned, or process restarted) |
| 410    | Repository was cloned but no longer exists on disk           |
| 500    | Filesystem error while building the graph                     |

### `GET /api/v1/repository/{repository_id}/knowledge`

Returns the complete **Knowledge Model** for a repository: the single,
unified representation combining repository metadata, scan results,
parsed Python source, and the dependency graph.

The model is built **once** per repository (running the scanner, parser,
and graph builder exactly one time each) and cached in memory keyed by
`repository_id`. Later calls to `/knowledge`, `/scan`, `/parse`, or
`/dependencies` for the same repository all reuse the same cached model
instead of redoing the analysis — the individual endpoints' response
shapes are unchanged, they just source their data from the shared model
now. As before, no local filesystem path is ever included in the response.

**Knowledge Model schema**

```text
KnowledgeModel
├── repository_id: str
├── version: str
├── created_at: datetime (UTC)
├── repository: RepositoryMetadata        (owner, name, branch, files, directories, size)
├── scan_summary: ScanSummary              (total_files, total_directories)
├── languages: dict[str, int]
├── largest_files: list[LargestFile]
├── tree: TreeNode
├── parse_summary: ParseSummary            (total_files, total_classes, total_functions, total_imports)
├── modules: list[ParsedModule]
├── graph_summary: DependencyGraphSummary  (total_nodes, total_edges)
├── nodes: list[GraphNode]
└── edges: list[GraphEdge]
```

**Response — success (200)**

```json
{
  "success": true,
  "knowledge": {
    "repository_id": "cmt_e8bb06ce",
    "version": "1.0",
    "created_at": "2026-07-12T08:00:27.123456+00:00",
    "repository": {
      "owner": "pallets",
      "name": "flask",
      "branch": "main",
      "files": 236,
      "directories": 51,
      "size": "1.7 MB"
    },
    "scan_summary": { "total_files": 217, "total_directories": 45 },
    "languages": { "Python": 83, "Markdown": 12 },
    "largest_files": [{ "path": "src/flask/app.py", "extension": ".py", "size": 89234 }],
    "tree": { "name": "flask", "type": "directory", "children": [] },
    "parse_summary": {
      "total_files": 83,
      "total_classes": 63,
      "total_functions": 855,
      "total_imports": 677
    },
    "modules": [],
    "graph_summary": { "total_nodes": 1944, "total_edges": 3665 },
    "nodes": [],
    "edges": []
  }
}
```

(`modules`, `nodes`, `edges`, `tree.children`, and `largest_files` are
truncated above for readability — see the `/parse`, `/dependencies`, and
`/scan` docs for their full shapes.)

**Error responses**

| Status | Meaning                                                   |
|--------|-------------------------------------------------------------|
| 404    | Unknown `repository_id` (never cloned, or process restarted) |
| 410    | Repository was cloned but no longer exists on disk           |
| 500    | Filesystem error while building the model                     |

### Query Engine

The query endpoints are **read-only** and operate entirely on an
already-built Knowledge Model — they never scan, parse, or rebuild the
dependency graph. If no Knowledge Model has been built yet for a
`repository_id` (i.e. `/knowledge`, `/scan`, `/parse`, or `/dependencies`
hasn't been called for it), they return **404** rather than building one.
All filters are optional, case-insensitive substring matches.

| Endpoint | Filter param | Returns |
|---|---|---|
| `GET .../query/symbols` | `name` | classes + functions/methods combined |
| `GET .../query/classes` | `name` | classes, with bases, docstring, method names |
| `GET .../query/functions` | `name` | top-level functions and class methods, with args/returns |
| `GET .../query/imports` | `name` | (importing module, imported name) pairs |
| `GET .../query/files` | `name` | file paths from the cached project tree |
| `GET .../query/relationships` | `symbol` (required) | incoming/outgoing dependency edges for a resolved symbol |
| `GET .../search` | `q` (required) | aggregate results across repository metadata, files, classes, functions, imports |

**Example — `GET /query/classes?name=user`**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "count": 1,
  "results": [
    {
      "name": "UserService",
      "module": "app/user_service.py",
      "bases": ["BaseService"],
      "docstring": "Handles users.",
      "methods": ["greet", "helper"]
    }
  ]
}
```

**Example — `GET /query/relationships?symbol=UserService`**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "relationships": {
    "symbol": "UserService",
    "matched_node_ids": ["class:app.user_service.UserService"],
    "outgoing": [
      { "source": "class:app.user_service.UserService", "target": "class:app.base.BaseService", "relationship": "inherits" }
    ],
    "incoming": []
  }
}
```

`relationships` resolution prefers an exact (case-insensitive) name match;
if none exists, it falls back to a substring match, and every edge
touching any matched node is returned.

**Example — `GET /search?q=user`**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "search": {
    "query": "user",
    "repository_match": false,
    "files": [{ "path": "app/user_service.py" }],
    "classes": [{ "name": "UserService", "module": "app/user_service.py", "bases": ["BaseService"], "docstring": "Handles users.", "methods": ["greet", "helper"] }],
    "functions": [],
    "imports": []
  }
}
```

`repository_match` is `true` when the query matches the repository's
owner, name, or branch.

**Error responses (all query endpoints, including `/search`)**

| Status | Meaning                                                          |
|--------|--------------------------------------------------------------------|
| 404    | Unknown `repository_id`, **or** no Knowledge Model built yet for it |

### AI Context Builder

`POST /api/v1/repository/{repository_id}/context` builds a small,
deterministic, structured **context object** for a natural-language
question, entirely from the cached Knowledge Model via the Query Engine.
Like the query endpoints, it's read-only: no scanning, parsing, or graph
rebuilding, and it 404s (rather than building anything) if the Knowledge
Model isn't cached yet.

There's no AI or embedding model here — relevance is deterministic
keyword matching: the question is tokenized into lowercase
identifiers/words (stopwords and words of length ≤ 2 are dropped), then
each keyword is looked up via `query_service`'s existing lookups. Matches
are scored by how many keywords hit them, sorted highest-score first, and
capped to the top 10 per category (top 5 for relationship lookups) so the
result stays a bounded digest rather than a repository dump. The intent
is for a future milestone to hand this object straight to an LLM.

**Request**

```json
{ "question": "How does the UserService class handle authentication?" }
```

**Response — success (200)**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "context": {
    "question": "How does the UserService class handle authentication?",
    "keywords": ["userservice", "class", "handle", "authentication"],
    "repository": { "owner": "octocat", "name": "sample", "branch": "main", "files": 12, "directories": 3, "size": "40.0 KB" },
    "files": [{ "path": "app/user_service.py", "score": 1 }],
    "classes": [
      {
        "name": "UserService",
        "module": "app/user_service.py",
        "bases": ["BaseService"],
        "docstring": "Handles user authentication and account management.",
        "methods": ["authenticate", "helper"],
        "score": 2
      }
    ],
    "functions": [
      {
        "name": "authenticate",
        "module": "app/user_service.py",
        "qualified_name": "app/user_service.py::UserService.authenticate",
        "args": [{ "name": "self", "annotation": null }, { "name": "username", "annotation": null }],
        "returns": null,
        "docstring": null,
        "score": 1
      }
    ],
    "imports": [],
    "relationships": [
      {
        "symbol": "UserService",
        "outgoing": [{ "source": "class:app.user_service.UserService", "target": "class:app.base.BaseService", "relationship": "inherits" }],
        "incoming": []
      }
    ],
    "summary": {
      "keywords_used": 4,
      "matched_files": 1,
      "matched_classes": 1,
      "matched_functions": 1,
      "matched_imports": 0,
      "matched_relationships": 1
    }
  }
}
```

If nothing matches the question's keywords, `files`, `classes`,
`functions`, `imports`, and `relationships` are simply empty lists —
the builder never guesses.

**Error responses**

| Status | Meaning                                                          |
|--------|--------------------------------------------------------------------|
| 404    | Unknown `repository_id`, **or** no Knowledge Model built yet for it |

### Explanation Engine

`POST /api/v1/repository/{repository_id}/explanation` converts Context
Builder output into structured, **human-readable** text: a repository
overview, an architecture overview, and per-file/class/function/
dependency explanations. It's read-only and deterministic in exactly the
same way as `/context` — it 404s (rather than building anything) if the
Knowledge Model isn't cached yet, and it internally calls
`context_service.build_context` before handing that context straight to
the Explanation Engine, so it also never rescans, reparses, or rebuilds
the graph.

There's no LLM or external AI call here — every explanation is built by
template-based string formatting over data the Context Builder already
assembled. This is intentionally the abstraction layer a future milestone
can swap an LLM into: the shape (`question` in, structured explanation
out) is designed to stay stable even if individual `_explain_*` helpers
later delegate to a model instead of a template.

**Request**

```json
{ "question": "How does the UserService class handle authentication?" }
```

**Response — success (200)**

```json
{
  "success": true,
  "repository_id": "cmt_4f83d2ab",
  "explanation": {
    "question": "How does the UserService class handle authentication?",
    "repository_overview": "sample is a repository owned by octocat on the main branch. It contains 3 file(s) across 1 directorie(s), totaling 40.0 KB. The primary languages are Python (2 files), Markdown (1 files). The codebase defines 2 class(es) and 3 function(s)/method(s) across 2 parsed Python file(s), with 2 import statement(s).",
    "architecture_overview": "The dependency graph contains 9 node(s) and 4 edge(s), capturing module imports, class inheritance, and function calls across the codebase. Symbols most relevant to this question: UserService (1 outgoing, 0 incoming).",
    "file_explanations": [
      { "path": "app/user_service.py", "explanation": "app/user_service.py was identified as relevant to this question (relevance score 1). It defines the following relevant class(es): UserService." }
    ],
    "class_explanations": [
      {
        "name": "UserService",
        "module": "app/user_service.py",
        "explanation": "UserService is a class defined in app/user_service.py. It inherits from BaseService. Its docstring states: \"Handles user authentication and account management.\" It defines 2 method(s): authenticate, helper."
      }
    ],
    "function_explanations": [
      {
        "name": "authenticate",
        "module": "app/user_service.py",
        "explanation": "authenticate (app/user_service.py::UserService.authenticate) is a function/method defined in app/user_service.py. It accepts 2 argument(s): self, username: str. It returns bool."
      }
    ],
    "dependency_explanations": [
      {
        "symbol": "UserService",
        "explanation": "UserService has 1 outgoing and 0 incoming dependency relationship(s). Outgoing: inherits (1): class:app.base.BaseService. Incoming: none."
      }
    ],
    "summary": "In summary, this question matched 1 class(es), 1 function(s)/method(s), and 1 file(s) in sample, with 1 related dependency relationship(s) identified."
  }
}
```

If nothing matches the question, `file_explanations`, `class_explanations`,
`function_explanations`, and `dependency_explanations` are empty lists —
but `repository_overview`, `architecture_overview`, and `summary` are
always produced, since they describe the whole repository rather than
question-specific matches.

**Error responses**

| Status | Meaning                                                          |
|--------|--------------------------------------------------------------------|
| 404    | Unknown `repository_id`, **or** no Knowledge Model built yet for it |

---

## Running Tests

```bash
pip install pytest
pytest
```

---

## Architecture Notes

**Analysis pipeline** — each stage below is built exactly once per
repository and cached in the Knowledge Model; everything after the
Knowledge Model is a read-only consumer of it:

```text
Repository (GitHub URL)
      │  clone (git_service)
      ▼
Local workspace  ──registered──▶  repository_store (repository_id ↔ path + metadata)
      │
      │  scan (scanner_service) ─┐
      │  parse (parser_service) ─┼─▶  Knowledge Model (knowledge_service, built once, cached)
      │  graph (graph_service)  ─┘
      ▼
Knowledge Model
      │
      ├──▶ Semantic Query Engine (query_service)        — read-only lookups
      │        │
      │        ▼
      ├──▶ AI Context Builder (context_service)         — read-only, deterministic keyword matching
      │        │
      │        ▼
      └──▶ Explanation Engine (explanation_service)     — read-only, template-based text generation
```

The application follows a simple, layered structure:

- `app/main.py` creates the FastAPI instance, registers middleware for
  request logging, wires up a global exception handler, and mounts the
  versioned API router.
- `app/core/config.py` centralizes all configuration using Pydantic
  Settings, reading values from environment variables or a `.env` file.
- `app/core/logging.py` configures Python's built-in logging module once
  at startup, used consistently across the app.
- `app/api/routes.py` holds the versioned API routes: health check, clone,
  scan, parse, dependencies, knowledge, the query engine (`/query/*`,
  `/search`), the context builder (`/context`), and the explanation
  engine (`/explanation`) — each mapping service-layer exceptions to
  proper HTTP status codes. Scan, parse, and dependencies source their
  data from the cached Knowledge Model (via `knowledge_service.get_or_build`,
  which builds on first access); the query, context, and explanation
  endpoints use `knowledge_service.get_required`, which only reads the
  cache and never builds — a 404 if nothing's cached yet is the correct
  behavior there.
- `app/services/git_service.py` validates GitHub URLs with a simple regex,
  clones repositories with GitPython (shallow, `depth=1`, into a fresh
  temporary directory per request), walks the cloned filesystem to gather
  file/directory counts and size, and cleans up the temp directory
  automatically if the clone fails. It now also passes that metadata to
  `repository_store.register` so later steps (the Knowledge Model) don't
  need to recompute it.
- `app/services/repository_store.py` is a small in-memory registry mapping
  each issued `repository_id` to its local clone path **and** the
  repository metadata collected at clone time. No database — just a
  process-lifetime dict, extendable later if persistence is ever needed.
- `app/services/scanner_service.py` walks a resolved local path to build
  the project tree, count files/directories, detect languages by
  extension (mapping only, no parsing), and collect the 10 largest files.
  The ignore list and extension map are centralized constants at the top
  of the file so they're easy to extend. Its directory-walking (`walk_tree`)
  and hidden-file check (`is_hidden`) are public so other services (like
  the parser) can reuse them instead of duplicating ignore-rule logic.
- `app/services/parser_service.py` reuses `scanner_service.walk_tree` to
  find every `.py` file, then uses Python's built-in `ast` module (parse,
  walk, unparse) to extract imports, classes, functions, methods,
  decorators, docstrings, arguments, and return annotations. Purely
  deterministic and static — no AI, no Tree-sitter. Unreadable files or
  files with syntax errors are logged and skipped rather than failing
  the whole parse.
- `app/services/graph_service.py` exposes two entry points:
  `build_dependency_graph(local_path)` (parses, then builds — used
  standalone) and `build_dependency_graph_from_parsed(local_path, parsed)`
  (skips parsing, reuses an already-computed parse result — used by
  `knowledge_service` so the repository is parsed only once). Produces a
  graph of `module`/`class`/`function` nodes connected by
  `imports`/`inherits`/`calls` edges, with stable, human-readable node
  ids. Unresolved bases/calls are still recorded as nodes so no
  relationship is silently dropped — deterministic best-effort, never
  AI-guessed.
- `app/services/knowledge_service.py` is the single place that assembles
  the Knowledge Model: it calls the scanner, parser, and graph builder
  exactly once each per repository, combines their output with the
  repository metadata, and caches the result in memory (a `dict` guarded
  by a `threading.Lock`) keyed by `repository_id`. `get_or_build` returns
  the cached model if present, otherwise builds and stores it; `build`
  always rebuilds and overwrites; `get`/`get_required` are pure reads that
  never build, used by the query engine.
- `app/services/query_service.py` holds every query as a small, pure
  function that takes an already-built `KnowledgeModel` and returns plain
  dicts — no filesystem access, no calls into the scanner/parser/graph
  services. `list_classes`, `list_functions`, `list_imports`, and
  `list_files` each support an optional case-insensitive substring filter;
  `list_symbols` combines classes and functions; `get_relationships`
  resolves a symbol name to graph nodes and returns the matching
  incoming/outgoing edges; `search` aggregates all of the above plus a
  repository-metadata match. Being pure functions over an in-memory
  object, each is directly unit-testable without HTTP or a database.
- `app/services/context_service.py` builds a deterministic, bounded
  "context object" for a natural-language question by tokenizing it into
  keywords (stopwords and short words dropped, via a centralized
  `STOPWORDS` set) and running each keyword through `query_service`'s
  existing lookups. Matches are scored by keyword-hit count, sorted, and
  capped (`MAX_ITEMS_PER_CATEGORY`, `MAX_RELATIONSHIP_SYMBOLS`) so the
  result stays small and bounded rather than dumping the whole repository.
  It also carries repository-wide `languages`, `scan_summary`,
  `parse_summary`, and `graph_summary` straight from the Knowledge Model
  (cheap, already computed) so overview-level consumers — like the
  Explanation Engine — have whole-repository context alongside the
  question-specific matches. No AI model or embeddings are used — this is
  plain deterministic keyword matching, reusing the query engine rather
  than re-implementing lookups, and it's meant as the input a future
  milestone would hand to an LLM.
- `app/services/explanation_service.py` consumes *only* Context Builder
  output (the dict `context_service.build_context` returns) and produces
  human-readable text via template-based string formatting — no LLM, no
  filesystem access, and no calls into the scanner/parser/graph/knowledge
  services. `explain()` builds a repository overview and architecture
  overview from the context's repo-wide summaries, plus one explanation
  per matched file/class/function/dependency-relationship (file
  explanations cross-reference which matched classes/functions live in
  that file). This is the abstraction layer a future milestone can swap
  an LLM into without changing the function's signature or callers.
- `app/models/repository.py`, `app/models/parser.py`, `app/models/graph.py`,
  `app/models/knowledge.py`, `app/models/query.py`, `app/models/context.py`,
  and `app/models/explanation.py` define the request/response Pydantic
  models for each feature area. Later modules reuse earlier ones' models
  directly rather than redefining fields.
- `app/utils` remains empty for now — code is added only as it's needed,
  to avoid speculative abstractions.

This foundation is deliberately minimal so future milestones can build on
top of it without needing to refactor core wiring.
