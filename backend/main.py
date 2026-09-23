import json
import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from git import Repo
from openai import OpenAI
from pydantic import BaseModel

from analyzer.code_parser import analyze_source_tree


load_dotenv()

app = FastAPI(title="GitHub Project Analyst")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

MAX_FILES = 5000
MAX_FILE_SIZE = 512 * 1024
MAX_README_CHARS = 12000
MAX_GRAPH_NODES = 300


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
    ".env.example",
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
        if (
            not file.is_file()
            or ".git" in file.parts
        ):
            continue

        if len(files) >= MAX_FILES:
            break

        relative = file.relative_to(path)
        relative_str = relative.as_posix()

        files.append(relative_str)

        if len(relative.parts) > 1:
            directories.add(
                relative.parts[0]
            )

        if file.name in DEPENDENCY_FILES:
            dependencies.append(
                relative_str
            )

        if file.name in ENTRY_POINT_NAMES:
            entry_points.append(
                relative_str
            )

        if file.name in CONFIG_FILES:
            config_files.append(
                relative_str
            )

        if any(
            part.lower() in TEST_NAMES
            for part in relative.parts
        ):
            test_files.append(
                relative_str
            )

        if (
            file.name.lower()
            in {
                "readme.md",
                "readme.txt",
                "license",
                "license.md",
            }
            or file.name in DEPENDENCY_FILES
            or file.name in ENTRY_POINT_NAMES
            or file.name in CONFIG_FILES
        ):
            important_files.append(
                relative_str
            )

        language = LANGUAGES.get(
            file.suffix.lower()
        )

        if language:
            languages[language] = (
                languages.get(language, 0) + 1
            )

            try:
                if (
                    file.stat().st_size
                    <= MAX_FILE_SIZE
                ):
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
        "dependencies": sorted(
            set(dependencies)
        ),
        "entry_points": sorted(
            set(entry_points)
        ),
        "important_files": sorted(
            set(important_files)
        ),
        "config_files": sorted(
            set(config_files)
        ),
        "test_files": sorted(
            set(test_files)
        ),
        "directories": sorted(
            directories
        ),
        "lines_of_code": lines,
        "truncated": len(files) >= MAX_FILES,
    }


def read_dependency_files(path):
    result = {}

    for relative in DEPENDENCY_FILES:
        file = path / relative

        if not file.exists():
            continue

        try:
            if file.stat().st_size > 100_000:
                continue

            result[relative] = file.read_text(
                encoding="utf-8",
                errors="ignore",
            )[:8000]
        except OSError:
            pass

    return result


