from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from git import Repo


app = FastAPI(title="GitHub Project Analyst")


class RepositoryRequest(BaseModel):
    url: str


LANGUAGES = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".rs": "Rust",
    ".go": "Go",
    ".php": "PHP",
    ".rb": "Ruby",
    ".html": "HTML",
    ".css": "CSS",
}


DEPENDENCY_FILES = {
    "requirements.txt",
    "package.json",
    "package-lock.json",
    "pyproject.toml",
    "pom.xml",
    "build.gradle",
    "Cargo.toml",
    "go.mod",
}


def analyze_files(path: Path):
    files = []
    languages = {}
    dependencies = []
    lines = 0

    for file in path.rglob("*"):
        if not file.is_file() or ".git" in file.parts:
            continue

        relative = file.relative_to(path)
        files.append(relative.as_posix())

        if file.name in DEPENDENCY_FILES:
            dependencies.append(relative.as_posix())

        language = LANGUAGES.get(file.suffix.lower())

        if language:
            languages[language] = languages.get(language, 0) + 1

            try:
                lines += len(file.read_text(encoding="utf-8", errors="ignore").splitlines())
            except OSError:
                pass

    return files, languages, dependencies, lines


@app.get("/")
def root():
    return {"status": "online"}


@app.post("/analyze")
def analyze_repository(request: RepositoryRequest):
    if not request.url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")

    with TemporaryDirectory() as temp_dir:
        try:
            Repo.clone_from(request.url, temp_dir, depth=1)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Could not clone repository",
            )

        path = Path(temp_dir)
        files, languages, dependencies, lines = analyze_files(path)

        directories = sorted({
            file.split("/")[0]
            for file in files
            if "/" in file
        })

        readme = None

        for name in ["README.md", "README.txt", "README"]:
            readme_path = path / name

            if readme_path.exists():
                readme = readme_path.read_text(
                    encoding="utf-8",
                    errors="ignore",
                )[:10000]
                break

        return {
            "repository": request.url,
            "files": len(files),
            "lines_of_code": lines,
            "languages": languages,
            "dependencies": dependencies,
            "directories": directories,
            "readme": readme,
            "structure": files[:100],
        }