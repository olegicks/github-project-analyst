const OWNER = /^[A-Za-z0-9-]+$/;
const NAME = /^[A-Za-z0-9_.-]+$/;

// Accepts "owner/repo", "github.com/owner/repo" or a full GitHub URL
// (with optional .git suffix, /tree/... path, query or hash).
export function parseRepository(input) {
  const value = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?github\.com\//i, "")
    .replace(/[?#].*$/, "");

  const [owner, rawName] = value.split("/");
  const name = rawName?.replace(/\.git$/i, "");

  if (!owner || !name || !OWNER.test(owner) || !NAME.test(name)) {
    return null;
  }

  return {
    owner,
    name,
    slug: `${owner}/${name}`,
    url: `https://github.com/${owner}/${name}`,
  };
}

export function readSharedRepository() {
  const repo = new URLSearchParams(window.location.search).get("repo");
  return repo ? parseRepository(repo) : null;
}

export function shareLink(repository) {
  const url = new URL(window.location.href);
  url.search = `?repo=${repository.slug}`;
  url.hash = "";
  return url.toString();
}

export function updateSharedRepository(repository) {
  window.history.replaceState(null, "", shareLink(repository));
}
