import chromadb
import os


def get_chroma_client():
    """
    Creates a Chroma client that persists data to disk.
    This means embeddings survive between runs — we don't
    re-embed the same repo every time the server restarts.
    """
    return chromadb.PersistentClient(path="chroma_db")


def get_or_create_collection(client, repo_name):
    """
    Gets an existing collection for this repo, or creates one
    if it doesn't exist yet.
    Each repo gets its own collection — this is how we keep
    chunks from different repos isolated from each other.
    """
    # Chroma collection names must be alphanumeric + hyphens only
    # so we sanitize the repo name just in case
    safe_name = repo_name.replace("/", "-").replace("_", "-").lower()

    collection = client.get_or_create_collection(
        name=safe_name,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


def store_chunks(collection, chunks, embeddings):
    """
    Stores a list of chunks and their corresponding embeddings
    into the given Chroma collection.

    chunks    — list of dicts from our chunker
    embeddings — list of vectors, one per chunk, same order
    """
    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        # Each chunk needs a unique id — we build one from its location
        chunk_id = f"{chunk['file_path']}::{chunk['name']}::{chunk['start_line']}"
        ids.append(chunk_id)
        documents.append(chunk["text"])
        metadatas.append({
            "file_path": chunk["file_path"],
            "name": chunk["name"],
            "class_name": chunk["class_name"] if chunk["class_name"] else "",
            "type": chunk["type"],
            "start_line": chunk["start_line"],
            "end_line": chunk["end_line"],
        })

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )
    print(f"Stored {len(chunks)} chunks in collection '{collection.name}'")


def query_collection(collection, query_embedding, n_results=5):
    """
    Given a query embedding (the user's question, embedded),
    returns the n most similar chunks from this collection.
    """
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )
    return results


if __name__ == "__main__":
    from clone_repo import clone_repository, find_python_files
    from chunker import extract_chunks_from_file
    from embedder import embed_text

    # --- index a repo end to end ---
    repo_url = "https://github.com/psf/requests-html"
    repo_name = "requests-html"

    repo_path = clone_repository(repo_url)
    py_files = find_python_files(repo_path)

    all_chunks = []
    for file_path in py_files:
        chunks = extract_chunks_from_file(file_path)
        all_chunks.extend(chunks)

    print(f"Total chunks to embed: {len(all_chunks)}")

    # embed each chunk
    all_embeddings = []
    for i, chunk in enumerate(all_chunks):
        print(f"Embedding chunk {i+1}/{len(all_chunks)}: {chunk['name']}")
        embedding = embed_text(chunk["text"])
        all_embeddings.append(embedding)

    # store in chroma
    chroma_client = get_chroma_client()
    collection = get_or_create_collection(chroma_client, repo_name)
    store_chunks(collection, all_chunks, all_embeddings)

    # test a query
    print("\nTesting retrieval...")
    question = "how does this library handle sessions"
    question_embedding = embed_text(question)
    results = query_collection(collection, question_embedding, n_results=3)

    print(f"\nTop 3 results for: '{question}'\n")
    for i in range(len(results["documents"][0])):
        doc = results["documents"][0][i]
        meta = results["metadatas"][0][i]
        distance = results["distances"][0][i]

        label = f"{meta['class_name']}.{meta['name']}" if meta['class_name'] else meta['name']
        print(f"--- {label} ({meta['file_path']}) | distance: {distance:.4f} ---")
        print(doc[:200])
        print("...\n")