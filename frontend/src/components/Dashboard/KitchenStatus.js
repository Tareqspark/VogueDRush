import React from 'react';
import { FireIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

// Redesigned — light sky/lemon theme

const KitchenStatus = ({ stats }) => {
  const navigate = useNavigate();

  const workload = stats?.currentWorkload || {};
  const performance = stats?.performanceStats || {};

  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getQueueColor = (count) => {
    if (count === 0) return 'text-green-500';
    if (count <= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getEfficiencyColor = (efficiency) => {
    if (!efficiency) return 'text-gray-500';
    if (efficiency >= 90) return 'text-green-500';
    if (efficiency >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <FireIcon className="h-4 w-4 text-orange-500" />
          Kitchen Status
        </h3>
        <button onClick={() => navigate('/kitchen')} className="text-xs font-bold text-sky-600 hover:underline">View →</button>
      </div>

      <div className="space-y-2.5">
        {[
          { label: 'Queued', count: workload.queued_items || 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏳' },
          { label: 'Preparing', count: workload.preparing_items || 0, color: 'text-sky-600', bg: 'bg-sky-50', icon: '👨‍🍳' },
          { label: 'Ready', count: workload.ready_items || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{s.icon}</span>
              <span className="text-xs font-semibold text-slate-500">{s.label}</span>
            </div>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.count} items</span>
          </div>
        ))}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Est. Queue Time</span>
          </div>
          <span className="text-xs font-black text-slate-700">{formatTime(workload.total_queued_time)}</span>
        </div>

        {performance && (
          <div className="pt-3 mt-1 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Complete', val: `${performance.completion_rate || 0}%` },
              { label: 'Efficiency', val: `${Math.round(performance.efficiency_percentage || 0)}%` },
              { label: 'Avg Prep', val: formatTime(performance.avg_prep_time) },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 rounded-xl p-2">
                <div className="text-xs font-black text-slate-700">{m.val}</div>
                <div className="text-xs text-slate-400 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenStatus;
