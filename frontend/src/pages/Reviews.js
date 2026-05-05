import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Overview', 'reviews': 'All Reviews', 'alerts': 'Alerts', 'sentiment': 'Sentiment' };
const TAB_PATH = { 'Overview': '', 'All Reviews': 'reviews', 'Alerts': 'alerts', 'Sentiment': 'sentiment' };

const SOURCES = [
  { id: 1, platform: 'Google Reviews', total_reviews: 1248, avg_rating: 4.5, positive_pct: 78, negative_pct: 8, last_sync: '2 hours ago' },
  { id: 2, platform: 'TripAdvisor', total_reviews: 342, avg_rating: 4.3, positive_pct: 71, negative_pct: 12, last_sync: '5 hours ago' },
  { id: 3, platform: 'Zomato', total_reviews: 890, avg_rating: 4.2, positive_pct: 69, negative_pct: 14, last_sync: '1 hour ago' },
  { id: 4, platform: 'Internal', total_reviews: 521, avg_rating: 4.6, positive_pct: 82, negative_pct: 6, last_sync: 'Live' },
];

const REVIEWS = [
  { id: 1, platform: 'Google Reviews', reviewer_name: 'Ahmed Al Nouri', rating: 5, review_text: 'Exceptional food quality and service. The lamb biryani was absolutely divine!', sentiment: 'positive', review_date: '2025-01-20', is_responded: true },
  { id: 2, platform: 'Zomato', reviewer_name: 'Sara M.', rating: 2, review_text: 'Waited 45 minutes for food. Staff was not apologetic. Very disappointing.', sentiment: 'negative', review_date: '2025-01-19', is_responded: false },
  { id: 3, platform: 'TripAdvisor', reviewer_name: 'James K.', rating: 4, review_text: 'Good food, nice ambiance. Service could be a bit faster.', sentiment: 'neutral', review_date: '2025-01-18', is_responded: true },
  { id: 4, platform: 'Google Reviews', reviewer_name: 'Fatima R.', rating: 1, review_text: 'Found a hair in my food. Manager was called but the response was unsatisfactory.', sentiment: 'negative', review_date: '2025-01-17', is_responded: false },
];

const ALERTS = [
  { id: 1, platform: 'Zomato', reviewer: 'Sara M.', rating: 2, issue: 'Long wait time complaint', created_at: '2025-01-19 14:30', status: 'open' },
  { id: 2, platform: 'Google Reviews', reviewer: 'Fatima R.', rating: 1, issue: 'Foreign object in food', created_at: '2025-01-17 20:15', status: 'open' },
];

const SENTIMENT = [
  { period: 'Jan 2025', positive: 73, neutral: 14, negative: 13, avg_rating: 4.3 },
  { period: 'Dec 2024', positive: 76, neutral: 13, negative: 11, avg_rating: 4.4 },
  { period: 'Nov 2024', positive: 70, neutral: 16, negative: 14, avg_rating: 4.2 },
];

const RATING_COLORS = { 5: 'text-green-600', 4: 'text-green-500', 3: 'text-yellow-500', 2: 'text-orange-500', 1: 'text-red-600' };
const SENT_COLORS = { positive: 'bg-green-100 text-green-800', neutral: 'bg-gray-100 text-gray-600', negative: 'bg-red-100 text-red-800' };

export default function Reviews() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/reviews\/?/, '');
  const tab = PATH_MAP[subPath] || 'Overview';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/reviews/${TAB_PATH[t]}` : '/reviews');

  const overallAvg = (SOURCES.reduce((s, p) => s + p.avg_rating, 0) / SOURCES.length).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor reviews across all platforms and respond quickly</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Overall Rating', value: `${overallAvg} ★`, color: 'yellow' }, { label: 'Total Reviews', value: SOURCES.reduce((s, p) => s + p.total_reviews, 0).toLocaleString(), color: 'blue' }, { label: 'Open Alerts', value: ALERTS.length, color: 'red' }, { label: 'Unanswered', value: REVIEWS.filter(r => !r.is_responded).length, color: 'orange' }].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold text-${k.color}-600 mt-1`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {Object.keys(TAB_PATH).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{SOURCES.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-900">{s.platform}</h3>
              <span className="text-2xl font-bold text-yellow-500">{s.avg_rating} ★</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">{s.total_reviews.toLocaleString()} reviews · Last sync: {s.last_sync}</p>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600">▲ {s.positive_pct}% positive</span>
              <span className="text-red-600">▼ {s.negative_pct}% negative</span>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'All Reviews' && (
        <div className="space-y-3">{REVIEWS.map(r => (
          <div key={r.id} className={`bg-white rounded-xl shadow-sm border p-4 ${r.sentiment === 'negative' ? 'border-red-200' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${RATING_COLORS[r.rating]}`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SENT_COLORS[r.sentiment]}`}>{r.sentiment}</span>
                <span className="text-xs text-gray-400">{r.platform}</span>
              </div>
              <span className="text-xs text-gray-400">{r.review_date}</span>
            </div>
            <p className="font-medium text-sm text-gray-900 mb-1">{r.reviewer_name}</p>
            <p className="text-sm text-gray-600 mb-2">"{r.review_text}"</p>
            {r.is_responded ? <span className="text-xs text-green-600">✓ Responded</span> : <button className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Respond</button>}
          </div>
        ))}</div>
      )}

      {tab === 'Alerts' && (
        <div className="space-y-3">{ALERTS.map(a => (
          <div key={a.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-start">
            <div>
              <p className="font-medium text-red-800">{a.issue}</p>
              <p className="text-sm text-red-600 mt-1">{a.platform} · {a.reviewer} · Rating: {a.rating}★</p>
              <p className="text-xs text-gray-500 mt-1">{a.created_at}</p>
            </div>
            <button className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">Resolve</button>
          </div>
        ))}</div>
      )}

      {tab === 'Sentiment' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Period', 'Positive %', 'Neutral %', 'Negative %', 'Avg Rating'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{SENTIMENT.map(s => (
              <tr key={s.period} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.period}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2"><div className="w-20 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{ width: `${s.positive}%` }}></div></div>
                  <span className="text-sm text-green-600">{s.positive}%</span></div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.neutral}%</td>
                <td className="px-4 py-3 text-sm text-red-600">{s.negative}%</td>
                <td className="px-4 py-3 text-sm font-bold text-yellow-500">{s.avg_rating} ★</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
