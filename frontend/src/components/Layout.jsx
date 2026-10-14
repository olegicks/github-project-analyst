import { GitHubIcon, MoonIcon, SunIcon } from "./Icons.jsx";

const SOURCE_URL = "https://github.com/olegicks/github-project-analyst";

export function ThemeToggle({ theme, onToggle }) {
  const label =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      className="icon-button"
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}

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
