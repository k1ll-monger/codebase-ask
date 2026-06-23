FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

# Install git — needed by gitpython to clone repos
# apt-get is the package manager for Debian/Ubuntu-based images
# -y means "yes to all prompts" (no interactive confirmation)
# --no-install-recommends keeps it lean — only git, no extras
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]