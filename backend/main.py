import os
from pathlib import Path
from tempfile import TemporaryDirectory

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from git import Repo

load_dotenv()

app = FastAPI(title="GitHub Project Analyst")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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
                lines += len(
                    file.read_text(
                        encoding="utf-8",
                        errors="ignore"
                    ).splitlines()
                )
            except OSError:
                pass

    return files, languages, dependencies, lines


def generate_ai_analysis(metadata):
    prompt = f"""
You are a senior software engineer analyzing a GitHub repository.

Analyze the following repository metadata and README.

Repository:
{metadata["repository"]}

Files: {metadata["files"]}
Lines of code: {metadata["lines_of_code"]}

Languages:
{metadata["languages"]}

Dependency files:
{metadata["dependencies"]}

Directories:
{metadata["directories"]}

README:
{metadata["readme"] or "No README found."}

Provide a concise technical analysis with these sections:

1. Project Overview
2. Technology Stack
3. Architecture
4. Code Quality
5. Potential Improvements

Do not invent technologies or features that are not supported by the provided information.
"""

    response = client.responses.create(
        model="gpt-5.6",
        input=prompt,
    )

    return response.output_text


@app.get("/")
def root():
    return {"status": "online"}


@app.post("/analyze")
def analyze_repository(request: RepositoryRequest):
    if not request.url.startswith("https://github.com/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL"
        )

    with TemporaryDirectory() as temp_dir:
        try:
            Repo.clone_from(
                request.url,
                temp_dir,
                depth=1
            )
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Could not clone repository"
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
                    errors="ignore"
                )[:10000]
                break

        metadata = {
            "repository": request.url,
            "files": len(files),
            "lines_of_code": lines,
            "languages": languages,
            "dependencies": dependencies,
            "directories": directories,
            "readme": readme,
        }

        analysis = generate_ai_analysis(metadata)

        return {
            **metadata,
            "ai_analysis": analysis,
            "structure": files[:100],
        }