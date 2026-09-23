import ast
import re
from pathlib import Path


SOURCE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".go", ".rs", ".cpp", ".c",
    ".h", ".hpp", ".cs", ".php", ".rb",
}

ENTRY_POINT_NAMES = {
    "main.py", "main.js", "main.ts", "main.go", "main.rs",
    "index.js", "index.ts", "index.jsx", "index.tsx",
    "app.py", "app.js", "app.ts",
    "server.js", "server.ts",
    "manage.py", "Program.cs", "Main.java",
}

LANGUAGES = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cpp": "C++",
    ".c": "C",
    ".h": "C/C++",
    ".hpp": "C++",
    ".cs": "C#",
    ".php": "PHP",
    ".rb": "Ruby",
}


def read_source(path):
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def parse_python(source):
    result = {
        "functions": [],
        "classes": [],
        "imports": [],
        "endpoints": [],
    }

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return result

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            result["functions"].append(node.name)

        elif isinstance(node, ast.ClassDef):
            result["classes"].append(node.name)

        elif isinstance(node, ast.Import):
            result["imports"].extend(name.name for name in node.names)

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                result["imports"].append(
                    "." * node.level + node.module
                )

        elif isinstance(node, ast.Call):
            if (
                isinstance(node.func, ast.Name)
                and node.func.id in {"path", "re_path"}
                and node.args
                and isinstance(node.args[0], ast.Constant)
            ):
                result["endpoints"].append(str(node.args[0].value))

            elif (
                isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id in {"app", "router", "api"}
                and node.func.attr in {
                    "get",
                    "post",
                    "put",
                    "patch",
                    "delete",
                }
                and node.args
                and isinstance(node.args[0], ast.Constant)
            ):
                result["endpoints"].append(str(node.args[0].value))

    return result


def parse_generic(source):
    result = {
        "functions": [],
        "classes": [],
        "imports": [],
        "endpoints": [],
    }

    patterns = {
        "functions": [
            r"\bfunction\s+([A-Za-z_]\w*)",
            r"\bfunc\s+([A-Za-z_]\w*)",
            r"\b(?:public|private|protected|static)\s+"
            r"[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\(",
        ],
        "classes": [
            r"\bclass\s+([A-Za-z_]\w*)",
            r"\bstruct\s+([A-Za-z_]\w*)",
        ],
        "imports": [
            r'^\s*import\s+(?:.+?\s+from\s+)?["\']([^"\']+)["\']',
            r'^\s*from\s+["\']([^"\']+)["\']',
            r"^\s*from\s+([^\s]+)\s+import",
            r'^\s*#include\s*[<"]([^>"]+)',
            r"^\s*use\s+([^;]+)",
            r'^\s*require\(["\']([^"\']+)',
            r'^\s*import\s+([A-Za-z_][\w.]*)',
        ],
    }

    for key, regexes in patterns.items():
        for regex in regexes:
            result[key].extend(
                re.findall(regex, source, re.MULTILINE)
            )

    result["endpoints"].extend(
        re.findall(
            r'\b(?:app|router)\.'
            r'(?:get|post|put|patch|delete)'
            r'\(\s*["\']([^"\']+)',
            source,
        )
    )

    return result


def analyze_source_file(path):
    source = read_source(path)

    if not source:
        return {
            "functions": [],
            "classes": [],
            "imports": [],
            "endpoints": [],
        }

    result = (
        parse_python(source)
        if path.suffix.lower() == ".py"
        else parse_generic(source)
    )

    return {
        key: sorted(set(value))
        for key, value in result.items()
    }


def normalize_files(files):
    return {
        Path(file).as_posix().lstrip("./"): file
        for file in files
    }


def resolve_python_import(name, current_file, files):
    mapping = normalize_files(files)
    base = current_file.parent

    if name.startswith("."):
        dots = len(name) - len(name.lstrip("."))
        module = name[dots:].replace(".", "/")

        for _ in range(max(dots - 1, 0)):
            base = base.parent
    else:
        module = name.replace(".", "/")
        base = Path(".")

    target = base / module

    candidates = [
        target.with_suffix(".py"),
        target / "__init__.py",
    ]

    for candidate in candidates:
        key = candidate.as_posix().lstrip("./")

        if key in mapping:
            return mapping[key]

    return None


