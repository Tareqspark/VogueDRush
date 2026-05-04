import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, GiftIcon, StarIcon } from '@heroicons/react/24/outline';

const TABS = ['Customers', 'Loyalty & Tiers', 'Coupons', 'RFM Segments', 'CLV & Cohorts', 'Feedback'];

const PATH_MAP = {
  '':          'Customers',
  'customers': 'Customers',
  'loyalty':   'Loyalty & Tiers',
  'tiers':     'Loyalty & Tiers',
  'coupons':   'Coupons',
  'rfm':       'RFM Segments',
  'clv':       'CLV & Cohorts',
  'cohorts':   'CLV & Cohorts',
  'feedback':  'Feedback',
};
const TAB_PATH = {
  'Customers':       '',
  'Loyalty & Tiers': 'loyalty',
  'Coupons':         'coupons',
  'RFM Segments':    'rfm',
  'CLV & Cohorts':   'clv',
  'Feedback':        'feedback',
};

const CUSTOMERS = [
  { id: 1, name: 'Ahmed Al Rashid',  phone: '+971-50-1234567', email: 'ahmed@email.com',  visits: 28, ltv: 8420.00, points: 3240, tier: 'Gold',     lastVisit: '2026-05-05', segment: 'Champion' },
  { id: 2, name: 'Sara Johnson',     phone: '+971-55-2345678', email: 'sara@email.com',   visits: 45, ltv: 14200.00,points: 8100, tier: 'Platinum', lastVisit: '2026-05-04', segment: 'Champion' },
  { id: 3, name: 'Mohamed Hassan',   phone: '+971-50-3456789', email: 'mhasan@email.com', visits: 12, ltv: 3200.00, points: 960,  tier: 'Silver',   lastVisit: '2026-04-28', segment: 'Potential' },
  { id: 4, name: 'Priya Sharma',     phone: '+971-55-4567890', email: 'priya@email.com',  visits: 7,  ltv: 1850.00, points: 420,  tier: 'Bronze',   lastVisit: '2026-04-15', segment: 'New' },
  { id: 5, name: 'Carlos Mendez',    phone: '+971-50-5678901', email: 'carlos@email.com', visits: 31, ltv: 9800.00, points: 4200, tier: 'Gold',     lastVisit: '2026-03-20', segment: 'At Risk' },
  { id: 6, name: 'Fatima Al Zaabi',  phone: '+971-55-6789012', email: 'fatima@email.com', visits: 52, ltv: 18500.00,points: 12000,tier: 'Platinum', lastVisit: '2026-05-05', segment: 'Champion' },
  { id: 7, name: 'Tom Bradley',      phone: '+971-50-7890123', email: 'tomb@email.com',   visits: 4,  ltv: 980.00,  points: 180,  tier: 'Bronze',   lastVisit: '2026-02-10', segment: 'Lost' },
];

const COUPONS = [
  { id: 1, code: 'WELCOME25',  type: '25% Off',     minOrder: 'AED 100', uses: 142, maxUses: 500, valid: '2026-06-30', status: 'active',   eligible: 'All orders' },
  { id: 2, code: 'GOLD2X',     type: '2x Points',   minOrder: 'AED 150', uses: 89,  maxUses: 200, valid: '2026-05-31', status: 'active',   eligible: 'Gold+ only' },
  { id: 3, code: 'BOGO-PIZZA', type: 'BOGO',        minOrder: 'AED 200', uses: 38,  maxUses: 100, valid: '2026-05-15', status: 'active',   eligible: 'Dine-in' },
  { id: 4, code: 'RAMADAN30',  type: 'AED 30 Off',  minOrder: 'AED 120', uses: 320, maxUses: 320, valid: '2026-04-30', status: 'expired',  eligible: 'All orders' },
  { id: 5, code: 'DELIVERY10', type: '10% Off',     minOrder: 'AED 80',  uses: 74,  maxUses: 250, valid: '2026-07-01', status: 'active',   eligible: 'Delivery only' },
];

