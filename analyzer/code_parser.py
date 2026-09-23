import ast
import re
from pathlib import Path


SOURCE_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".go",
    ".rs",
    ".cpp",
    ".c",
    ".h",
    ".hpp",
    ".cs",
    ".php",
    ".rb",
}


def read_source(path: Path):
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

    patterns = [
        r'@(app|router)\.(get|post|put|patch|delete)\(["\']([^"\']+)',
        r'path\(["\']([^"\']+)',
        r're_path\(["\']([^"\']+)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, source):
            result["endpoints"].append(match.group(match.lastindex))

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
        r'^\s*use\s+([^;]+)',
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
        r'\.(get|post|put|patch|delete)\(\s*["\']([^"\']+)'
    )

    for match in re.finditer(endpoint_pattern, source):
        result["endpoints"].append(match.group(2))

    return result


def analyze_source_file(path: Path):
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


def analyze_source_tree(root: Path):
    files = []
    functions = []
    classes = []
    imports = []
    endpoints = []

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
    }