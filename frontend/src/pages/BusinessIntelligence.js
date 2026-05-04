import React, { useState } from 'react';

const TABS = ['Peak Hours', 'Menu Engineering', 'Customer Cohorts', 'Forecast', 'Profitability'];

// Peak hours heatmap: 7 days × 18 hours (6am-midnight)
const HOURS = Array.from({ length: 18 }, (_, i) => `${i + 6}:00`);
const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP = [
  [2, 3, 4, 5, 7, 8, 9, 10, 8, 6, 4, 3, 5, 7, 9, 10, 8, 5],
  [1, 2, 3, 5, 6, 7, 8, 9, 7, 5, 3, 2, 4, 6, 8, 9, 7, 4],
  [2, 3, 4, 6, 7, 9, 10, 10, 9, 7, 5, 4, 6, 8, 9, 10, 9, 6],
  [2, 4, 5, 7, 8, 9, 10, 10, 9, 8, 6, 5, 7, 9, 10, 10, 9, 7],
  [3, 5, 7, 9, 10, 10, 10, 10, 9, 8, 7, 6, 8, 10, 10, 10, 10, 9],
  [4, 6, 8, 10, 10, 10, 10, 10, 10, 9, 8, 7, 9, 10, 10, 10, 10, 10],
  [3, 5, 7, 9, 10, 10, 10, 9, 8, 7, 6, 5, 7, 9, 10, 10, 9, 7],
];

// Menu Engineering (4 quadrants: Star/Plowhorse/Puzzle/Dog)
const MENU_ITEMS = [
  { name: 'Margherita Pizza',     sales: 420, margin: 70.2, quadrant: 'Star',       color: 'bg-emerald-100 border-emerald-300' },
  { name: 'Beef Burger',          sales: 380, margin: 66.5, quadrant: 'Star',       color: 'bg-emerald-100 border-emerald-300' },
  { name: 'Pasta Carbonara',      sales: 290, margin: 70.8, quadrant: 'Star',       color: 'bg-emerald-100 border-emerald-300' },
  { name: 'Grilled Chicken',      sales: 310, margin: 48.2, quadrant: 'Plowhorse',  color: 'bg-sky-100 border-sky-300' },
  { name: 'Caesar Salad',         sales: 250, margin: 75.4, quadrant: 'Puzzle',     color: 'bg-amber-100 border-amber-300' },
  { name: 'Salmon Fillet',        sales: 180, margin: 71.0, quadrant: 'Puzzle',     color: 'bg-amber-100 border-amber-300' },
  { name: 'Veg Wrap',             sales: 320, margin: 41.0, quadrant: 'Plowhorse',  color: 'bg-sky-100 border-sky-300' },
  { name: 'Lobster Bisque',       sales: 85,  margin: 38.5, quadrant: 'Dog',        color: 'bg-rose-100 border-rose-300' },
  { name: 'Truffle Fries',        sales: 92,  margin: 55.0, quadrant: 'Dog',        color: 'bg-rose-100 border-rose-300' },
];

