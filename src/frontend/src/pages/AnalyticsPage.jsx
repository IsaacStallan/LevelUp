import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import NavHeader from '../components/NavHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import ModeText from '../components/ModeText.jsx';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CIRC = 2 * Math.PI * 54; // ≈ 339

function scoreColor(s) {
  if (s <= 20) return '#9ca3af'; // grey
  if (s <= 40) return '#60a5fa'; // blue
  if (s <= 60) return '#f59e0b'; // amber
  if (s <= 80) return '#22c55e'; // green
  return '#a855f7';              // purple/gold
}

function computeHealthScore(data) {
  const habits = data?.habits ?? [];
  if (!habits.length) return 0;
  const avgRate = habits.reduce((s, h) => s + h.completion_rate_30d, 0) / habits.length;
  const thisXp  = data.this_week?.xp ?? 0;
  const lastXp  = data.last_week?.xp ?? 0;
  const wow     = lastXp > 0 ? Math.min((thisXp / lastXp) * 10, 15) : thisXp > 0 ? 10 : 0;
  const bonus   = Math.min(habits.length * 3, 15);
  return Math.min(Math.round(avgRate * 0.7 + wow + bonus), 100);
}

function fillDays(dailyXp) {
  const map = Object.fromEntries(dailyXp.map(d => [d.date, d]));
  const out = [];
  const end = new Date(), start = new Date();
  start.setDate(end.getDate() - 29);
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push(map[key] ?? { date: key, xp: 0, completions: 0 });
  }
  return out;
}

function ScoreGauge({ score }) {
  const color  = scoreColor(score);
  const offset = CIRC - (score / 100) * CIRC;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="shrink-0">
      <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle
        cx="65" cy="65" r="54" fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${CIRC} ${CIRC}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
      <text x="65" y="60" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">{score}</text>
      <text x="65" y="76" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">/ 100</text>
    </svg>
  );
}

