import React from 'react';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const TableStatus = ({ stats }) => {
  const navigate = useNavigate();

  const occupancy = stats?.todayOccupancy || {};
  const statusStats = stats?.statusStats || [];

  const getOccupancyColor = (rate) => {
    if (rate >= 80) return 'text-red-500';
    if (rate >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = (status) => {
    const icons = {
      available: '🟢',
      occupied: '🔴',
      reserved: '🟡',
    };
    return icons[status] || '⚪';
  };

  const rate = occupancy.occupancy_rate || 0;
  const rateColor = rate >= 80 ? 'text-rose-600' : rate >= 60 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <RectangleGroupIcon className="h-4 w-4 text-sky-500" />
          Table Status
        </h3>
        <button onClick={() => navigate('/tables')} className="text-xs font-bold text-sky-600 hover:underline">View →</button>
      </div>

      {/* Occupancy donut-style indicator */}
      <div className="flex items-center gap-4 mb-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
        <div className={`text-3xl font-black ${rateColor}`}>{rate}%</div>
        <div>
          <div className="text-xs font-black text-slate-700">Occupancy Rate</div>
          <div className="text-xs text-slate-400">{occupancy.occupied_tables || 0} of {occupancy.total_tables || 0} tables</div>
        </div>
      </div>

      <div className="space-y-2">
        {statusStats.map((s) => (
          <div key={s.status} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{getStatusIcon(s.status)}</span>
              <span className="text-xs font-semibold text-slate-500 capitalize">{s.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">{s.count}</span>
              <span className="text-xs text-slate-400">({s.total_capacity || 0} seats)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableStatus;
