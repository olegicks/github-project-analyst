import os
from pathlib import Path
from tempfile import TemporaryDirectory

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from git import Repo

from analyzer.code_parser import analyze_source_tree

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
    ".h": "C/C++",
    ".hpp": "C++",
    ".rs": "Rust",
    ".go": "Go",
    ".php": "PHP",
    ".rb": "Ruby",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".cs": "C#",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
}

DEPENDENCY_FILES = {
    "requirements.txt",
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "pyproject.toml",
    "pom.xml",
    "build.gradle",
    "Cargo.toml",
    "go.mod",
    "composer.json",
    "Gemfile",
    "Package.swift",
}

ENTRY_POINT_NAMES = {
    "main.py",
    "main.js",
    "main.ts",
    "main.go",
    "main.rs",
    "index.js",
    "index.ts",
    "index.jsx",
    "index.tsx",
    "app.py",
    "app.js",
    "app.ts",
    "server.js",
    "server.ts",
    "manage.py",
    "Program.cs",
    "Main.java",
}

CONFIG_FILES = {
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".dockerignore",
    ".gitignore",
    "Makefile",
    "CMakeLists.txt",
    "vite.config.js",
    "vite.config.ts",
    "tsconfig.json",
    "webpack.config.js",
}

TEST_NAMES = {
    "test",
    "tests",
    "__tests__",
    "spec",
}


def analyze_files(path):
    files = []
    languages = {}
    dependencies = []
    entry_points = []
    important_files = []
    config_files = []
    test_files = []
    directories = set()
    lines = 0

    for file in path.rglob("*"):
        if not file.is_file() or ".git" in file.parts:
            continue

        relative = file.relative_to(path)
        relative_str = relative.as_posix()
        files.append(relative_str)

        if len(relative.parts) > 1:
            directories.add(relative.parts[0])

        if file.name in DEPENDENCY_FILES:
            dependencies.append(relative_str)

        if file.name in ENTRY_POINT_NAMES:
            entry_points.append(relative_str)

        if file.name in CONFIG_FILES:
            config_files.append(relative_str)

        if any(part.lower() in TEST_NAMES for part in relative.parts):
            test_files.append(relative_str)

        if (
            file.name.lower() in {
                "readme.md",
                "readme.txt",
                "license",
                "license.md",
            }
            or file.name in DEPENDENCY_FILES
            or file.name in ENTRY_POINT_NAMES
            or file.name in CONFIG_FILES
        ):
            important_files.append(relative_str)

        language = LANGUAGES.get(file.suffix.lower())

        if language:
            languages[language] = languages.get(language, 0) + 1

            try:
                lines += len(
                    file.read_text(
                        encoding="utf-8",
                        errors="ignore",
                    ).splitlines()
                )
            except OSError:
                pass

    return {
        "files": files,
        "languages": languages,
        "dependencies": dependencies,
        "entry_points": sorted(set(entry_points)),
        "important_files": sorted(set(important_files)),
        "config_files": config_files,
        "test_files": test_files,
        "directories": sorted(directories),
        "lines_of_code": lines,
    }


def detect_project_signals(data):
    languages = set(data["languages"])
    dependencies = set(data["dependencies"])
    files = data["file_list"]
    readme = (data["readme"] or "").lower()

    technologies = []

    if "Python" in languages:
        technologies.append("Python")

    if "JavaScript" in languages or "TypeScript" in languages:
        technologies.append("Node.js ecosystem")

    if "Java" in languages:
        technologies.append("Java")

    if "C++" in languages or "C" in languages:
        technologies.append("C/C++")

    if "Rust" in languages:
        technologies.append("Rust")

    if "Go" in languages:
        technologies.append("Go")

    if "react" in readme:
        technologies.append("React")

    dependency_map = {
        "requirements.txt": "Python dependencies",
        "package.json": "Node.js dependencies",
        "Cargo.toml": "Rust dependencies",
        "go.mod": "Go modules",
        "pom.xml": "Maven",
        "build.gradle": "Gradle",
        "composer.json": "PHP Composer",
        "Gemfile": "Ruby Bundler",
    }

    for dependency in dependencies:
        name = Path(dependency).name

        if name in dependency_map:
            technologies.append(dependency_map[name])

    if any(file.lower().endswith("dockerfile") for file in files):
        technologies.append("Docker")

    if any(file.startswith(".github/") for file in files):
        technologies.append("GitHub Actions")

    return sorted(set(technologies))


def generate_ai_analysis(metadata):
    prompt = f"""
You are a senior software engineer performing a repository analysis.

Analyze the repository using ONLY the provided information.
Do not invent frameworks, databases, architecture, features, or technologies.

Repository:
{metadata["repository"]}

Files: {metadata["files"]}
Lines of code: {metadata["lines_of_code"]}

Languages:
{metadata["languages"]}

Dependencies:
{metadata["dependencies"]}

Directories:
{metadata["directories"]}

Entry points:
{metadata["entry_points"]}

Important files:
{metadata["important_files"]}

Configuration:
{metadata["config_files"]}

Tests:
{metadata["test_files"]}

Detected technologies:
{metadata["technologies"]}

Source code analysis:
{metadata["source_analysis"]}

README:
{metadata["readme"] or "No README found."}

Provide a concise technical analysis with:

1. Project Overview
2. Technology Stack
3. Project Structure
4. Architecture
5. Code Quality
6. Testing
7. Potential Improvements

Clearly distinguish detected facts from reasonable observations.
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
            detail="Invalid GitHub URL",
        )

    with TemporaryDirectory() as temp_dir:
        try:
            Repo.clone_from(
                request.url,
                temp_dir,
                depth=1,
            )
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Could not clone repository",
            )

        path = Path(temp_dir)

        data = analyze_files(path)
        source_analysis = analyze_source_tree(path)

        readme = None

        for name in ["README.md", "README.txt", "README"]:
            readme_path = path / name

            if readme_path.exists():
                readme = readme_path.read_text(
                    encoding="utf-8",
                    errors="ignore",
                )[:10000]
                break

        entry_points = sorted(
            set(
                data["entry_points"]
                + source_analysis["entry_points"]
            )
        )

        metadata = {
            "repository": request.url,
            "files": len(data["files"]),
            "file_list": data["files"],
            "lines_of_code": data["lines_of_code"],
            "languages": data["languages"],
            "dependencies": data["dependencies"],
            "directories": data["directories"],
            "entry_points": entry_points,
            "important_files": data["important_files"],
            "config_files": data["config_files"],
            "test_files": data["test_files"],
            "readme": readme,
            "source_analysis": {
                "functions": len(source_analysis["functions"]),
                "classes": len(source_analysis["classes"]),
                "imports": len(source_analysis["imports"]),
                "endpoints": len(source_analysis["endpoints"]),
            },
        }

        metadata["technologies"] = detect_project_signals(metadata)
        metadata["ai_analysis"] = generate_ai_analysis(metadata)

        return {
            **metadata,
            "file_list": None,
            "structure": data["files"][:100],
        }