from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def build_prompt(question, retrieved_chunks):
    """
    Takes the user's question and the chunks retrieved from Chroma,
    and builds a prompt for Gemini to answer from.
    """
    context_blocks = []

    for i in range(len(retrieved_chunks["documents"][0])):
        doc = retrieved_chunks["documents"][0][i]
        meta = retrieved_chunks["metadatas"][0][i]

        if meta["class_name"]:
            label = f"{meta['class_name']}.{meta['name']}"
        else:
            label = meta['name']

        context_blocks.append(
            f"### {label} (file: {meta['file_path']}, line {meta['start_line']})\n{doc}"
        )

    context_string = "\n\n".join(context_blocks)

    prompt = f"""You are a helpful assistant that answers questions about a codebase.
You will be given relevant code snippets retrieved from the codebase, and a question.
Answer the question based ONLY on the provided code snippets.
If the answer cannot be determined from the snippets, say so clearly.
Always cite which file and function your answer comes from.

## Relevant code snippets:
{context_string}

## Question:
{question}

## Answer:
"""
    return prompt   

def get_answer(question, retrieved_chunks):
    """
    Builds the prompt from the question + retrieved chunks,
    sends it to Gemini, and returns the answer text.
    """
    prompt = build_prompt(question, retrieved_chunks)

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    return response.text


if __name__ == "__main__":
    from embedder import embed_text
    from vector_store import get_chroma_client, get_or_create_collection, query_collection

    question = "how does this library handle sessions"

    # retrieve relevant chunks from chroma
    chroma_client = get_chroma_client()
    collection = get_or_create_collection(chroma_client, "requests-html")

    question_embedding = embed_text(question)
    results = query_collection(collection, question_embedding, n_results=3)

    # reformat chroma results into something cleaner to work with
    retrieved_chunks = []
    for i in range(len(results["documents"][0])):
        retrieved_chunks.append({
            "document": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })

    # get the answer
    answer = get_answer(question, retrieved_chunks)
    print(f"Question: {question}\n")
    print(f"Answer:\n{answer}")