import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

// Marks an order entered after the fact (POST /orders/backdate). Its created_at is
// when the sale happened, so lists sort it among that day's orders, not today's.
export function BackdatedBadge({ order }) {
  if (!order?.is_backdated) return null;
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-semibold">
      <ClockIcon className="h-3 w-3" /> {order.is_quick_entry ? 'Backdated · quick' : 'Backdated'}
    </span>
  );
}

// When a list shows only the time, a backdated order needs its date too.
export function orderTimeLabel(order) {
  const at = new Date(order.created_at);
  return order.is_backdated
    ? at.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// The reason and who entered it, for order detail views.
export function BackdateNote({ order }) {
  if (!order?.is_backdated) return null;
  const enteredAt = order.backdate_entered_at ? new Date(order.backdate_entered_at).toLocaleString() : null;
  return (
    <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
      <div className="font-bold">
        {order.is_quick_entry ? 'Backdated quick entry · lump sum, no item breakdown' : 'Backdated entry'}
      </div>
      <div className="text-xs mt-0.5">
        Sale dated {new Date(order.created_at).toLocaleString()}
        {order.backdated_by_name ? ` · entered by ${order.backdated_by_name}` : ''}
        {enteredAt ? ` on ${enteredAt}` : ''}
      </div>
      {order.backdate_reason && (
        <div className="mt-1"><span className="font-semibold">Reason: </span>{order.backdate_reason}</div>
      )}
    </div>
  );
}