const RFM = [
  { segment: 'Champions',       count: 3,  pct: 43, color: 'bg-emerald-500', desc: 'High R, F, M — Top spenders, visit often, recent' },
  { segment: 'Loyal Customers', count: 1,  pct: 14, color: 'bg-sky-500',     desc: 'High F, M — Regular visitors, good spend' },
  { segment: 'Potential',       count: 1,  pct: 14, color: 'bg-violet-500',  desc: 'Medium R, F — Recently active, growing' },
  { segment: 'At Risk',         count: 1,  pct: 14, color: 'bg-amber-500',   desc: 'Low R, High F/M — Were champions, now lapsing' },
  { segment: 'Lost',            count: 1,  pct: 14, color: 'bg-rose-400',    desc: 'Low R, Low F — Churned, need win-back campaign' },
];

const FEEDBACK = [
  { id: 1, customer: 'Ahmed Al Rashid', order: 'ORD-1230', food: 5, service: 5, ambience: 4, overall: 5, comment: 'Perfect as always, Margherita was exceptional!', date: '2026-05-05', status: 'published' },
  { id: 2, customer: 'Priya Sharma',    order: 'ORD-1218', food: 4, service: 3, ambience: 4, overall: 4, comment: 'Good food but waited too long for service.',     date: '2026-05-03', status: 'published' },
  { id: 3, customer: 'Sara Johnson',    order: 'ORD-1205', food: 5, service: 5, ambience: 5, overall: 5, comment: 'Best dining experience in Abu Dhabi!',            date: '2026-04-30', status: 'published' },
  { id: 4, customer: 'Carlos Mendez',   order: 'ORD-1195', food: 2, service: 2, ambience: 3, overall: 2, comment: 'Burger was overcooked and cold when served.',      date: '2026-04-28', status: 'pending' },
];

