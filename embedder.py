from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def embed_text(text):
    """
    Takes a string of text and returns its embedding
    as a list of numbers, using Gemini's embedding model.
    """
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )
    return response.embeddings[0].values


if __name__ == "__main__":
    sample = "def add(a, b): return a + b"
    embedding = embed_text(sample)

    print(f"Type: {type(embedding)}")
    print(f"Length: {len(embedding)}")
    print(f"First 5 values: {embedding[:5]}")