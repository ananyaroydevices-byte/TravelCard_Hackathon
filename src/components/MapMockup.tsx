import React from 'react';
import { MapPin } from 'lucide-react';

interface MapMockupProps {
  destinations: string[];
}

export function MapMockup({ destinations }: MapMockupProps) {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-blue-400/20 to-teal-400/20 rounded-xl border border-white/20 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          {/* Simplified world map outline */}
          <path
            d="M 50 100 L 120 80 L 150 120 L 200 110 L 280 140 L 320 100 L 350 150 L 330 200 L 250 220 L 150 200 L 80 180 Z"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />

          {/* Path between destinations */}
          {destinations.length > 1 && (
            <path
              d={`M ${50 + Math.random() * 300} ${50 + Math.random() * 200} ${destinations
                .map(() => `L ${50 + Math.random() * 300} ${50 + Math.random() * 200}`)
                .join(' ')}`}
              stroke="rgba(107, 93, 214, 0.5)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
          )}

          {/* Destination markers */}
          {destinations.map((_, idx) => {
            const x = 80 + (idx * 300) / Math.max(destinations.length - 1, 1);
            const y = 100 + Math.sin(idx) * 50;
            return (
              <g key={idx}>
                <circle cx={x} cy={y} r="8" fill="rgba(107, 93, 214, 0.3)" stroke="rgb(107, 93, 214)" strokeWidth="2" />
                <circle cx={x} cy={y} r="4" fill="rgb(107, 93, 214)" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2">
        <MapPin className="text-primary/50" size={32} />
        <p className="text-white/50 text-xs text-center px-4">{destinations.join(' → ')}</p>
      </div>
    </div>
  );
}
