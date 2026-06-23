import os
import stat
import shutil
from git import Repo


def handle_remove_readonly(func, path, exc):
    """
    Error handler for shutil.rmtree on Windows.
    When rmtree hits a read-only file, this function
    flips it to writable and retries the delete.
    """
    os.chmod(path, stat.S_IWRITE)
    func(path)


def clone_repository(repo_url, clone_path="temp_repo"):
    """
    Clones a GitHub repo to a local folder.
    If the folder already exists, deletes it first (clean slate each time).
    """
    if os.path.exists(clone_path):
        shutil.rmtree(clone_path, onexc=handle_remove_readonly)

    print(f"Cloning {repo_url}...")
    Repo.clone_from(repo_url, clone_path)
    print("Clone complete.")
    return clone_path


def find_python_files(repo_path):
    """
    Walks the cloned repo and returns a list of all .py file paths.
    Skips common folders we don't care about (venv, git internals, caches).
    Skips test files, setup files, and sphinx config files.
    """
    python_files = []
    skip_dirs = {"venv", "env", ".git", "__pycache__", "node_modules"}
    skip_filenames = {"setup.py", "conftest.py", "conf.py"}

    for root, dirs, files in os.walk(repo_path):

        new_dirs = []
        for d in dirs:
            if d not in skip_dirs:
                new_dirs.append(d)

        # Modify dirs in-place so os.walk doesn't even descend into skipped folders
        dirs[:] = new_dirs

        for file in files:
            if not file.endswith(".py"):
                continue

            file_lower = file.lower()
            should_skip = False

            # skip exact filenames like setup.py, conf.py, conftest.py
            if file_lower in skip_filenames:
                should_skip = True

            # skip test files by prefix
            if file_lower.startswith("test_"):
                should_skip = True

            if not should_skip:
                full_path = os.path.join(root, file)
                python_files.append(full_path)

    return python_files


if __name__ == "__main__":
    # Quick test — replace with any small public Python repo
    repo_url = "https://github.com/psf/requests-html"
    repo_path = clone_repository(repo_url)
    py_files = find_python_files(repo_path)

    print(f"\nFound {len(py_files)} Python files:")
    for f in py_files[:10]:  # just show first 10
        print(f"  {f}")     