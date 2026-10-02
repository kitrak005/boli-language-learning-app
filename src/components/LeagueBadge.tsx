/**
 * League badge component with custom SVG shields matching the 5 leagues:
 * I   Bronze Griffin  (0–999)     - bronze ring, eagle/griffin
 * II  Silver Phoenix  (1000–1299) - blue-silver, phoenix with laurel
 * III Gold Lion       (1300–1599) - gold, crowned lion
 * IV  Crystal Aegis   (1600–1899) - cyan, winged crystal shield
 * V   Crimson Dragon  (1900+)     - red, fire dragon
 */

import { useState } from 'react';
import type { LeagueConfig } from '../lib/leagues.ts';

interface LeagueBadgeProps {
  league: LeagueConfig;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
}

const SIZES = {
  sm: { badge: 36, font: 10, roman: 11 },
  md: { badge: 52, font: 12, roman: 14 },
  lg: { badge: 72, font: 14, roman: 18 },
  xl: { badge: 104, font: 16, roman: 24 },
};

export function LeagueBadge({ league, size = 'md', showName = false, className = '' }: LeagueBadgeProps) {
  const [imgError, setImgError] = useState(false);
  const dims = SIZES[size];

  return (
    <div className={`flex flex-col items-center gap-1.5 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center transition-transform hover:scale-105 duration-300"
        style={{
          width: dims.badge,
          height: dims.badge,
          filter: `drop-shadow(0 0 ${dims.badge / 4}px ${league.glow})`,
        }}
      >
        {!imgError ? (
          <img
            src={league.badgeImage}
            alt={league.name}
            width={dims.badge}
            height={dims.badge}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <LeagueShieldSvg league={league} width={dims.badge} height={dims.badge} romanSize={dims.roman} />
        )}
      </div>
      {showName && (
        <span
          className="text-center font-serif font-semibold tracking-wider text-xs sm:text-sm"
          style={{ color: league.accent }}
        >
          {league.name}
        </span>
      )}
    </div>
  );
}

function LeagueShieldSvg({
  league,
  width,
  height,
  romanSize,
}: {
  league: LeagueConfig;
  width: number;
  height: number;
  romanSize: number;
}) {
  const id = league.id;

  return (
    <svg
      viewBox="0 0 100 110"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      <defs>
        {/* Gradients */}
        <radialGradient id={`glow-${id}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={league.accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={league.accent} />
          <stop offset="50%" stopColor={league.accent} stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1E1E1E" />
        </linearGradient>

        <linearGradient id={`gold-ring-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={league.accent} />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor={league.accent} />
        </linearGradient>
      </defs>

      {/* Ambient background glow */}
      <circle cx="50" cy="52" r="44" fill={`url(#glow-${id})`} />

      {/* Outer decorative ring / shield */}
      {id === 1 && (
        /* Bronze Griffin - Bronze ring with wings */
        <g>
          <circle cx="50" cy="52" r="42" stroke={league.accent} strokeWidth="3" fill="#14110E" />
          <circle cx="50" cy="52" r="37" stroke={league.accent} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          {/* Griffin Wing Left */}
          <path d="M 22 52 C 14 36 28 26 38 34 C 32 38 28 44 26 52 Z" fill={league.accent} opacity="0.75" />
          {/* Griffin Wing Right */}
          <path d="M 78 52 C 86 36 72 26 62 34 C 68 38 72 44 74 52 Z" fill={league.accent} opacity="0.75" />
          {/* Eagle beak / crest */}
          <path d="M 46 36 L 50 30 L 54 36 L 50 39 Z" fill={league.accent} />
        </g>
      )}

      {id === 2 && (
        /* Silver Phoenix - Blue-silver with laurel */
        <g>
          <circle cx="50" cy="52" r="42" stroke={league.accent} strokeWidth="3.5" fill="#0C131D" />
          {/* Laurel Wreath */}
          <path d="M 24 64 C 18 46 26 32 36 24 C 34 30 36 38 40 44" stroke={league.accent} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d="M 76 64 C 82 46 74 32 64 24 C 66 30 64 38 60 44" stroke={league.accent} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          {/* Phoenix Rising Flames */}
          <path d="M 50 20 C 44 28 46 36 50 42 C 54 36 56 28 50 20 Z" fill={league.accent} />
          <path d="M 40 32 C 34 38 36 44 42 46 C 40 40 40 36 40 32 Z" fill={league.accent} opacity="0.8" />
          <path d="M 60 32 C 66 38 64 44 58 46 C 60 40 60 36 60 32 Z" fill={league.accent} opacity="0.8" />
        </g>
      )}

      {id === 3 && (
        /* Gold Lion - Crowned Lion shield */
        <g>
          {/* Shield silhouette */}
          <path
            d="M 50 8 L 84 20 L 84 56 C 84 82 50 98 50 98 C 50 98 16 82 16 56 L 16 20 Z"
            fill="#1A150A"
            stroke={league.accent}
            strokeWidth="3.5"
          />
          <path
            d="M 50 16 L 76 26 L 76 54 C 76 74 50 88 50 88 C 50 88 24 74 24 54 L 24 26 Z"
            stroke={league.accent}
            strokeWidth="1"
            opacity="0.4"
          />
          {/* Crown atop */}
          <path d="M 38 28 L 44 34 L 50 24 L 56 34 L 62 28 L 60 38 L 40 38 Z" fill={league.accent} />
          {/* Lion Mane flourish */}
          <circle cx="50" cy="48" r="7" stroke={league.accent} strokeWidth="2" fill="none" opacity="0.8" />
        </g>
      )}

      {id === 4 && (
        /* Crystal Aegis - Cyan winged crystal shield */
        <g>
          {/* Faceted Aegis Shield */}
          <polygon points="50,6 88,24 76,82 50,102 24,82 12,24" fill="#061A24" stroke={league.accent} strokeWidth="3" />
          {/* Crystal facet lines */}
          <line x1="50" y1="6" x2="50" y2="102" stroke={league.accent} strokeWidth="1.5" opacity="0.7" />
          <line x1="12" y1="24" x2="88" y2="24" stroke={league.accent} strokeWidth="1" opacity="0.5" />
          <line x1="24" y1="82" x2="76" y2="82" stroke={league.accent} strokeWidth="1" opacity="0.5" />
          <polygon points="50,24 70,52 50,80 30,52" fill={league.accent} fillOpacity="0.2" stroke={league.accent} strokeWidth="1.5" />
        </g>
      )}

      {id === 5 && (
        /* Crimson Dragon - Red fire dragon */
        <g>
          {/* Crest shield */}
          <path
            d="M 50 4 L 90 22 C 90 60 76 86 50 106 C 24 86 10 60 10 22 Z"
            fill="#1E0A0A"
            stroke={league.accent}
            strokeWidth="4"
          />
          {/* Dragon Horns */}
          <path d="M 26 18 C 30 8 40 12 44 24" stroke={league.accent} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 74 18 C 70 8 60 12 56 24" stroke={league.accent} strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Fiery dragon breath / wings */}
          <path d="M 22 42 C 14 54 28 66 36 60 C 30 56 26 50 26 42 Z" fill={league.accent} opacity="0.9" />
          <path d="M 78 42 C 86 54 72 66 64 60 C 70 56 74 50 74 42 Z" fill={league.accent} opacity="0.9" />
          {/* Dragon Eye / Core */}
          <circle cx="50" cy="38" r="4" fill="#FFE57F" />
        </g>
      )}

      {/* Inner Roman Numeral Medallion */}
      <circle cx="50" cy="62" r="16" fill="#0A0A0A" stroke={league.accent} strokeWidth="2" opacity="0.95" />
      <text
        x="50"
        y="68"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={league.accent}
        fontFamily="'Cormorant Garamond', 'Cinzel', serif"
        fontWeight="800"
        fontSize={romanSize}
        letterSpacing="0.05em"
      >
        {league.roman}
      </text>
    </svg>
  );
}
