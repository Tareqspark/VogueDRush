import React from 'react';
import { CalendarIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  completed: 'bg-slate-100 text-slate-500 border-slate-200',
};

const TodayReservations = ({ reservations, isLoading }) => {
  const navigate = useNavigate();

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) return (
    <div className="card p-5 flex items-center justify-center h-36"><LoadingSpinner size="md" /></div>
  );

  const upcoming = (reservations || []).filter(r => r.status === 'pending' || r.status === 'confirmed');

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-sky-500" />
          Today's Reservations
        </h3>
        <button onClick={() => navigate('/reservations')} className="text-xs font-bold text-sky-600 hover:underline">View All →</button>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-6">
          <CalendarIcon className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">No reservations today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.slice(0, 5).map((r) => (
            <div key={r.id}
              onClick={() => navigate('/reservations')}
              className="p-3 bg-slate-50 hover:bg-sky-50/50 border border-transparent hover:border-sky-100 rounded-xl transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">{r.customer_name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status]}`}>{r.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{formatTime(r.reservation_time)}</span>
                <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{r.party_size} guests</span>
                {r.table_number && <span>Table {r.table_number}</span>}
              </div>
            </div>
          ))}
          {upcoming.length > 5 && (
            <button onClick={() => navigate('/reservations')} className="w-full text-center text-xs font-bold text-sky-600 hover:underline py-1.5">
              +{upcoming.length - 5} more reservations
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TodayReservations;
