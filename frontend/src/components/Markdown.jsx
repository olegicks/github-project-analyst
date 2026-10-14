function renderInlineMarkdown(text) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function cleanHeading(text) {
  return text.replace(/^\d+\.\s*/, "");
}

function MarkdownTable({ lines }) {
  if (lines.length < 2) {
    return null;
  }

  const parseRow = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);

  const rows = lines
    .slice(2)
    .map(parseRow)
    .filter((row) => row.some((cell) => cell.length > 0));

  return (
    <div className="markdown-table-wrapper">
      <table className="markdown-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{renderInlineMarkdown(header)}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((_, cellIndex) => (
                <td key={cellIndex}>
                  {renderInlineMarkdown(row[cellIndex] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const HEADINGS = [
  { prefix: "#### ", tag: "h3", className: "markdown-h3" },
  { prefix: "### ", tag: "h2", className: "markdown-main-heading" },
  { prefix: "## ", tag: "h2", className: "markdown-main-heading" },
  { prefix: "# ", tag: "h2", className: "markdown-main-heading" },
];

const isBullet = (line) => line.startsWith("- ") || line.startsWith("* ");
const isNumbered = (line) => /^\d+\.\s/.test(line);

export default function MarkdownContent({ content }) {
  if (!content) {
    return <div className="markdown-empty">No AI analysis available.</div>;
  }

  const lines = content.split(/\r?\n/);
  const elements = [];

  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === "---" || trimmed === "\\---") {
      elements.push(
        <hr className="markdown-divider" key={elements.length} />
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines = [];
      index += 1;

      while (
        index < lines.length &&
        !lines[index].trim().startsWith("```")
      ) {
        codeLines.push(lines[index]);
        index += 1;
      }

      elements.push(
        <pre className="markdown-code" key={elements.length}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      index += 1;
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      index + 1 < lines.length &&
      lines[index + 1].trim().match(/^\|?[\s|:-]+\|?$/)
    ) {
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }

      elements.push(
        <MarkdownTable lines={tableLines} key={elements.length} />
      );
      continue;
    }

    const heading = HEADINGS.find(({ prefix }) =>
      trimmed.startsWith(prefix)
    );

    if (heading) {
      const Tag = heading.tag;

      elements.push(
        <Tag className={heading.className} key={elements.length}>
          {renderInlineMarkdown(
            cleanHeading(trimmed.slice(heading.prefix.length))
          )}
        </Tag>
      );
      index += 1;
      continue;
    }

    if (isBullet(trimmed) || isNumbered(trimmed)) {
      const matches = isBullet(trimmed) ? isBullet : isNumbered;
      const items = [];

      while (index < lines.length && matches(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^(?:[-*]|\d+\.)\s/, ""));
        index += 1;
      }

      elements.push(
        <ul className="markdown-list" key={elements.length}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    elements.push(
      <p className="markdown-paragraph" key={elements.length}>
        {renderInlineMarkdown(trimmed)}
      </p>
    );
    index += 1;
  }

  return <div className="markdown-content">{elements}</div>;
}
