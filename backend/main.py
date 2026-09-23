from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from git import Repo

app = FastAPI(title="GitHub Project Analyst")


class RepositoryRequest(BaseModel):
    url: str


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

        files = [
            file.relative_to(path).as_posix()
            for file in path.rglob("*")
            if file.is_file()
            and ".git" not in file.parts
        ]

        extensions = {}

        for file in files:
            suffix = Path(file).suffix.lower()

            if suffix:
                extensions[suffix] = extensions.get(suffix, 0) + 1

        return {
            "repository": request.url,
            "files": len(files),
            "extensions": extensions,
            "structure": files[:100],
        }