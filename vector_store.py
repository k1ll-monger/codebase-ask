from pinecone import Pinecone
import os
from dotenv import load_dotenv

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("codebase-ask")


def get_or_create_collection(client=None, repo_name=None):
    """
    Pinecone uses a single index with namespaces instead of
    separate collections. Each repo gets its own namespace.
    Returns the repo_name to use as namespace.
    """
    return repo_name


def store_chunks(collection, chunks, embeddings):
    """
    Stores chunks and their embeddings in Pinecone.
    collection here is actually the namespace (repo_name).
    """
    vectors = []

    for i, chunk in enumerate(chunks):
        chunk_id = f"{chunk['file_path']}::{chunk['name']}::{chunk['start_line']}"
        # Pinecone doesn't allow certain characters in IDs
        safe_id = chunk_id.replace("\\", "/").replace(" ", "_")

        # strip the temp_repo prefix for clean display
        clean_path = chunk["file_path"].replace("temp_repo\\", "").replace("temp_repo/", "")

        vectors.append({
            "id": safe_id,
            "values": embeddings[i],
            "metadata": {
                "file_path": clean_path,
                "name": chunk["name"],
                "class_name": chunk["class_name"] if chunk["class_name"] else "",
                "type": chunk["type"],
                "start_line": chunk["start_line"],
                "end_line": chunk["end_line"],
                "text": chunk["text"],  # store text in metadata since Pinecone doesn't have a separate document field
            }
        })

    # Pinecone recommends upserting in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch, namespace=collection)

    print(f"Stored {len(chunks)} chunks in namespace '{collection}'")


def query_collection(collection, query_embedding, n_results=5):
    """
    Queries Pinecone for the most similar chunks.
    Converts Pinecone's response format to match what our
    existing code expects from Chroma — same shape, different source.
    """
    results = index.query(
        vector=query_embedding,
        top_k=n_results,
        namespace=collection,
        include_metadata=True,
    )

    # convert Pinecone response to Chroma-like format
    # so answerer.py and main.py don't need to change at all
    documents = []
    metadatas = []
    distances = []

    for match in results["matches"]:
        documents.append(match["metadata"]["text"])
        metadatas.append({
            "file_path": match["metadata"]["file_path"],
            "name": match["metadata"]["name"],
            "class_name": match["metadata"]["class_name"],
            "type": match["metadata"]["type"],
            "start_line": match["metadata"]["start_line"],
            "end_line": match["metadata"]["end_line"],
        })
        distances.append(1 - match["score"])  # Pinecone returns similarity, Chroma returns distance — invert it

    return {
        "documents": [documents],
        "metadatas": [metadatas],
        "distances": [distances],
    }


def list_repos():
    """
    Lists all namespaces (repos) in the Pinecone index.
    Each namespace = one indexed repo.
    """
    stats = index.describe_index_stats()
    namespaces = list(stats["namespaces"].keys())
    return namespaces


def get_chroma_client():
    """
    Kept for compatibility with main.py imports.
    Pinecone doesn't need a client object passed around —
    we use the global index directly.
    """
    return None


if __name__ == "__main__":
    from clone_repo import clone_repository, find_python_files
    from chunker import extract_chunks_from_file
    from embedder import embed_text
    import time

    repo_url = "https://github.com/psf/requests-html"
    repo_name = "requests-html"

    repo_path = clone_repository(repo_url)
    py_files = find_python_files(repo_path)

    all_chunks = []
    for file_path in py_files:
        chunks = extract_chunks_from_file(file_path)
        all_chunks.extend(chunks)

    print(f"Total chunks to embed: {len(all_chunks)}")

    all_embeddings = []
    for i, chunk in enumerate(all_chunks):
        print(f"Embedding chunk {i+1}/{len(all_chunks)}: {chunk['name']}")
        embedding = embed_text(chunk["text"])
        all_embeddings.append(embedding)
        if (i + 1) % 90 == 0:
            print("Pausing for rate limit...")
            time.sleep(65)

    namespace = get_or_create_collection(repo_name=repo_name)
    store_chunks(namespace, all_chunks, all_embeddings)

    print("\nTesting retrieval...")
    question = "how does this library handle sessions"
    from embedder import embed_text
    question_embedding = embed_text(question)
    results = query_collection(namespace, question_embedding, n_results=3)

    print(f"\nTop 3 results for: '{question}'\n")
    for i in range(len(results["documents"][0])):
        doc = results["documents"][0][i]
        meta = results["metadatas"][0][i]
        label = f"{meta['class_name']}.{meta['name']}" if meta['class_name'] else meta['name']
        print(f"--- {label} ({meta['file_path']}) ---")
        print(doc[:200])
        print("...\n")