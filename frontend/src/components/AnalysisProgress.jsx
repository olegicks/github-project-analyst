import { useEffect, useState } from "react";

// The API answers with a single response, so stages are estimated from
// elapsed time; the last one stays active until the result arrives.
const STAGES = [
  { label: "Cloning repository", startsAt: 0 },
  { label: "Scanning files and languages", startsAt: 3 },
  { label: "Building dependency graph", startsAt: 6 },
  { label: "Generating AI analysis", startsAt: 9 },
];

const SLOW_AFTER = 25;

function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      500
    );

    return () => clearInterval(timer);
  }, []);

  return seconds;
}

export default function AnalysisProgress({ repository, onCancel }) {
  const seconds = useElapsedSeconds();

  const active = STAGES.findLastIndex((stage) => seconds >= stage.startsAt);

  return (
    <section className="card progress" aria-live="polite">
      <div className="card-head">
        <div>
          <h2>Analyzing {repository}</h2>
          <p className="card-meta">{seconds}s elapsed</p>
        </div>

        <button className="button-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="progress-bar">
        <span />
      </div>

      <ol className="stages">
        {STAGES.map((stage, index) => (
          <li
            key={stage.label}
            className={
              index < active ? "done" : index === active ? "active" : ""
            }
          >
            <span className="stage-dot" />
            {stage.label}
          </li>
        ))}
      </ol>

      {seconds >= SLOW_AFTER && (
        <p className="progress-hint">
          Still working. The first request after a period of inactivity can
          take up to a minute while the server starts.
        </p>
      )}
    </section>
  );
}
