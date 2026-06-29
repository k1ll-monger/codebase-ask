# Codebase.Ask

Ask questions about any Python codebase in plain English. Get answers grounded in actual code — with file and function citations.

**Live demo**: [codebase-ask.vercel.app](https://codebase-ask.vercel.app)

---

## What it does

Paste a GitHub repo URL. The app clones it, parses every Python file, and builds a searchable index of all functions and classes. Then you can ask questions like:

- "How does this library handle sessions?"
- "What are the main classes and what do they do?"
- "How does error handling work?"

Answers are grounded exclusively in the actual codebase — not the model's general knowledge — and cite the specific file and function they came from.

---

## How it works

```
GitHub URL
    ↓
Clone repo (GitPython)
    ↓
Find all .py files
    ↓
Parse structure with Python AST → chunk by function/class boundaries
    ↓
Embed each chunk (Gemini text-embedding-001)
    ↓
Store vectors + metadata in Pinecone
    ↓
User asks a question
    ↓
Embed question → similarity search in Pinecone → retrieve top 5 chunks
    ↓
Send retrieved chunks + question to Gemini → grounded answer
```

The key design decision is **AST-based chunking** — instead of splitting code by word count (which cuts functions in half), the app parses Python syntax trees to split at function and class boundaries. Each chunk is one complete, meaningful unit of code. Methods are tagged with their parent class name so citations show `ClassName.method_name` rather than just `method_name`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Embeddings | Gemini `text-embedding-001` |
| Vector DB | Pinecone |
| LLM | Gemini `2.5 Flash` |
| Code parsing | Python `ast` module |
| Repo cloning | GitPython |
| Containerization | Docker |
| Backend hosting | Render |
| Frontend hosting | Vercel |

---

## Running locally

### Prerequisites
- Python 3.12+
- Node.js 18+
- Git
- A [Gemini API key](https://aistudio.google.com)
- A [Pinecone account](https://pinecone.io) (free tier works)

### Backend

```bash
# Clone the repo
git clone https://github.com/k1ll-monger/codebase-ask.git
cd codebase-ask

# Set up virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the server
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Environment variables

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

### Docker

```bash
docker build -t codebase-ask-backend .
docker run -p 8000:8000 --env-file .env codebase-ask-backend
```

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/repos` | List all indexed repos |
| `POST` | `/index` | Clone and index a GitHub repo |
| `POST` | `/chat` | Ask a question about an indexed repo |

### Index a repo

```bash
curl -X POST https://codebase-ask-render.onrender.com/index \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/psf/requests-html", "repo_name": "requests-html"}'
```

### Ask a question

```bash
curl -X POST https://codebase-ask-render.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"repo_name": "requests-html", "question": "how does this library handle sessions"}'
```

---

## Project structure

```
codebase-ask/
├── main.py           # FastAPI app — three endpoints: /repos, /index, /chat
├── clone_repo.py     # Clone GitHub repos, find Python files
├── chunker.py        # AST-based code chunking by function/class boundaries
├── embedder.py       # Gemini embedding API wrapper
├── vector_store.py   # Pinecone storage and retrieval
├── answerer.py       # Prompt construction and Gemini answer generation
├── Dockerfile        # Container definition
├── requirements.txt
├── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── pages/
    │       ├── Landing.jsx   # Repo input + preloaded samples
    │       └── Chat.jsx      # Chat interface with expandable source citations
    └── package.json
```

---

## Design decisions

**AST chunking over naive splitting** — splitting code by character count cuts functions in half, producing incoherent chunks with poor embeddings. Parsing the syntax tree and splitting at function/class boundaries ensures every chunk is semantically complete.

**Method-level chunking, not class-level** — chunking entire classes as one unit produces embeddings that are a blurry average of many different ideas. Individual methods produce focused, retrievable chunks while still being tagged with their parent class.

**Pinecone over local vector DB** — initially used ChromaDB with local persistence, but moved to Pinecone for reliable persistence across server restarts on cloud deployments.

**Provider-agnostic retrieval layer** — the retrieval pipeline (chunking → embedding → storage → search) is decoupled from the LLM provider. Swapping from one embedding model or LLM to another requires changes in one file only.

---

## Built by

Kaustubh — [github.com/k1ll-monger](https://github.com/k1ll-monger)