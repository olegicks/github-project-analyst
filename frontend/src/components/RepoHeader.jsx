import { useState } from "react";
import { shareLink } from "../lib/repository.js";
import { ExternalIcon, GitHubIcon, LinkIcon } from "./Icons.jsx";

export default function RepoHeader({ repository }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink(repository));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="repo-header">
      <div className="repo-title">
        <span className="repo-avatar">
          <GitHubIcon size={20} />
        </span>

        <div>
          <span className="repo-owner">{repository.owner} /</span>
          <h2>{repository.name}</h2>
        </div>
      </div>

      <div className="repo-actions">
        <button className="button-secondary" type="button" onClick={copyLink}>
          <LinkIcon size={14} />
          {copied ? "Link copied" : "Share"}
        </button>

        <a
          className="button-secondary"
          href={repository.url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalIcon size={14} />
          Open on GitHub
        </a>
      </div>
    </div>
  );
}
