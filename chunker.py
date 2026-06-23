import ast


def extract_chunks_from_file(file_path):
    """
    Reads a Python file and splits it into chunks at function boundaries.
    For classes, chunks each method individually (tagged with class name)
    instead of chunking the whole class as one blob.
    """
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        source_code = f.read()

    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        print(f"Skipping {file_path} — could not parse")
        return []

    source_lines = source_code.splitlines()
    chunks = []

    # tree.body = only the TOP-LEVEL statements in the file
    # (not nested ones — ast.walk would have given us nested ones too)
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            chunks.extend(
                extract_methods_from_class(node, source_lines, file_path)
            )
        elif isinstance(node, ast.FunctionDef):
            chunks.append(
                build_chunk(node, source_lines, file_path, class_name=None)
            )

    return chunks


def extract_methods_from_class(class_node, source_lines, file_path):
    """
    Given a ClassDef node, returns one chunk per method inside it.
    Each chunk is tagged with the class it belongs to.
    """
    method_chunks = []

    for inner_node in class_node.body:
        if isinstance(inner_node, ast.FunctionDef):
            chunk = build_chunk(
                inner_node, source_lines, file_path, class_name=class_node.name
            )
            method_chunks.append(chunk)

    return method_chunks


def build_chunk(node, source_lines, file_path, class_name):
    """
    Given a function node, slices out its source code and
    builds the chunk dict with metadata.
    """
    start_line = node.lineno - 1
    end_line = node.end_lineno

    chunk_lines = source_lines[start_line:end_line]
    chunk_text = "\n".join(chunk_lines)

    return {
        "text": chunk_text,
        "file_path": file_path,
        "name": node.name,
        "class_name": class_name,   # None if it's a standalone function
        "type": "FunctionDef",
        "start_line": node.lineno,
        "end_line": node.end_lineno,
    }


if __name__ == "__main__":
    test_file = "temp_repo/requests_html.py"
    chunks = extract_chunks_from_file(test_file)

    print(f"Found {len(chunks)} chunks in {test_file}\n")
    for chunk in chunks[:5]:
        label = f"{chunk['class_name']}.{chunk['name']}" if chunk['class_name'] else chunk['name']
        print(f"--- {label} (lines {chunk['start_line']}-{chunk['end_line']}) ---")
        print(chunk['text'][:150])
        print("...\n")