const TIER_STYLE    = { Bronze: 'bg-amber-50 text-amber-800 border-amber-200', Silver: 'bg-slate-100 text-slate-700 border-slate-300', Gold: 'bg-yellow-50 text-yellow-800 border-yellow-300', Platinum: 'bg-sky-50 text-sky-800 border-sky-200' };
const SEGMENT_STYLE = { Champion: 'bg-emerald-100 text-emerald-800', Loyal: 'bg-sky-100 text-sky-700', Potential: 'bg-violet-100 text-violet-700', New: 'bg-slate-100 text-slate-600', 'At Risk': 'bg-amber-100 text-amber-700', Lost: 'bg-rose-100 text-rose-700' };

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <StarIcon key={n} className={`h-3.5 w-3.5 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

export default function CRM() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath  = location.pathname.replace(/^\/crm\/?/, '');
  const tab      = PATH_MAP[subPath] || 'Customers';
  const setTab   = (t) => navigate(TAB_PATH[t] ? `/crm/${TAB_PATH[t]}` : '/crm');
  const [search, setSearch] = React.useState('');

  const totalCustomers  = CUSTOMERS.length;
  const loyaltyMembers  = CUSTOMERS.filter(c => c.tier !== 'Bronze').length;
  const avgCLV          = Math.round(CUSTOMERS.reduce((s, c) => s + c.ltv, 0) / CUSTOMERS.length);
  const avgRating       = (FEEDBACK.reduce((s, f) => s + f.overall, 0) / FEEDBACK.length).toFixed(1);

  const filtered = CUSTOMERS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Customer CRM & Loyalty</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module D · Profiles · Loyalty Points · Tiers · Coupons · RFM · CLV · Feedback</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Customer</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers',   val: totalCustomers,           sub: `${loyaltyMembers} loyalty members`, color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Avg CLV',           val: `AED ${avgCLV.toLocaleString()}`, sub: 'Per customer lifetime',   color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
          { label: 'Active Coupons',    val: COUPONS.filter(c => c.status === 'active').length,  sub: `${COUPONS.filter(c=>c.status==='active').reduce((s,c)=>s+c.uses,0)} redemptions`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Avg Rating',        val: `${avgRating} ★`,         sub: `${FEEDBACK.length} reviews`,      color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
            <p className="text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? 'text-sky-700 border-sky-500 bg-sky-50/40' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'Customers' && (
            <div>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9 text-sm" placeholder="Name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="select w-auto text-sm"><option>All Tiers</option><option>Platinum</option><option>Gold</option><option>Silver</option><option>Bronze</option></select>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Customer</th><th>Phone</th><th>Visits</th><th>LTV</th><th>Points</th><th>Tier</th><th>Last Visit</th><th>Segment</th></tr></thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {c.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                            <span className="font-semibold text-slate-800">{c.name}</span>
                          </div>
                        </td>
                        <td className="text-xs text-slate-500 font-mono">{c.phone}</td>
                        <td className="text-center font-bold text-slate-700">{c.visits}</td>
                        <td className="font-mono text-xs font-bold text-slate-700">AED {c.ltv.toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <GiftIcon className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs font-bold text-amber-700">{c.points.toLocaleString()}</span>
                          </div>
                        </td>
                        <td><span className={`status-badge border text-xs ${TIER_STYLE[c.tier]}`}>{c.tier}</span></td>
                        <td className="text-xs text-slate-500">{c.lastVisit}</td>
                        <td><span className={`status-badge ${SEGMENT_STYLE[c.segment] || 'bg-slate-100 text-slate-600'}`}>{c.segment}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Loyalty & Tiers' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-4 gap-3">
                {[
                  { tier: 'Platinum', threshold: 'AED 15,000+', multiplier: '3×', benefit: 'Priority res + Free dessert', count: 2, style: 'border-sky-200 bg-sky-50' },
                  { tier: 'Gold',     threshold: 'AED 7,000+',  multiplier: '2×', benefit: 'Free appetiser monthly',       count: 2, style: 'border-yellow-200 bg-yellow-50' },
                  { tier: 'Silver',   threshold: 'AED 3,000+',  multiplier: '1.5×',benefit: 'Birthday bonus points',      count: 1, style: 'border-slate-200 bg-slate-50' },
                  { tier: 'Bronze',   threshold: 'AED 0+',      multiplier: '1×', benefit: 'Base loyalty programme',       count: 2, style: 'border-amber-200 bg-amber-50' },
                ].map(t => (
                  <div key={t.tier} className={`rounded-xl border p-4 ${t.style}`}>
                    <p className="text-base font-black text-slate-800">{t.tier}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.threshold}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between"><span className="text-xs text-slate-500">Earn Rate</span><span className="text-xs font-bold text-slate-700">{t.multiplier} pts</span></div>
                      <div className="flex justify-between"><span className="text-xs text-slate-500">Members</span><span className="text-xs font-bold text-sky-700">{t.count}</span></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-tight">{t.benefit}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Earn Rate: 100 pts = AED 1.00 · Min order AED 50 to earn</p>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Customer</th><th>Tier</th><th>Points Balance</th><th>Redemption Value</th><th>YTD Earned</th><th>YTD Redeemed</th></tr></thead>
                    <tbody>
                      {CUSTOMERS.map(c => (
                        <tr key={c.id}>
                          <td className="font-semibold text-slate-800">{c.name}</td>
                          <td><span className={`status-badge border text-xs ${TIER_STYLE[c.tier]}`}>{c.tier}</span></td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <GiftIcon className="h-3.5 w-3.5 text-amber-500" />
                              <span className="font-bold text-amber-700">{c.points.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="font-mono text-xs text-emerald-700">AED {(c.points / 100).toFixed(2)}</td>
                          <td className="font-mono text-xs text-slate-600">{(c.ltv * 0.08).toFixed(0)} pts</td>
                          <td className="font-mono text-xs text-slate-500">{(c.ltv * 0.02).toFixed(0)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'Coupons' && (
            <div>
              <div className="flex justify-between mb-4">
                <p className="text-sm text-slate-500">{COUPONS.filter(c=>c.status==='active').length} active coupons</p>
                <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Create Coupon</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {COUPONS.map(c => (
                  <div key={c.id} className={`rounded-xl border p-4 ${c.status === 'active' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <code className="text-sm font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded">{c.code}</code>
                      <span className={`status-badge ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">{c.type}</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <div className="flex justify-between"><span>Min Order</span><span className="font-semibold text-slate-700">{c.minOrder}</span></div>
                      <div className="flex justify-between"><span>Eligible</span><span className="font-semibold text-slate-700">{c.eligible}</span></div>
                      <div className="flex justify-between"><span>Valid Until</span><span className="font-semibold text-slate-700">{c.valid}</span></div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Usage</span>
                        <span className="font-bold text-slate-700">{c.uses} / {c.maxUses}</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(c.uses / c.maxUses) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'RFM Segments' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-500">RFM = Recency × Frequency × Monetary. Scores 1-5 per dimension. Segment assigned from composite score.</p>
              <div className="space-y-3">
                {RFM.map(r => (
                  <div key={r.segment} className="flex items-center gap-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className={`h-10 w-10 rounded-xl ${r.color} flex items-center justify-center text-white text-sm font-black shrink-0`}>{r.count}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-800">{r.segment}</p>
                        <span className="text-xs text-slate-400">{r.pct}%</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{r.desc}</p>
                    </div>
                    <div className="w-24 shrink-0">
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct * 2}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Feedback' && (
            <div className="space-y-3">
              {FEEDBACK.map(f => (
                <div key={f.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{f.customer}</p>
                      <p className="text-xs text-slate-400">Order <code>{f.order}</code> · {f.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stars rating={f.overall} />
                      <span className="text-sm font-black text-amber-600">{f.overall}/5</span>
                      <span className={`status-badge ${f.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{f.status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[['Food', f.food], ['Service', f.service], ['Ambience', f.ambience]].map(([k, v]) => (
                      <div key={k} className="text-center">
                        <p className="text-xs text-slate-400">{k}</p>
                        <Stars rating={v} />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 italic">"{f.comment}"</p>
                  {f.overall <= 2 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-rose-600 font-bold">⚠ Manager alert sent</span>
                      <button className="btn btn-ghost btn-sm text-xs text-sky-600">Reply</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'CLV & Cohorts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Avg CLV', val: 'AED 4,280', sub: 'Lifetime per customer', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  { label: 'Avg Order Value', val: 'AED 152', sub: 'Across all customers', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
                  { label: 'Purchase Freq.', val: '3.2x/mo', sub: 'Active customers', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
                  { label: 'Churn (30d)', val: '8.4%', sub: 'No order in 30 days', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
                ].map(k => (
                  <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
                    <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
                    <p className="text-xs text-slate-500">{k.sub}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Cohort Retention Matrix</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left p-2 text-slate-500 font-semibold">Cohort</th>
                        <th className="text-center p-2 text-slate-500 font-semibold">Size</th>
                        {['M+1','M+2','M+3','M+4','M+5'].map(m => (
                          <th key={m} className="text-center p-2 text-slate-500 font-semibold">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { cohort: 'Nov 2025', size: 142, ret: [62, 44, 36, 28, 22] },
                        { cohort: 'Dec 2025', size: 188, ret: [68, 50, 42, 31, null] },
                        { cohort: 'Jan 2026', size: 165, ret: [60, 45, 36, null, null] },
                        { cohort: 'Feb 2026', size: 174, ret: [65, 48, null, null, null] },
                        { cohort: 'Mar 2026', size: 192, ret: [71, null, null, null, null] },
                      ].map(row => (
                        <tr key={row.cohort}>
                          <td className="p-2 font-semibold text-slate-700">{row.cohort}</td>
                          <td className="p-2 text-center text-slate-500">{row.size}</td>
                          {row.ret.map((pct, i) => (
                            <td key={i} className="p-1">
                              {pct !== null ? (
                                <div className={`rounded px-2 py-1 text-center font-bold ${ pct >= 60 ? 'bg-emerald-600 text-white' : pct >= 40 ? 'bg-emerald-400 text-white' : pct >= 25 ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600' }`}>{pct}%</div>
                              ) : (
                                <div className="text-center text-slate-300">—</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
