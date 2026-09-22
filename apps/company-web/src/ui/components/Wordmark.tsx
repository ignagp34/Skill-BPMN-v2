type WordmarkProps = { small?: boolean };

export function Wordmark({ small }: WordmarkProps) {
  return (
    <span className={"wordmark" + (small ? " wordmark-small" : "")}>
      <span className="wordmark-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="100%" height="100%">
          <circle cx="5" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="9.5" y="8.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.6" rx="1" />
          <path d="M16.5 12 L20 12" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <circle cx="21" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span className="wordmark-text">
        BPMN <em>generator</em>
      </span>
    </span>
  );
}
