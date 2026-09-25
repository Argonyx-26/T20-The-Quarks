export function VisionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="4" width="10" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="6" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M11 6.2L14 4.8V10.2L11 8.8" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export function EndpointIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="2" y="2" width="11" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <path d="M0.5 12.5h14M4 12.5V10M11 12.5V10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function NetworkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="3" cy="3.5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="4.5" r="1.6" fill="currentColor" />
      <circle cx="6.5" cy="12" r="1.6" fill="currentColor" />
      <path d="M3 3.5L12 4.5M3 3.5L6.5 12M12 4.5L6.5 12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
    </svg>
  );
}

export function VisionVisual({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 180 120" className="h-full w-full" aria-hidden="true">
      <g stroke={color} strokeOpacity="0.18" strokeWidth="1" fill="none">
        <path d="M0 0 L90 60 M180 0 L90 60 M0 120 L90 60 M180 120 L90 60" />
      </g>
      <g stroke={color} strokeOpacity="0.8" strokeWidth="1.2" fill="none">
        <rect x="70" y="38" width="34" height="46" />
        <path d="M70 38 h8 M96 38 h8 M70 84 h8 M96 84 h8" />
      </g>
      <g stroke={color} strokeOpacity="0.55" strokeWidth="1.2" fill="none">
        <circle cx="87" cy="55" r="6" />
        <path d="M77 78 C77 66, 97 66, 97 78" />
      </g>
    </svg>
  );
}

export function EndpointVisual({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 180 120" className="h-full w-full" aria-hidden="true">
      <g stroke={color} strokeOpacity="0.8" strokeWidth="1.2" fill="none">
        <rect x="58" y="42" width="64" height="36" rx="3" />
        <path d="M70 54h14M70 62h20M70 70h10" strokeOpacity="0.55" />
      </g>
      <g stroke={color} strokeOpacity="0.4" strokeWidth="1" fill="none">
        <path d="M58 50 H30 V30 M122 50 H150 V30 M90 78 V100 H60 M90 78 V100 H120" />
      </g>
      <g fill={color} fillOpacity="0.7">
        <circle cx="30" cy="30" r="2" />
        <circle cx="150" cy="30" r="2" />
        <circle cx="60" cy="100" r="2" />
        <circle cx="120" cy="100" r="2" />
      </g>
    </svg>
  );
}

export function NetworkVisual({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 180 120" className="h-full w-full" aria-hidden="true">
      <line x1="14" y1="96" x2="166" y2="96" stroke={color} strokeOpacity="0.15" strokeWidth="1" />
      <path
        d="M14 78 C 40 82, 55 88, 70 60 C 82 40, 96 28, 112 46 C 126 62, 140 50, 166 54"
        stroke={color}
        strokeOpacity="0.7"
        strokeWidth="1.4"
        fill="none"
      />
      <circle cx="70" cy="60" r="2.4" fill={color} fillOpacity="0.6" />
      <circle cx="112" cy="46" r="3.4" fill={color} />
      <circle cx="166" cy="54" r="2.4" fill={color} fillOpacity="0.6" />
      <line x1="112" y1="46" x2="112" y2="96" stroke={color} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  );
}
