import ast
import re
from pathlib import Path


SOURCE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".go", ".rs", ".cpp", ".c",
    ".h", ".hpp", ".cs", ".php", ".rb",
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


def read_source(path):
    try:
        return path.read_text(
            encoding="utf-8",
            errors="ignore",
        )
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

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        if not isinstance(node.func, ast.Name):
            continue

        if node.func.id not in {"path", "re_path"}:
            continue

        if not node.args:
            continue

        if isinstance(node.args[0], ast.Constant):
            result["endpoints"].append(str(node.args[0].value))

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        if not isinstance(node.func, ast.Attribute):
            continue

        if node.func.attr not in {
            "get",
            "post",
            "put",
            "patch",
            "delete",
        }:
            continue

        if not node.args:
            continue

        if not isinstance(node.args[0], ast.Constant):
            continue

        parent = node.func.value

        if isinstance(parent, ast.Name) and parent.id in {
            "app",
            "router",
            "api",
        }:
            result["endpoints"].append(str(node.args[0].value))

    return result


def parse_generic(source):
    result = {
        "functions": [],
        "classes": [],
        "imports": [],
        "endpoints": [],
    }

    function_patterns = [
        r"\bfunction\s+([A-Za-z_]\w*)",
        r"\bfunc\s+([A-Za-z_]\w*)",
        r"\b(?:public|private|protected|static)\s+[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\(",
    ]

    class_patterns = [
        r"\bclass\s+([A-Za-z_]\w*)",
        r"\bstruct\s+([A-Za-z_]\w*)",
    ]

    import_patterns = [
        r"^\s*import\s+([^\s;]+)",
        r"^\s*from\s+([^\s]+)\s+import",
        r'^\s*#include\s*[<"]([^>"]+)',
        r"^\s*use\s+([^;]+)",
        r'^\s*require\(["\']([^"\']+)',
    ]

    for pattern in function_patterns:
        result["functions"].extend(
            re.findall(pattern, source, re.MULTILINE)
        )

    for pattern in class_patterns:
        result["classes"].extend(
            re.findall(pattern, source, re.MULTILINE)
        )

    for pattern in import_patterns:
        result["imports"].extend(
            re.findall(pattern, source, re.MULTILINE)
        )

    endpoint_pattern = (
        r'\b(?:app|router)\.'
        r'(?:get|post|put|patch|delete)'
        r'\(\s*["\']([^"\']+)'
    )

    result["endpoints"].extend(
        re.findall(endpoint_pattern, source)
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
    }