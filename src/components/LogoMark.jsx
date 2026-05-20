export function LogoMark({ size = 32 }) {
  const id = `blg-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}bg`} x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B4FCC" />
          <stop offset="100%" stopColor="#0D1547" />
        </linearGradient>
        <linearGradient id={`${id}sw`} x1="4" y1="24" x2="24" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#07071a" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill={`url(#${id}bg)`} />
      <ellipse cx="16" cy="23" rx="11.5" ry="2.8" fill="#07071a" fillOpacity="0.8" />
      <rect x="6.5" y="16.5" width="4" height="7" rx="0.9" fill="white" fillOpacity="0.65" />
      <rect x="12"   y="13"   width="4" height="10.5" rx="0.9" fill="white" fillOpacity="0.8" />
      <rect x="17.5" y="9.5"  width="4" height="14" rx="0.9" fill="white" fillOpacity="0.95" />
      <path d="M 4.5 22 Q 3.5 14.5 8 10.5 Q 12.5 6.8 23.5 7.2" stroke={`url(#${id}sw)`} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="23.5" cy="7" r="3.2" fill="#10B981" />
      <circle cx="23.5" cy="7" r="1.5" fill="white" />
    </svg>
  );
}
