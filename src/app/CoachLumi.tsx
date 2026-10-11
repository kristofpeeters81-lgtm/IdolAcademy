import { useId } from 'react';

/**
 * Coach "Lumi": eigen ontwerp in K-pop-stijl (#14), zelfde tekening als in het stijlvoorbeeld.
 * Kleuren komen uit CSS-variabelen (--coach-*), zodat een andere stijl haar mee kan kleuren.
 */
export function CoachLumi({ className, title = 'Coach Lumi' }: { className?: string; title?: string }) {
  const hair = `lumi-hair-${useId().replace(/:/g, '')}`;
  return (
    <svg className={className} viewBox="0 0 200 240" role="img" aria-label={title}>
      <defs>
        <linearGradient id={hair} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7ad1" />
          <stop offset="0.55" stopColor="#9b6bff" />
          <stop offset="1" stopColor="#3fd6ff" />
        </linearGradient>
      </defs>
      <path d="M42 112 C30 52 70 18 100 18 C132 18 172 50 158 112 L166 176 C150 168 140 156 134 142 L66 142 C60 156 50 168 34 176 Z" fill={`url(#${hair})`} />
      <rect x="88" y="128" width="24" height="30" rx="8" style={{ fill: 'var(--coach-skin-shade)' }} />
      <path d="M26 240 C32 188 64 164 100 164 C136 164 168 188 174 240 Z" style={{ fill: 'var(--coach-outfit)' }} />
      <path d="M26 240 C30 214 42 196 58 184 L72 240 Z M174 240 C170 214 158 196 142 184 L128 240 Z" style={{ fill: 'var(--coach-outfit-2)' }} />
      <path d="M84 165 L100 192 L116 165 Z" fill="#fff" opacity="0.9" />
      <text x="100" y="222" textAnchor="middle" fontFamily="Unbounded, sans-serif" fontWeight="900" fontSize="16" style={{ fill: 'var(--coach-accent)' }}>
        IA
      </text>
      <ellipse cx="56" cy="100" rx="7" ry="10" style={{ fill: 'var(--coach-skin-shade)' }} />
      <ellipse cx="144" cy="100" rx="7" ry="10" style={{ fill: 'var(--coach-skin-shade)' }} />
      <ellipse cx="100" cy="96" rx="44" ry="50" style={{ fill: 'var(--coach-skin)' }} />
      <path
        d="M54 92 C52 46 80 34 100 36 C126 34 150 48 147 94 C140 74 128 64 114 61 C110 74 98 80 82 82 C78 72 70 68 62 72 C58 78 56 84 54 92 Z"
        fill={`url(#${hair})`}
      />
      <path d="M70 90 Q80 84 90 89" stroke="#5a3d7a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M110 89 Q120 84 130 90" stroke="#5a3d7a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="81" cy="104" rx="8.5" ry="11" style={{ fill: 'var(--coach-eye)' }} />
      <ellipse cx="119" cy="104" rx="8.5" ry="11" style={{ fill: 'var(--coach-eye)' }} />
      <ellipse cx="81" cy="108" rx="5.5" ry="6" style={{ fill: 'var(--coach-accent)' }} opacity="0.8" />
      <ellipse cx="119" cy="108" rx="5.5" ry="6" style={{ fill: 'var(--coach-accent)' }} opacity="0.8" />
      <circle cx="84" cy="99" r="3.2" fill="#fff" />
      <circle cx="122" cy="99" r="3.2" fill="#fff" />
      <circle cx="78.5" cy="110" r="1.6" fill="#fff" />
      <circle cx="116.5" cy="110" r="1.6" fill="#fff" />
      <ellipse cx="70" cy="120" rx="8" ry="4.5" fill="#ff7aa8" opacity="0.45" />
      <ellipse cx="130" cy="120" rx="8" ry="4.5" fill="#ff7aa8" opacity="0.45" />
      <path d="M90 124 Q100 134 110 124 Q100 128 90 124 Z" fill="#d94a7a" />
      <path d="M50 104 C46 40 154 40 150 104" stroke="#2b2342" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="44" y="94" width="14" height="22" rx="6" fill="#2b2342" />
      <path d="M52 114 C56 128 70 134 84 132" stroke="#2b2342" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="86" cy="132" r="4.5" style={{ fill: 'var(--coach-accent)' }} />
      <path
        d="M132 46 l4.5 9.5 10.5 1.2 -7.8 7 2.2 10.3 -9.4 -5.3 -9.4 5.3 2.2 -10.3 -7.8 -7 10.5 -1.2 Z"
        style={{ fill: 'var(--coach-accent)' }}
        stroke="#fff"
        strokeWidth="1.5"
      />
      <path d="M146 116 l2 4 4.5 0.5 -3.3 3 1 4.4 -4.2 -2.4 -4 2.4 0.9 -4.4 -3.3 -3 4.5 -0.5 Z" fill="#fff" />
    </svg>
  );
}
