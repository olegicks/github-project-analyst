from pathlib import PurePosixPath


# Directories that hold dependencies, build output or collected static
# files rather than the project's own code.
EXCLUDED_DIRECTORIES = {
    ".git",
    "node_modules",
    "bower_components",
    "jspm_packages",
    "vendor",
    "vendors",
    "third_party",
    "third-party",
    "staticfiles",
    "dist",
    "build",
    "target",
    "coverage",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".venv",
    "venv",
    "env",
    "site-packages",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".tox",
    ".gradle",
    ".idea",
    ".vscode",
}

# Minified bundles, source maps and generated code.
EXCLUDED_SUFFIXES = (
    ".min.js",
    ".min.css",
    ".min.mjs",
    ".bundle.js",
    ".chunk.js",
    ".map",
    ".pb.go",
    "_pb2.py",
    ".generated.ts",
)


def is_excluded(relative_path):
    path = PurePosixPath(relative_path)

    if any(part.lower() in EXCLUDED_DIRECTORIES for part in path.parts[:-1]):
        return True

    return path.name.lower().endswith(EXCLUDED_SUFFIXES)
