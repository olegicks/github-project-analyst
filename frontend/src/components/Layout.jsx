import { GitHubIcon } from "./Icons.jsx";

const SOURCE_URL = "https://github.com/olegicks/github-project-analyst";

export function Header({ children }) {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <span>Project Analyst</span>
      </a>

      <nav className="header-actions">
        {children}

        <a
          className="icon-button"
          href={SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Source code on GitHub"
          title="Source code on GitHub"
        >
          <GitHubIcon size={18} />
        </a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <span>
        GitHub Project Analyst · built with FastAPI, React and React Flow
      </span>

      <a href={SOURCE_URL} target="_blank" rel="noreferrer">
        Source
      </a>
    </footer>
  );
}
