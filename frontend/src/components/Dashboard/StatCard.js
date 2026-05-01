import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

const ICON_THEMES = {
  sky:     { bg: 'bg-sky-100',     icon: 'text-sky-600',     ring: 'ring-sky-200' },
  lemon:   { bg: 'bg-amber-100',   icon: 'text-amber-600',   ring: 'ring-amber-200' },
  emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', ring: 'ring-emerald-200' },
  rose:    { bg: 'bg-rose-100',    icon: 'text-rose-500',    ring: 'ring-rose-200' },
  violet:  { bg: 'bg-violet-100',  icon: 'text-violet-600',  ring: 'ring-violet-200' },
};

// Map legacy color props to new themes
const COLOR_MAP = {
  'sky': 'sky',
  'accent-secondary': 'lemon',
  'status-occupied': 'rose',
  'status-preparing': 'sky',
  'status-available': 'emerald',
};

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, subtitle, color = 'sky' }) => {
  const theme = ICON_THEMES[COLOR_MAP[color] || color] || ICON_THEMES.sky;
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div className="card p-5 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-black text-slate-800 leading-none">{value}</p>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-400 font-medium">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="mt-3 flex items-center gap-1.5">
              {isPositive && <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-emerald-500" />}
              {isNegative && <ArrowTrendingDownIcon className="h-3.5 w-3.5 text-rose-500" />}
              <span className={`text-xs font-semibold ${
                isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-500' : 'text-slate-400'
              }`}>
                {Math.abs(trend)}% {trendLabel}
              </span>
            </div>
          )}
        </div>

        <div className={`ml-4 p-3 ${theme.bg} rounded-2xl ring-4 ring-offset-0 ${theme.ring} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`h-5 w-5 ${theme.icon}`} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;


