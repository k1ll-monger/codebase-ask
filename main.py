from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os


from clone_repo import clone_repository, find_python_files
from chunker import extract_chunks_from_file
from embedder import embed_text
from vector_store import (
    get_or_create_collection,
    store_chunks,
    query_collection,
    list_repos,
)
from answerer import get_answer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- request/response models ---

class IndexRequest(BaseModel):
    repo_url: str
    repo_name: str


class ChatRequest(BaseModel):
    repo_name: str
    question: str


class ChatResponse(BaseModel):
    answer: str
    sources: list


# --- endpoints ---

@app.get("/repos")
def get_repos():
    """
    Returns all repo names that have already been indexed.
    Reads namespaces from Pinecone index stats.
    """
    repos = list_repos()
    return {"repos": repos}


@app.post("/index")
def index_repo(request: IndexRequest):
    """
    Clones a repo, chunks its Python files, embeds each chunk,
    and stores everything in Pinecone under the repo's namespace.
    """
    try:
        # step 1: clone
        repo_path = clone_repository(request.repo_url)

        # step 2: find python files
        py_files = find_python_files(repo_path)
        if not py_files:
            raise HTTPException(status_code=400, detail="No Python files found in this repo")

        # step 3: chunk all files
        all_chunks = []
        for file_path in py_files:
            chunks = extract_chunks_from_file(file_path)
            all_chunks.extend(chunks)

        if not all_chunks:
            raise HTTPException(status_code=400, detail="No functions or classes found to index")

        # step 4: embed all chunks
        all_embeddings = []
        for i, chunk in enumerate(all_chunks):
            embedding = embed_text(chunk["text"])
            all_embeddings.append(embedding)

        # step 5: store in pinecone
        namespace = get_or_create_collection(repo_name=request.repo_name)
        store_chunks(namespace, all_chunks, all_embeddings)

        return {
            "status": "success",
            "repo_name": request.repo_name,
            "chunks_indexed": len(all_chunks),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Takes a question about an already-indexed repo,
    retrieves relevant chunks, and returns a grounded answer.
    """
    # check the repo has actually been indexed
    indexed_repos = list_repos()
    safe_name = request.repo_name.replace("/", "-").replace("_", "-").lower()

    if safe_name not in indexed_repos and request.repo_name not in indexed_repos:
        raise HTTPException(
            status_code=404,
            detail=f"Repo '{request.repo_name}' has not been indexed yet"
        )

    namespace = get_or_create_collection(repo_name=request.repo_name)

    # embed the question
    question_embedding = embed_text(request.question)

    # retrieve relevant chunks
    results = query_collection(namespace, question_embedding, n_results=5)

    # build sources list
    sources = []
    for i in range(len(results["documents"][0])):
        meta = results["metadatas"][0][i]
        if meta["class_name"]:
            label = f"{meta['class_name']}.{meta['name']}"
        else:
            label = meta['name']
        sources.append({
            "label": label,
            "file_path": meta["file_path"],
            "start_line": meta["start_line"],
            "end_line": meta["end_line"],
            "code": results["documents"][0][i],
        })

    # generate answer
    answer = get_answer(request.question, results)

    return ChatResponse(answer=answer, sources=sources)