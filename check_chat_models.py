from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("=== EMBEDDING MODELS ===")
for model in client.models.list():
    if "embed" in model.name.lower():
        print(model.name)

print("\n=== GENERATIVE MODELS ===")
for model in client.models.list():
    if "gemini" in model.name.lower() and "embed" not in model.name.lower():
        print(model.name)