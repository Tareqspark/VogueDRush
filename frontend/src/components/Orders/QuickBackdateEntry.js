import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../UI/LoadingSpinner';

// Business days run 06:00–06:00 Dhaka, which is the UTC date (see GET /orders scope).
const businessDay = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const dayLabel = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
};
const money = (n) => `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const PAYMENT_LABELS = { cash: 'Cash', card: 'Card', bkash: 'bKash', nagad: 'Nagad' };

// The quick mode of Backdated Order Entry: a date, an amount and a name, saved as a
// takeaway lump sum with no menu items (POST /orders/backdate/quick).
export default function QuickBackdateEntry({ api, options, selectedBranch, onSaved, onClose }) {
  const today = businessDay();
  const minDay = options?.max_days != null ? businessDay(Date.parse(today) - options.max_days * 86400000) : undefined;

  const [date, setDate] = useState(businessDay(Date.parse(today) - 86400000)); // yesterday
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLast4, setPaymentLast4] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const amountRef = useRef(null);

  // Mirrors the server: the amount already includes VAT at today's rate.
  const total = parseFloat(amount) || 0;
  const vatRate = parseFloat(options?.vat_percentage) || 0;
  const vat = total - Math.round((total / (1 + vatRate / 100)) * 100) / 100;

  const save = async (addAnother) => {
    if (!date) { toast.error('Pick the day'); return; }
    if (minDay && date < minDay) { toast.error(`Managers can backdate up to ${options.max_days} days`); return; }
    if (date > today) { toast.error('That day has not started yet'); return; }
    if (!(total > 0)) { toast.error('Enter an amount'); return; }
    if (!name.trim()) { toast.error('Enter a name'); return; }
    if (paymentLast4 && !/^\d{4}$/.test(paymentLast4)) { toast.error('Last 4 digits must be 4 numbers'); return; }

    setSubmitting(true);
    try {
      await api.post('/orders/backdate/quick', {
        date,
        amount: total,
        name: name.trim(),
        payment_method: paymentMethod,
        payment_last4: paymentLast4 || undefined,
        note: note.trim() || undefined,
        branch_id: selectedBranch?.id,
      });
      toast.success(`Saved ${money(total)} for ${dayLabel(date)}`);
      onSaved(addAnother);
      if (addAnother) {
        // Keep the day and payment method; clear the rest for the next entry.
        setAmount(''); setName(''); setNote(''); setPaymentLast4('');
        setSavedCount(c => c + 1);
        amountRef.current?.focus();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={e => { e.preventDefault(); save(false); }} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Date <span className="text-rose-500">*</span></label>
            <input type="date" min={minDay} max={today} value={date} onChange={e => setDate(e.target.value)} required className="input" />
            {options?.max_days != null && (
              <p className="text-xs text-slate-400 mt-1">Managers can go back up to {options.max_days} days.</p>
            )}
          </div>
          <div>
            <label className="label">Amount (৳) <span className="text-rose-500">*</span></label>
            <input ref={amountRef} type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required className="input" placeholder="0" autoFocus />
          </div>
        </div>

        <div>
          <label className="label">Name <span className="text-rose-500">*</span></label>
          <input type="text" maxLength={100} value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="e.g. Evening sales" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Payment</label>
            <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setPaymentLast4(''); }} className="select">
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {paymentMethod !== 'cash' && (
            <div>
              <label className="label">Last 4 Digits</label>
              <input type="text" maxLength={4} value={paymentLast4} onChange={e => setPaymentLast4(e.target.value.replace(/\D/g, ''))} className="input" placeholder="Optional" />
            </div>
          )}
        </div>

        <div>
          <label className="label">Note</label>
          <input type="text" maxLength={500} value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="Optional" />
        </div>

        {total > 0 && date && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
            Records <span className="font-black">{money(total)}</span> paid by {PAYMENT_LABELS[paymentMethod]} on {dayLabel(date)}
            <div className="text-xs mt-0.5">Includes VAT {money(vat)} at {vatRate}% · saved as Takeaway · no item breakdown</div>
          </div>
        )}
      </form>

      <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{savedCount > 0 ? `${savedCount} saved this session` : ''}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="button" onClick={() => save(true)} disabled={submitting} className="btn btn-secondary">Save &amp; add another</button>
          <button type="button" onClick={() => save(false)} disabled={submitting} className="btn btn-primary">
            {submitting ? <LoadingSpinner size="sm" /> : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
