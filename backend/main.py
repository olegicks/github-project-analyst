import json
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
    allow_origins=[
        "http://localhost:5173",
        "https://github-project-analyst.vercel.app",
    ],
    allow_origin_regex=r"https://github-project-analyst(?:-[a-z0-9-]+)?\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MAX_FILES = 5000
MAX_FILE_SIZE = 512 * 1024
MAX_README_CHARS = 12000

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
    ".env.example",
}

TEST_NAMES = {"test", "tests", "__tests__", "spec"}


class RepositoryRequest(BaseModel):
    url: str


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

        if len(files) >= MAX_FILES:
            break

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
            file.name.lower()
            in {"readme.md", "readme.txt", "license", "license.md"}
            or file.name in DEPENDENCY_FILES
            or file.name in ENTRY_POINT_NAMES
            or file.name in CONFIG_FILES
        ):
            important_files.append(relative_str)

        language = LANGUAGES.get(file.suffix.lower())

        if language:
            languages[language] = languages.get(language, 0) + 1

            try:
                if file.stat().st_size <= MAX_FILE_SIZE:
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
        "dependencies": sorted(set(dependencies)),
        "entry_points": sorted(set(entry_points)),
        "important_files": sorted(set(important_files)),
        "config_files": sorted(set(config_files)),
        "test_files": sorted(set(test_files)),
        "directories": sorted(directories),
        "lines_of_code": lines,
        "truncated": len(files) >= MAX_FILES,
    }


def read_dependency_files(path):
    result = {}

    for relative in DEPENDENCY_FILES:
        file = path / relative

        if not file.exists() or file.stat().st_size > 100_000:
            continue

        try:
            result[relative] = file.read_text(
                encoding="utf-8",
                errors="ignore",
            )[:8000]
        except OSError:
            pass

    return result


def detect_project_signals(data):
    languages = set(data["languages"])
    dependencies = set(data["dependencies"])
    files = data["file_list"]
    dependency_text = data["dependency_contents"]
    readme = (data["readme"] or "").lower()

    technologies = set()

    technologies.update(
        languages
        & {
            "Python",
            "JavaScript",
            "TypeScript",
            "Java",
            "Go",
            "Rust",
            "C++",
            "C#",
            "PHP",
            "Ruby",
        }
    )

    package_json = dependency_text.get("package.json", "").lower()
    requirements = dependency_text.get("requirements.txt", "").lower()
    pyproject = dependency_text.get("pyproject.toml", "").lower()

    if '"react"' in package_json:
        technologies.add("React")

    if '"next"' in package_json:
        technologies.add("Next.js")

    if '"express"' in package_json:
        technologies.add("Express")

    if '"vite"' in package_json:
        technologies.add("Vite")

    if (
        "django" in requirements
        or "django" in pyproject
        or "django" in readme
    ):
        technologies.add("Django")

    if "fastapi" in requirements or "fastapi" in pyproject:
        technologies.add("FastAPI")

    if "flask" in requirements or "flask" in pyproject:
        technologies.add("Flask")

    if "pytest" in requirements or "pytest" in pyproject:
        technologies.add("pytest")

    if "Dockerfile" in files:
        technologies.add("Docker")

    if any(file.startswith(".github/workflows/") for file in files):
        technologies.add("GitHub Actions")

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
        if Path(dependency).name in dependency_map:
            technologies.add(
                dependency_map[Path(dependency).name]
            )

    return sorted(technologies)