function XPChart({ days }) {
  if (!days.length) return null;
  const max = Math.max(...days.map(d => d.xp), 1);
  const W = 560, H = 90, pL = 28, pB = 18, pT = 8;
  const cW = W - pL, cH = H - pB - pT;
  const n  = Math.max(days.length - 1, 1);

  const pts = days.map((d, i) => [
    pL + (i / n) * cW,
    pT + cH - (d.xp / max) * cH,
  ]);

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const polygon  = [
    `${pts[0][0]},${pT + cH}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${pT + cH}`,
  ].join(' ');

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: pT + cH - p * cH, label: Math.round(p * max),
  }));
  const xLabels = days
    .map((d, i) => ({ i, label: d.date.slice(5) }))
    .filter((_, i) => i % 5 === 0 || i === days.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H + pB}`} className="w-full" style={{ height: 120 }}>
      {gridYs.map(g => (
        <g key={g.y}>
          <line x1={pL} y1={g.y} x2={W} y2={g.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={pL - 4} y={g.y + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="7">{g.label}</text>
        </g>
      ))}
      <polygon points={polygon} fill="rgba(168,85,247,0.12)" />
      <polyline points={polyline} fill="none" stroke="#a855f7" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {xLabels.map(({ i, label }) => (
        <text key={i}
          x={pL + (i / n) * cW} y={H + pB - 1}
          textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7"
        >{label}</text>
      ))}
    </svg>
  );
}

function InsightCard({ icon, title, items, border }) {
  return (
    <div className={`glass-card rounded-xl border ${border} p-4`}>
      <p className="text-xs font-semibold text-gray-300 mb-2.5">{icon} {title}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-gray-400 leading-snug flex gap-1.5">
            <span className="text-gray-600 shrink-0 mt-0.5">•</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function rateColor(r) {
  if (r < 50) return 'text-red-400';
  if (r < 80) return 'text-yellow-400';
  return 'text-green-400';
}

export default function AnalyticsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [locked, setLocked]           = useState(false);
  const [insights, setInsights]       = useState(null);
  const [insLoading, setInsLoading]   = useState(false);
  const [remaining, setRemaining]     = useState(3);
  const [insError, setInsError]       = useState('');

  useEffect(() => {
    client.get('/analytics')
      .then(r => setData(r.data))
      .catch(err => { if (err.response?.status === 403) setLocked(true); })
      .finally(() => setLoading(false));
  }, []);

  async function fetchInsights() {
    setInsLoading(true);
    setInsError('');
    try {
      const { data: ins } = await client.post('/analytics/insights');
      setInsights(ins);
      setRemaining(ins.remaining);
    } catch (err) {
      if (err.response?.status === 429) {
        setRemaining(0);
        setInsError('Daily limit reached (3/day). Come back tomorrow!');
      } else {
        const msg = err.response?.data?.error ?? 'Failed to get insights. Try again.';
        setInsError(msg);
      }
    } finally {
      setInsLoading(false);
    }
  }

  const days  = data ? fillDays(data.daily_xp) : [];
  const score = computeHealthScore(data);
  const scoreLabel =
    score <= 20 ? 'Just Getting Started' :
    score <= 40 ? 'Finding Your Feet' :
    score <= 60 ? 'Building Momentum' :
    score <= 80 ? 'On a Roll' : 'Unstoppable';

  const dowFull = Array.from({ length: 7 }, (_, i) => ({
    dow: i,
    count: data?.day_of_week.find(d => d.dow === i)?.count ?? 0,
  }));
  const activeDow = dowFull.filter(d => d.count > 0);
  const bestDow  = activeDow.length ? activeDow.reduce((a, b) => b.count > a.count ? b : a).dow : -1;
  const worstDow = activeDow.length > 1 ? activeDow.reduce((a, b) => b.count < a.count ? b : a).dow : -1;
  const maxDow   = Math.max(...dowFull.map(d => d.count), 1);

  return (
    <div className="page-enter min-h-screen">
      <NavHeader level={user?.level ?? 0} />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <h1 className="text-lg sm:text-xl font-bold text-white"><ModeText id="analytics.title" /></h1>

        {loading ? (
          <div className="space-y-3">
            {[140, 80, 100].map((h, i) => <div key={i} className="skeleton rounded-xl" style={{ height: h }} />)}
          </div>
        ) : locked ? (
          <div className="glass-card rounded-2xl border border-purple-700/40 p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-white font-bold mb-2">Pro Feature</h2>
            <p className="text-gray-400 text-sm mb-4">Upgrade to unlock detailed habit analytics and AI coaching.</p>
            <button
              onClick={() => navigate('/upgrade')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
            >
              Upgrade — $7/mo
            </button>
          </div>
        ) : (
          <>
            {/* ── Health Score + AI button ─────────────────────────── */}
            <div className="glass-card rounded-xl border border-white/[0.07] p-4 flex flex-col sm:flex-row items-center gap-4">
              <ScoreGauge score={score} />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Habit Health Score</p>
                <p className="text-2xl font-black" style={{ color: scoreColor(score) }}>{scoreLabel}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Based on your 30-day completion rate, weekly progress, and habit count.
                </p>
                <div className="mt-3">
                  {insLoading ? (
                    <p className="text-sm text-purple-400 animate-pulse flex items-center gap-2">
                      <span>🤖</span><span>Analysing your habits…</span>
                    </p>
                  ) : (
                    <button
                      onClick={fetchInsights}
                      disabled={remaining === 0}
                      className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                        remaining === 0
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : 'bg-purple-700 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {remaining === 0
                        ? 'No insights left today'
                        : insights
                        ? `↻ Refresh (${remaining} left)`
                        : `✨ Get AI Insights (${remaining} left today)`}
                    </button>
                  )}
                  {insError && <p className="text-xs text-red-400 mt-2">{insError}</p>}
                </div>
              </div>
            </div>

            {/* ── AI Insight cards ─────────────────────────────────── */}
            {insights && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InsightCard icon="💪" title="What's Working"    items={insights.strengths}       border="border-green-700/50" />
                <InsightCard icon="⚠️" title="Watch Out"         items={insights.warnings}        border="border-yellow-700/50" />
                <InsightCard icon="🎯" title="This Week's Focus" items={insights.recommendations} border="border-purple-700/50" />
              </div>
            )}

            {/* ── Per-habit table ──────────────────────────────────── */}
            {(data.habits?.length ?? 0) > 0 && (
              <div className="glass-card rounded-xl border border-white/[0.07] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Habit Performance</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        {['Habit', '30d Rate', 'Streak', 'Best', 'XP'].map((h, i) => (
                          <th key={h} className={`py-2 px-3 text-[10px] text-gray-600 font-medium uppercase tracking-wide ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.habits.map(h => (
                        <tr key={h.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                          <td className="px-3 py-2.5 text-gray-300">
                            <span className="mr-1.5">{h.icon}</span>{h.name}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${rateColor(h.completion_rate_30d)}`}>
                            {h.completion_rate_30d}%
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{h.current_streak}d</td>
                          <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums">{h.best_streak}d</td>
                          <td className="px-3 py-2.5 text-right text-purple-400 tabular-nums">{h.total_xp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 30-day XP chart ──────────────────────────────────── */}
            <div className="glass-card rounded-xl border border-white/[0.07] p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">XP Earned — Last 30 Days</p>
              <XPChart days={days} />
            </div>

            {/* ── Day-of-week heatmap ──────────────────────────────── */}
            <div className="glass-card rounded-xl border border-white/[0.07] p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Completions by Day of Week</p>
              <div className="flex justify-around items-end gap-1">
                {dowFull.map(d => {
                  const isBest  = d.dow === bestDow  && d.count > 0;
                  const isWorst = d.dow === worstDow && d.count > 0;
                  const fill    = isBest ? '#a855f7' : isWorst ? '#ef4444' : 'rgba(255,255,255,0.15)';
                  const pct     = maxDow > 0 ? Math.max((d.count / maxDow) * 100, d.count > 0 ? 6 : 0) : 0;
                  return (
                    <div key={d.dow} className="flex flex-col items-center gap-1 flex-1">
                      <span className={`text-[10px] tabular-nums ${isBest ? 'text-purple-400' : isWorst ? 'text-red-400' : 'text-gray-600'}`}>
                        {d.count}
                      </span>
                      <div className="w-full rounded-sm overflow-hidden" style={{ height: 52, background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="w-full rounded-sm"
                          style={{ height: `${pct}%`, marginTop: `${100 - pct}%`, background: fill, transition: 'height 0.6s ease' }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium ${isBest ? 'text-purple-400' : isWorst ? 'text-red-400' : 'text-gray-500'}`}>
                        {DOW_LABELS[d.dow]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {bestDow >= 0 && (
                <p className="text-[10px] text-gray-600 mt-3 text-center">
                  Best: <span className="text-purple-400">{DOW_LABELS[bestDow]}</span>
                  {worstDow >= 0 && <> · Worst: <span className="text-red-400">{DOW_LABELS[worstDow]}</span></>}
                </p>
              )}
            </div>

            {/* ── Week over week ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'This week', ...data.this_week }, { label: 'Last week', ...data.last_week }].map(w => (
                <div key={w.label} className="glass-card rounded-xl border border-white/[0.07] p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{w.label}</p>
                  <p className="text-xl font-black text-purple-400 tabular-nums mt-1">{w.xp} XP</p>
                  <p className="text-xs text-gray-500">{w.completions} completions</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
