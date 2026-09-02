export function WaveMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 50" aria-hidden="true">
      <path
        d="M5 24c9-14 18-17 29-6 8 8 14 7 24-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M5 36c9-11 18-12 28-4 9 7 16 6 25-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".72"
      />
    </svg>
  );
}
