export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <rect x="6" y="6" width="9" height="9" rx="2" fill="var(--accent-ink)" />
      <rect x="17" y="6" width="9" height="9" rx="2" fill="var(--accent-ink)" opacity=".55" />
      <rect x="6" y="17" width="9" height="9" rx="2" fill="var(--accent-ink)" opacity=".55" />
      <rect x="17" y="17" width="9" height="9" rx="2" fill="#2f9e5c" />
    </svg>
  );
}
