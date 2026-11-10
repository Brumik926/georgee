// Logo Slovenskej sporiteľne – „S s bodkou" (Sparkasse) v modrom kruhu s bielym lemom
export function SlspLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-[#2870ed] flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-white/80"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.66} height={size * 0.66} aria-label="Slovenská sporiteľňa">
        {/* bodka */}
        <circle cx="12" cy="3.4" r="2.6" fill="white" />
        {/* zaoblený blok s dvoma zárezmi tvoriacimi S */}
        <rect x="4" y="7.6" width="16" height="15" rx="4.2" fill="white" />
        <rect x="8.2" y="11.6" width="11.8" height="2.4" rx="1.2" fill="#2870ed" />
        <rect x="4" y="16.2" width="11.8" height="2.4" rx="1.2" fill="#2870ed" />
      </svg>
    </div>
  );
}