const QUADRANT_DESC = {
  Star:       { label: '⭐ Stars',      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', desc: 'High sales × High margin. PROMOTE HEAVILY.' },
  Plowhorse:  { label: '🐴 Plowhorses', color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',         desc: 'High sales × Low margin. REDUCE COST or UPSELL.' },
  Puzzle:     { label: '❓ Puzzles',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     desc: 'Low sales × High margin. REPOSITION or FEATURE.' },
  Dog:        { label: '🐶 Dogs',       color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',       desc: 'Low sales × Low margin. REVIEW or REMOVE.' },
};

// Cohort data: 5 cohorts × 6 months retention
const COHORTS = [
  { cohort: 'Nov 2025', size: 142, retention: [100, 62, 44, 36, 28, 22] },
  { cohort: 'Dec 2025', size: 188, retention: [100, 68, 50, 42, 31, 0] },
  { cohort: 'Jan 2026', size: 165, retention: [100, 60, 45, 36, 0, 0] },
  { cohort: 'Feb 2026', size: 174, retention: [100, 65, 48, 0, 0, 0] },
  { cohort: 'Mar 2026', size: 192, retention: [100, 71, 0, 0, 0, 0] },
];

// Forecast
const FORECAST = [
  { month: 'Jun 2026', actual: null,      predicted: 148000, lower: 132000, upper: 164000 },
  { month: 'Jul 2026', actual: null,      predicted: 142000, lower: 124000, upper: 160000 },
  { month: 'Aug 2026', actual: null,      predicted: 138000, lower: 120000, upper: 156000 },
  { month: 'Sep 2026', actual: null,      predicted: 155000, lower: 138000, upper: 172000 },
  { month: 'Oct 2026', actual: null,      predicted: 163000, lower: 145000, upper: 181000 },
  { month: 'Nov 2026', actual: null,      predicted: 172000, lower: 153000, upper: 191000 },
];

const PROFIT = [
  { line: 'Revenue',         value: 530000, pct: 100.0 },
  { line: 'Food Cost',       value:-175000, pct: 33.0 },
  { line: 'Labour Cost',     value:-148000, pct: 27.9 },
  { line: 'Rent',            value: -90000, pct: 17.0 },
  { line: 'Utilities',       value: -22000, pct: 4.2 },
  { line: 'Marketing',       value: -12000, pct: 2.3 },
  { line: 'Other OpEx',      value: -12000, pct: 2.3 },
  { line: 'EBITDA',          value:  71000, pct: 13.4 },
  { line: 'Depreciation',    value:  -8400, pct: 1.6 },
  { line: 'Net Profit',      value:  62600, pct: 11.8 },
];

function heatColor(val) {
  if (val >= 9)  return 'bg-sky-700 text-white';
  if (val >= 7)  return 'bg-sky-500 text-white';
  if (val >= 5)  return 'bg-sky-300 text-sky-900';
  if (val >= 3)  return 'bg-sky-100 text-sky-800';
  return 'bg-slate-100 text-slate-400';
}

function cohortColor(pct) {
  if (pct >= 60) return 'bg-emerald-600 text-white';
  if (pct >= 40) return 'bg-emerald-400 text-white';
  if (pct >= 25) return 'bg-emerald-200 text-emerald-900';
  if (pct >= 10) return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-400';
}

export default function BusinessIntelligence() {
  const [tab, setTab] = useState('Peak Hours');

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Business Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module L · Peak Hours · Menu Engineering · Cohorts · Forecasting · Profitability</p>
        </div>
        <button className="btn btn-secondary btn-sm">📊 Export Report</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'RevPASH',        val: 'AED 38.2',  sub: 'Revenue per available seat/hr',  color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Food Cost %',    val: '33.0%',     sub: 'Target: ≤ 32%',                  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
          { label: 'Labour Cost %',  val: '27.9%',     sub: 'Target: ≤ 28%',                  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'EBITDA %',       val: '13.4%',     sub: 'Trailing 12 months',             color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
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
          {tab === 'Peak Hours' && (
            <div>
              <p className="text-xs text-slate-500 mb-3">Order volume heatmap by day and hour. Darker = more orders. Last 30 days average.</p>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex gap-1 mb-1 ml-10">
                    {HOURS.map(h => (
                      <div key={h} className="w-9 text-center text-xs text-slate-400" style={{ fontSize: '9px' }}>{h.replace(':00', '')}</div>
                    ))}
                  </div>
                  {HEATMAP.map((row, di) => (
                    <div key={di} className="flex items-center gap-1 mb-1">
                      <div className="w-9 text-xs text-slate-500 font-semibold text-right pr-1 shrink-0">{DAYS[di]}</div>
                      {row.map((val, hi) => (
                        <div key={hi} className={`w-9 h-7 rounded flex items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${heatColor(val)}`} title={`${DAYS[di]} ${HOURS[hi]}: intensity ${val}/10`}>
                          {val >= 8 ? val : ''}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-slate-400">Low</span>
                {[1,3,5,7,9].map(v => <div key={v} className={`w-5 h-5 rounded ${heatColor(v)}`} />)}
                <span className="text-xs text-slate-400">Peak</span>
              </div>
            </div>
          )}

          {tab === 'Menu Engineering' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {Object.values(QUADRANT_DESC).map(q => (
                  <div key={q.label} className={`rounded-xl border p-3 ${q.bg}`}>
                    <p className={`text-sm font-bold ${q.color}`}>{q.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{q.desc}</p>
                    <p className="text-sm font-black text-slate-700 mt-2">{MENU_ITEMS.filter(m => m.quadrant === q.label.split(' ')[1]).length} items</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Menu Item</th><th>Quadrant</th><th>Sales Volume</th><th>Food Margin</th><th>Recommendation</th></tr></thead>
                  <tbody>
                    {MENU_ITEMS.sort((a,b) => b.sales - a.sales).map((item, i) => {
                      const q = QUADRANT_DESC[item.quadrant];
                      return (
                        <tr key={i}>
                          <td className="font-semibold text-slate-800">{item.name}</td>
                          <td><span className={`status-badge border text-xs ${item.color.replace('bg-', 'border-').split(' ')[1]} ${item.color}`}>{item.quadrant}</span></td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-sky-500" style={{ width: `${(item.sales / 420) * 100}%` }} />
                              </div>
                              <span className="text-xs text-slate-600">{item.sales}/mo</span>
                            </div>
                          </td>
                          <td>
                            <span className={`text-xs font-bold ${item.margin >= 65 ? 'text-emerald-700' : item.margin >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{item.margin.toFixed(1)}%</span>
                          </td>
                          <td className={`text-xs ${q.color}`}>{item.quadrant === 'Star' ? 'Promote, maintain' : item.quadrant === 'Plowhorse' ? 'Reduce COGS' : item.quadrant === 'Puzzle' ? 'Reposition, feature' : 'Review or remove'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Customer Cohorts' && (
            <div>
              <p className="text-xs text-slate-500 mb-3">Customer retention cohort. % of original cohort returning each month after first visit.</p>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>Size</th>
                      {['M+0', 'M+1', 'M+2', 'M+3', 'M+4', 'M+5'].map(h => <th key={h} className="text-center">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {COHORTS.map(c => (
                      <tr key={c.cohort}>
                        <td className="font-semibold text-slate-700">{c.cohort}</td>
                        <td className="text-center text-slate-500">{c.size}</td>
                        {c.retention.map((r, i) => (
                          <td key={i} className="p-0.5">
                            <div className={`rounded-lg text-center text-xs font-bold py-1 ${r === 0 ? 'bg-slate-50 text-slate-200' : cohortColor(r)}`}>
                              {r > 0 ? `${r}%` : ''}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">Green = strong retention. Grey = data not yet available (future months).</p>
            </div>
          )}

          {tab === 'Forecast' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-500">Revenue forecast using ML time-series model. Confidence interval shown.</p>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Month</th><th>Predicted Revenue</th><th>Lower Bound (90%)</th><th>Upper Bound (90%)</th><th>Confidence Range</th></tr></thead>
                  <tbody>
                    {FORECAST.map(f => (
                      <tr key={f.month}>
                        <td className="font-semibold text-slate-700">{f.month}</td>
                        <td className="font-mono text-sm font-black text-sky-700">AED {f.predicted.toLocaleString()}</td>
                        <td className="font-mono text-xs text-slate-500">AED {f.lower.toLocaleString()}</td>
                        <td className="font-mono text-xs text-slate-500">AED {f.upper.toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-24 bg-slate-100 rounded-full relative overflow-hidden">
                              <div className="absolute inset-y-0 bg-sky-200 rounded-full"
                                style={{
                                  left: `${((f.lower / f.upper) * 100) - 70}%`,
                                  width: `${((f.upper - f.lower) / f.upper) * 100}%`
                                }} />
                            </div>
                            <span className="text-xs text-slate-400">{((f.upper - f.lower)/1000).toFixed(0)}K range</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Profitability' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">P&L waterfall — All 5 Branches Combined · YTD 2026. Amounts in AED.</p>
              <div className="max-w-xl">
                {PROFIT.map((row, i) => {
                  const isTotal = ['EBITDA', 'Net Profit'].includes(row.line);
                  const isNeg   = row.value < 0;
                  const barW    = Math.abs(row.pct) / 33.0 * 100;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${isTotal ? 'bg-slate-100 border border-slate-200' : ''}`}>
                      <span className={`text-sm w-36 shrink-0 ${isTotal ? 'font-black text-slate-800' : 'text-slate-600'}`}>{row.line}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isNeg ? 'bg-rose-400' : isTotal ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(barW, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-mono w-12 text-right ${isNeg ? 'text-rose-600' : isTotal ? 'text-violet-700' : 'text-slate-600'}`}>{row.pct.toFixed(1)}%</span>
                      </div>
                      <span className={`text-sm font-mono font-bold w-28 text-right ${isNeg ? 'text-rose-600' : isTotal ? 'text-violet-700' : 'text-emerald-700'}`}>
                        {isNeg ? `(${Math.abs(row.value).toLocaleString()})` : row.value.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
