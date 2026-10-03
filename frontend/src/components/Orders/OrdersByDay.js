import React, { useState } from 'react';
import { useQuery, useInfiniteQuery } from 'react-query';
import { ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const money = (n) => `৳${Math.round(n).toLocaleString()}`;
// 'YYYY-MM-DD' → "Fri 3 Oct", read as a calendar date so no time zone shifts it.
const dayLabel = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
};
const salesOf = (orders) => orders
  .filter(o => o.status === 'done')
  .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

// The order list for admins and managers, split into the current business day,
// orders still open from earlier days, and a collapsed list of previous days.
// Business days run 06:00–06:00 and are decided by the server (see GET /orders
// scope/day and GET /orders/days). Each page supplies its own row via renderOrder;
// `matches` is an optional client-side search over loaded rows.
export default function OrdersByDay({ params, renderOrder, matches = () => true, refetchInterval = 15000 }) {
  const { api } = useAuth();
  const [showPrevious, setShowPrevious] = useState(false);

  // Keys start with 'orders' so the pages' existing invalidateQueries('orders') refresh these too.
  const fetchOrders = (extra) => api.get('/orders', { params: { ...params, ...extra, limit: 200 } }).then(r => r.data);
  const today = useQuery(['orders', 'today', params], () => fetchOrders({ scope: 'today' }), { refetchInterval });
  const openEarlier = useQuery(['orders', 'open-earlier', params], () => fetchOrders({ scope: 'open_earlier' }), { refetchInterval: 60000 });
  const days = useInfiniteQuery(
    ['orders', 'days', params],
    ({ pageParam }) => api.get('/orders/days', { params: { ...params, before: pageParam, limit: 14 } }).then(r => r.data),
    {
      enabled: showPrevious,
      getNextPageParam: (last) => (last.has_more ? last.days[last.days.length - 1].day : undefined),
    }
  );

  const todayOrders = today.data?.orders || [];
  const earlierOpen = openEarlier.data?.orders || [];
  const previousDays = days.data?.pages.flatMap(p => p.days) || [];

  return (
    <div className="space-y-3">
      <section className="card p-3 sm:p-4 space-y-2">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-black text-slate-800">
            Today{today.data?.business_day ? ` · ${dayLabel(today.data.business_day)}` : ''}
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            {todayOrders.length} orders · {money(salesOf(todayOrders))} sales
          </span>
        </header>
        <OrderRows query={today} orders={todayOrders.filter(matches)} renderOrder={renderOrder} empty="No orders yet today" />
      </section>

      {earlierOpen.length > 0 && (
        <section className="card p-3 sm:p-4 space-y-2 border border-amber-300 bg-amber-50/40">
          <header className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0" />
            <h2 className="font-black text-amber-800">Still open from earlier days</h2>
            <span className="ml-auto text-xs font-bold text-amber-700">{earlierOpen.length}</span>
          </header>
          <OrderRows query={openEarlier} orders={earlierOpen.filter(matches)} renderOrder={renderOrder} empty="No matching orders" />
        </section>
      )}

      <section className="card p-3 sm:p-4 space-y-2">
        <button type="button" onClick={() => setShowPrevious(v => !v)} className="w-full flex items-center justify-between">
          <h2 className="font-black text-slate-800">Previous days</h2>
          {showPrevious
            ? <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            : <ChevronRightIcon className="h-5 w-5 text-slate-400" />}
        </button>
        {showPrevious && (
          days.isLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : previousDays.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No orders from earlier days</p>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {previousDays.map(d => (
                  <DayGroup key={d.day} summary={d} params={params} fetchOrders={fetchOrders} renderOrder={renderOrder} matches={matches} />
                ))}
              </div>
              {days.hasNextPage && (
                <button type="button" onClick={() => days.fetchNextPage()} disabled={days.isFetchingNextPage} className="btn btn-secondary btn-sm w-full">
                  {days.isFetchingNextPage ? 'Loading…' : 'Load older days'}
                </button>
              )}
            </>
          )
        )}
      </section>
    </div>
  );
}

// One previous day: a summary line that loads that day's orders when opened.
function DayGroup({ summary, params, fetchOrders, renderOrder, matches }) {
  const [open, setOpen] = useState(false);
  const query = useQuery(['orders', 'day', summary.day, params], () => fetchOrders({ day: summary.day }), { enabled: open });

  return (
    <div className="py-2">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex flex-wrap items-center gap-x-2 gap-y-1 text-left">
        {open
          ? <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          : <ChevronRightIcon className="h-4 w-4 text-slate-400" />}
        <span className="font-bold text-slate-700 text-sm">{dayLabel(summary.day)}</span>
        <span className="text-xs text-slate-500">{summary.orders} orders · {money(summary.sales)} sales</span>
        {summary.open_orders > 0 && (
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2">
            {summary.open_orders} open
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2">
          <OrderRows query={query} orders={(query.data?.orders || []).filter(matches)} renderOrder={renderOrder} empty="No matching orders" />
        </div>
      )}
    </div>
  );
}

function OrderRows({ query, orders, renderOrder, empty }) {
  if (query.isLoading) return <div className="flex justify-center py-6"><LoadingSpinner /></div>;
  if (orders.length === 0) return <p className="text-sm text-slate-400 text-center py-4">{empty}</p>;
  const total = query.data?.pagination?.total;
  return (
    <div className="space-y-2">
      {orders.map(o => <React.Fragment key={o.id}>{renderOrder(o)}</React.Fragment>)}
      {total > (query.data?.orders || []).length && (
        <p className="text-xs text-slate-400 text-center">Showing the latest {query.data.orders.length} of {total}</p>
      )}
    </div>
  );
}