def generate_ai_analysis(metadata):
    prompt = f"""
You are a senior software engineer generating a concise repository
analysis for a developer dashboard.

Use only the supplied repository facts.
Do not invent technologies, architecture, features, deployment details,
databases, security controls, or implementation details.

Your goal is NOT to write a report.
Your goal is to give the developer a compact summary containing the
most important information about the repository.

Repository: {metadata["repository"]}
Files: {metadata["files"]}
Lines of code: {metadata["lines_of_code"]}
Languages: {metadata["languages"]}
Dependency files: {metadata["dependencies"]}
Directories: {metadata["directories"]}
Entry points: {metadata["entry_points"]}
Important files: {metadata["important_files"]}
Configuration: {metadata["config_files"]}
Tests: {metadata["test_files"]}
Detected technologies: {metadata["technologies"]}

Source statistics:
{json.dumps(metadata["source_analysis"], indent=2)}

Dependency graph:
{json.dumps(metadata["dependency_graph"], indent=2)[:30000]}

Dependency manifests:
{json.dumps(metadata["dependency_contents"], indent=2)[:16000]}

README:
{metadata["readme"] or "No README found."}

OUTPUT FORMAT

Create exactly these 8 main sections:

## Project Overview
## Technology Stack
## Project Structure
## Architecture
## Dependency Structure
## Code Quality
## Testing
## Potential Improvements

IMPORTANT GLOBAL RULES

1. Keep the entire response concise.
2. Target approximately 450-650 words total.
3. Every section must contain useful information.
4. Every section should contain:
   - one short introductory paragraph of 1-2 sentences
   - followed by 2-5 concise bullet points when additional detail is useful
5. Never leave a section empty.
6. Never create unnecessary subsections.
7. Do NOT create headings such as:
   - Detected Facts
   - Observations
   - Reasonable Observations
   - Positive Signals
   - Implications
   - Maintainability Considerations
   - Coverage Areas
   - Manifest Characteristics
   - Application Components
8. Do not use "Observation" or "Observations" as a section heading.
9. Do not repeat information unnecessarily.
10. Do not repeat the repository metrics already displayed by the dashboard
    unless a metric is important for explaining an architectural or
    maintainability point.
11. Prefer compact bullets over long paragraphs.
12. Do not enumerate every file, function, class, dependency, or package.
13. Mention only the most important examples.
14. Do not create large tables.
15. Do not create large code blocks.
16. Do not reproduce the README.
17. Do not speculate.
18. When something is not detected, simply omit it instead of inventing
    a replacement.
19. Recommendations must appear only in "Potential Improvements".
20. Distinguish existing facts from recommendations naturally without
    adding labels such as "Detected Facts" or "Observations".

SECTION-SPECIFIC GUIDELINES

Project Overview:
- Explain in 1-2 sentences what the project does.
- Give 2-4 of the most important capabilities.
- Focus on the project's purpose rather than raw metrics.

Technology Stack:
- Give one short summary sentence.
- Mention the main backend/framework, frontend/UI technologies,
  infrastructure/deployment technologies, and important tooling when
  actually detected.
- Do not list every dependency.
- Group related technologies naturally.

Project Structure:
- Briefly describe how the repository is organized.
- Mention only the most important directories/files and their roles.
- Do not reproduce the entire directory tree.

Architecture:
- Describe the main architectural style in 1-2 sentences.
- Explain the main request/data flow.
- Mention the key components and how they interact.
- Use a short bullet flow if useful.

Dependency Structure:
- Summarize internal module dependencies.
- Mention the main dependency direction or important dependency hubs.
- Mention external dependency groups only at a high level.
- Do not list every package.

Code Quality:
- Mention 2-3 clear strengths supported by the repository.
- Mention 1-2 concrete areas that could affect maintainability or quality.
- Keep this section factual and concise.
- Do not turn it into a long code review.

Testing:
- State what testing exists.
- Mention the main tested areas.
- Mention the most important missing testing areas if clearly supported.
- Do not speculate about test quality without evidence.

Potential Improvements:
- Provide 4-6 practical, high-value recommendations.
- Each recommendation should be one concise bullet.
- Prioritize the most useful improvements.
- Do not repeat the entire analysis.
- Do not write generic advice that is unrelated to the repository.

STYLE

Write like a concise senior-engineer codebase review:
- direct
- technical
- factual
- easy to scan
- minimal repetition
- no filler
- no exaggerated claims
"""

    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5.6"),
        input=prompt,
    )

    return response.output_text


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "GitHub Project Analyst",
    }


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

        for name in [
            "README.md",
            "README.txt",
            "README",
        ]:
            readme_path = path / name

            if readme_path.exists():
                readme = readme_path.read_text(
                    encoding="utf-8",
                    errors="ignore",
                )[:MAX_README_CHARS]
                break

        entry_points = sorted(
            set(
                data["entry_points"]
                + source_analysis["entry_points"]
            )
        )

        graph = source_analysis["dependency_graph"]

        if len(graph["nodes"]) > 300:
            node_ids = {
                node["id"]
                for node in graph["nodes"][:300]
            }

            graph = {
                "nodes": graph["nodes"][:300],
                "edges": [
                    edge
                    for edge in graph["edges"]
                    if edge["source"] in node_ids
                    and edge["target"] in node_ids
                ],
                "connected_files": graph["connected_files"],
                "truncated": True,
            }

        metadata = {
            "repository": request.url,
            "files": len(data["files"]),
            "file_list": data["files"],
            "lines_of_code": data["lines_of_code"],
            "languages": data["languages"],
            "dependencies": data["dependencies"],
            "dependency_contents": read_dependency_files(path),
            "directories": data["directories"],
            "entry_points": entry_points,
            "important_files": data["important_files"],
            "config_files": data["config_files"],
            "test_files": data["test_files"],
            "readme": readme,
            "source_analysis": {
                "functions": len(
                    source_analysis["functions"]
                ),
                "classes": len(
                    source_analysis["classes"]
                ),
                "imports": len(
                    source_analysis["imports"]
                ),
                "endpoints": len(
                    source_analysis["endpoints"]
                ),
            },
            "dependency_graph": graph,
        }

        metadata["technologies"] = detect_project_signals(
            metadata
        )

        metadata["ai_analysis"] = generate_ai_analysis(
            metadata
        )

        return {
            **metadata,
            "file_list": None,
            "dependency_contents": None,
            "structure": data["files"][:100],
            "limits": {
                "max_files": MAX_FILES,
                "graph_nodes": 300,
            },
        }