def detect_project_signals(data):
    languages = set(
        data["languages"]
    )

    files = data["file_list"]

    dependencies = set(
        data["dependencies"]
    )

    dependency_contents = data[
        "dependency_contents"
    ]

    readme = (
        data["readme"] or ""
    ).lower()

    technologies = set()

    technologies.update(
        languages
        &
        {
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

    package_json = (
        dependency_contents
        .get("package.json", "")
        .lower()
    )

    requirements = (
        dependency_contents
        .get("requirements.txt", "")
        .lower()
    )

    pyproject = (
        dependency_contents
        .get("pyproject.toml", "")
        .lower()
    )

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

    if (
        "fastapi" in requirements
        or "fastapi" in pyproject
    ):
        technologies.add("FastAPI")

    if (
        "flask" in requirements
        or "flask" in pyproject
    ):
        technologies.add("Flask")

    if (
        "pytest" in requirements
        or "pytest" in pyproject
    ):
        technologies.add("pytest")

    if "Dockerfile" in files:
        technologies.add("Docker")

    if any(
        file.startswith(
            ".github/workflows/"
        )
        for file in files
    ):
        technologies.add(
            "GitHub Actions"
        )

    dependency_map = {
        "requirements.txt":
            "Python dependencies",
        "package.json":
            "Node.js dependencies",
        "Cargo.toml":
            "Rust dependencies",
        "go.mod":
            "Go modules",
        "pom.xml":
            "Maven",
        "build.gradle":
            "Gradle",
        "composer.json":
            "PHP Composer",
        "Gemfile":
            "Ruby Bundler",
    }

    for dependency in dependencies:
        name = Path(
            dependency
        ).name

        if name in dependency_map:
            technologies.add(
                dependency_map[name]
            )

    return sorted(
        technologies
    )


def generate_ai_analysis(metadata):
    prompt = f"""
You are a senior software engineer analyzing a GitHub repository.

Use only the supplied repository facts.
Do not invent frameworks, databases,
features, or architecture.

Repository:
{metadata["repository"]}

Files:
{metadata["files"]}

Lines of code:
{metadata["lines_of_code"]}

Languages:
{metadata["languages"]}

Dependency files:
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

Source statistics:
{json.dumps(
    metadata["source_analysis"],
    indent=2
)}

Dependency graph:
{json.dumps(
    metadata["dependency_graph"],
    indent=2
)[:30000]}

Dependency manifests:
{json.dumps(
    metadata["dependency_contents"],
    indent=2
)[:16000]}

README:
{metadata["readme"] or "No README found."}

Provide:

1. Project Overview
2. Technology Stack
3. Project Structure
4. Architecture
5. Dependency Structure
6. Code Quality
7. Testing
8. Potential Improvements

Keep the analysis technical and concise.
Clearly distinguish detected facts
from reasonable observations.
"""

    response = client.responses.create(
        model=os.getenv(
            "OPENAI_MODEL",
            "gpt-5.6",
        ),
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
def analyze_repository(
    request: RepositoryRequest
):
    if not request.url.startswith(
        "https://github.com/"
    ):
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

        source_analysis = (
            analyze_source_tree(path)
        )

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
                +
                source_analysis[
                    "entry_points"
                ]
            )
        )

        graph = (
            source_analysis[
                "dependency_graph"
            ]
        )

        if len(
            graph["nodes"]
        ) > MAX_GRAPH_NODES:
            allowed = {
                node["id"]
                for node in graph[
                    "nodes"
                ][:MAX_GRAPH_NODES]
            }

            graph = {
                "nodes": [
                    node
                    for node in graph[
                        "nodes"
                    ]
                    if node["id"] in allowed
                ],
                "edges": [
                    edge
                    for edge in graph[
                        "edges"
                    ]
                    if (
                        edge["source"]
                        in allowed
                        and
                        edge["target"]
                        in allowed
                    )
                ],
                "connected_files":
                    graph[
                        "connected_files"
                    ],
                "truncated": True,
            }

        metadata = {
            "repository":
                request.url,
            "files":
                len(data["files"]),
            "file_list":
                data["files"],
            "lines_of_code":
                data["lines_of_code"],
            "languages":
                data["languages"],
            "dependencies":
                data["dependencies"],
            "dependency_contents":
                read_dependency_files(
                    path
                ),
            "directories":
                data["directories"],
            "entry_points":
                entry_points,
            "important_files":
                data["important_files"],
            "config_files":
                data["config_files"],
            "test_files":
                data["test_files"],
            "readme":
                readme,
            "source_analysis": {
                "functions":
                    len(
                        source_analysis[
                            "functions"
                        ]
                    ),
                "classes":
                    len(
                        source_analysis[
                            "classes"
                        ]
                    ),
                "imports":
                    len(
                        source_analysis[
                            "imports"
                        ]
                    ),
                "endpoints":
                    len(
                        source_analysis[
                            "endpoints"
                        ]
                    ),
            },
            "dependency_graph":
                graph,
        }

        metadata["technologies"] = (
            detect_project_signals(
                metadata
            )
        )

        metadata["ai_analysis"] = (
            generate_ai_analysis(
                metadata
            )
        )

        return {
            **metadata,
            "file_list": None,
            "dependency_contents": None,
            "structure":
                data["files"][:100],
            "limits": {
                "max_files":
                    MAX_FILES,
                "graph_nodes":
                    MAX_GRAPH_NODES,
            },
        }