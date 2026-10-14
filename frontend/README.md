# Frontend

React + Vite dashboard for GitHub Project Analyst. See the [root README](../README.md) for the full project overview.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build
```

Set `VITE_API_URL` to point at the backend (defaults to `http://127.0.0.1:8000`).

## Structure

```
src/
├── App.jsx                 # page state: input, analysis request, results
├── components/
│   ├── RepoSearch.jsx      # hero, repository input, examples
│   ├── AnalysisProgress.jsx
│   ├── RepoHeader.jsx      # repository title, share and GitHub links
│   ├── Overview.jsx        # metrics, technology stack, structure, file lists
│   ├── DependencyGraph.jsx # React Flow graph and file details
│   ├── AiAnalysis.jsx      # AI analysis with copy / download
│   ├── Markdown.jsx        # lightweight Markdown renderer
│   ├── Layout.jsx          # header, footer, theme toggle
│   └── Icons.jsx
└── lib/
    ├── api.js              # backend client with timeout and error messages
    ├── graph.js            # layered graph layout and highlighting
    ├── languages.js        # language colors and percentages
    ├── repository.js       # URL parsing and ?repo= share links
    └── theme.js            # light / dark theme preference
```

A shared link such as `/?repo=owner/name` opens the dashboard and starts the analysis for that repository.
