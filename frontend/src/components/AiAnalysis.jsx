import { useState } from "react";
import { CopyIcon, DownloadIcon } from "./Icons.jsx";
import MarkdownContent from "./Markdown.jsx";
import { Card } from "./Overview.jsx";

function download(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function AiAnalysisCard({ content, repository }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const actions = content && (
    <div className="card-actions">
      <button className="button-secondary" type="button" onClick={copy}>
        <CopyIcon size={14} />
        {copied ? "Copied" : "Copy"}
      </button>

      <button
        className="button-secondary"
        type="button"
        onClick={() =>
          download(
            `${repository.owner}-${repository.name}-analysis.md`,
            `# ${repository.slug}\n\n${content}\n`
          )
        }
      >
        <DownloadIcon size={14} />
        Markdown
      </button>
    </div>
  );

  return (
    <Card
      title="AI analysis"
      meta="Generated from the facts collected above"
      className="analysis"
      actions={actions}
    >
      <MarkdownContent content={content} />
    </Card>
  );
}