def resolve_relative_import(name, current_file, files):
    if not name.startswith("."):
        return None

    mapping = normalize_files(files)
    target = current_file.parent / name

    candidates = [
        Path(f"{target}"),
        Path(f"{target}.js"),
        Path(f"{target}.jsx"),
        Path(f"{target}.ts"),
        Path(f"{target}.tsx"),
        target / "index.js",
        target / "index.jsx",
        target / "index.ts",
        target / "index.tsx",
    ]

    for candidate in candidates:
        key = candidate.as_posix().lstrip("./")

        if key in mapping:
            return mapping[key]

    return None


def resolve_include(name, current_file, files):
    if not name or name.startswith("<"):
        return None

    mapping = normalize_files(files)

    candidates = [
        current_file.parent / name,
        Path(name),
    ]

    for candidate in candidates:
        key = candidate.as_posix().lstrip("./")

        if key in mapping:
            return mapping[key]

    return None


def resolve_java_import(name, files):
    if not name:
        return None

    if name.startswith(("java.", "javax.")):
        return None

    mapping = normalize_files(files)
    key = f"{name.replace('.', '/')}.java"

    return mapping.get(key)


def resolve_rust_import(name, files):
    if not name.startswith("crate::"):
        return None

    mapping = normalize_files(files)
    module = name.removeprefix("crate::").replace("::", "/")
    target = Path(module)

    candidates = [
        target.with_suffix(".rs"),
        target / "mod.rs",
    ]

    for candidate in candidates:
        key = candidate.as_posix().lstrip("./")

        if key in mapping:
            return mapping[key]

    return None


def resolve_dependency(name, source_file, files):
    suffix = source_file.suffix.lower()

    if suffix == ".py":
        return resolve_python_import(
            name,
            source_file,
            files,
        )

    if suffix in {".js", ".jsx", ".ts", ".tsx"}:
        return resolve_relative_import(
            name,
            source_file,
            files,
        )

    if suffix in {".c", ".h", ".cpp", ".hpp"}:
        return resolve_include(
            name,
            source_file,
            files,
        )

    if suffix == ".java":
        return resolve_java_import(
            name,
            files,
        )

    if suffix == ".rs":
        return resolve_rust_import(
            name,
            files,
        )

    return None


def build_dependency_graph(parsed_files):
    files = [
        Path(item["file"])
        for item in parsed_files
    ]

    nodes = []
    edges = []
    seen_edges = set()

    for item in parsed_files:
        path = Path(item["file"])

        nodes.append({
            "id": path.as_posix(),
            "label": path.name,
            "file": path.as_posix(),
            "language": LANGUAGES.get(
                path.suffix.lower(),
                "Other",
            ),
            "functions": len(item["functions"]),
            "classes": len(item["classes"]),
            "imports": len(item["imports"]),
        })

        for import_name in item["imports"]:
            target = resolve_dependency(
                import_name,
                path,
                files,
            )

            if not target or target == path:
                continue

            source_id = path.as_posix()
            target_id = target.as_posix()
            edge_key = (source_id, target_id)

            if edge_key in seen_edges:
                continue

            seen_edges.add(edge_key)

            edges.append({
                "id": f"{source_id}->{target_id}",
                "source": source_id,
                "target": target_id,
                "import": import_name,
            })

    connected_files = sorted(
        {
            edge["source"]
            for edge in edges
        }
        |
        {
            edge["target"]
            for edge in edges
        }
    )

    return {
        "nodes": nodes,
        "edges": edges,
        "connected_files": connected_files,
    }


def analyze_source_tree(root):
    files = []
    functions = []
    classes = []
    imports = []
    endpoints = []
    entry_points = []

    for path in root.rglob("*"):
        if (
            not path.is_file()
            or ".git" in path.parts
            or path.suffix.lower() not in SOURCE_EXTENSIONS
        ):
            continue

        relative = path.relative_to(root).as_posix()
        analysis = analyze_source_file(path)

        files.append({
            "file": relative,
            **analysis,
        })

        if path.name in ENTRY_POINT_NAMES:
            entry_points.append(relative)

        functions.extend(
            (relative, name)
            for name in analysis["functions"]
        )

        classes.extend(
            (relative, name)
            for name in analysis["classes"]
        )

        imports.extend(
            (relative, name)
            for name in analysis["imports"]
        )

        endpoints.extend(
            (relative, endpoint)
            for endpoint in analysis["endpoints"]
        )

    return {
        "files": files,
        "functions": functions,
        "classes": classes,
        "imports": imports,
        "endpoints": endpoints,
        "entry_points": sorted(set(entry_points)),
        "dependency_graph": build_dependency_graph(files),
    }