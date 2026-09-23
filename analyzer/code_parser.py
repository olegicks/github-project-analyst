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
            for name in node.names:
                result["imports"].append(name.name)

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                result["imports"].append(node.module)

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
                    "get", "post", "put", "patch", "delete"
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
            r"\b(?:public|private|protected|static)\s+[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\(",
        ],
        "classes": [
            r"\bclass\s+([A-Za-z_]\w*)",
            r"\bstruct\s+([A-Za-z_]\w*)",
        ],
        "imports": [
            r"^\s*import\s+([^\s;]+)",
            r"^\s*from\s+([^\s]+)\s+import",
            r'^\s*#include\s*[<"]([^>"]+)',
            r"^\s*use\s+([^;]+)",
            r'^\s*require\(["\']([^"\']+)',
        ],
    }

    for key, regexes in patterns.items():
        for regex in regexes:
            result[key].extend(re.findall(regex, source, re.MULTILINE))

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

    if path.suffix.lower() == ".py":
        result = parse_python(source)
    else:
        result = parse_generic(source)

    return {
        key: sorted(set(value))
        for key, value in result.items()
    }


def resolve_python_import(import_name, current_file, files):
    current_dir = current_file.parent

    candidates = []

    if import_name.startswith("."):
        dots = len(import_name) - len(import_name.lstrip("."))
        module = import_name[dots:].replace(".", "/")

        base = current_dir
        for _ in range(dots - 1):
            base = base.parent

        candidates.extend([
            base / f"{module}.py",
            base / module / "__init__.py",
        ])

    else:
        module = import_name.replace(".", "/")
        candidates.extend([
            Path(f"{module}.py"),
            Path(module) / "__init__.py",
        ])

    normalized = {
        Path(file).as_posix(): file
        for file in files
    }

    for candidate in candidates:
        key = candidate.as_posix().lstrip("./")

        if key in normalized:
            return normalized[key]

    return None


def build_dependency_graph(root, parsed_files):
    files = [
        Path(item["file"])
        for item in parsed_files
    ]

    graph = []
    edges = []

    for item in parsed_files:
        source_file = Path(item["file"])

        for import_name in item["imports"]:
            target = None

            if source_file.suffix.lower() == ".py":
                target = resolve_python_import(
                    import_name,
                    source_file,
                    files,
                )

            if target and target != source_file:
                edges.append({
                    "from": source_file.as_posix(),
                    "to": target.as_posix(),
                    "import": import_name,
                })

    connected = set()

    for edge in edges:
        connected.add(edge["from"])
        connected.add(edge["to"])

    for file in connected:
        graph.append(file)

    return {
        "edges": edges,
        "connected_files": sorted(graph),
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

    dependency_graph = build_dependency_graph(root, files)

    return {
        "files": files,
        "functions": functions,
        "classes": classes,
        "imports": imports,
        "endpoints": endpoints,
        "entry_points": sorted(set(entry_points)),
        "dependency_graph": dependency_graph,
    }