/** umb-killer mark: a red shield with a slashing "K" — original artwork */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 1.5 29 6v9.5c0 7.6-5.4 13.2-13 15-7.6-1.8-13-7.4-13-15V6z" fill="#e02424" />
      <path d="M16 1.5 29 6v9.5c0 7.6-5.4 13.2-13 15z" fill="#b31515" />
      <path d="M11 9v14M11 16.5 20.5 9M13.5 14.5 21 23" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2 select-none">
      <LogoMark />
      <span className={`text-[17px] font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        umb<span className="text-brand-400">-killer</span>
      </span>
    </span>
  );
}
