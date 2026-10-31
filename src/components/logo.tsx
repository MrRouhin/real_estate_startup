/** REMMO mark: an R drawn as a single stroke, with a green plot square in its corner. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M10 24.5V8.5h6.2a4.6 4.6 0 0 1 0 9.2H10m6.4 0 5.6 6.8" fill="none" stroke="var(--accent-ink)" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="23" y="6.5" width="4" height="4" rx="1.1" fill="#2f9e5c" />
    </svg>
  );
}
