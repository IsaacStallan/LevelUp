import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import NavHeader from '../components/NavHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Fill missing dates with 0 so the chart is continuous
function fillDays(dailyXp) {
  if (!dailyXp.length) return [];
  const map = Object.fromEntries(dailyXp.map(d => [d.date, d]));
  const out = [];
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push(map[key] ?? { date: key, xp: 0, completions: 0 });
  }
  return out;
}

function MiniBar({ value, max, label }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-500 tabular-nums">{value}</span>
      <div className="w-7 bg-gray-800 rounded-sm overflow-hidden" style={{ height: 48 }}>
        <div
          className="w-full bg-purple-600 rounded-sm transition-all"
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

function SparkLine({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.xp), 1);
  const W = 100, H = 48;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.xp / max) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-12">
      <polyline
        points={pts}
        fill="none"
        stroke="#a855f7"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked]   = useState(false);

  useEffect(() => {
    client.get('/analytics')
      .then(r => setData(r.data))
      .catch(err => {
        if (err.response?.status === 403) setLocked(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const days = data ? fillDays(data.daily_xp) : [];
  const maxXp = Math.max(...days.map(d => d.xp), 1);
  const maxDow = data ? Math.max(...data.day_of_week.map(d => d.count), 1) : 1;

  const dowFull = Array.from({ length: 7 }, (_, i) => {
    const found = data?.day_of_week.find(d => d.dow === i);
    return { dow: i, count: found?.count ?? 0 };
  });

  return (
    <div className="page-enter min-h-screen">
      <NavHeader level={user?.level ?? 0} />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <h1 className="text-lg sm:text-xl font-bold text-white">📊 Analytics</h1>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton rounded-xl h-32" />
            <div className="skeleton rounded-xl h-24" />
          </div>
        ) : locked ? (
          <div className="glass-card rounded-2xl border border-purple-700/40 p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-white font-bold mb-2">Pro Feature</h2>
            <p className="text-gray-400 text-sm mb-4">Upgrade to access detailed analytics about your habits.</p>
            <button
              onClick={() => navigate('/upgrade')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
            >
              Upgrade — $7/mo
            </button>
          </div>
        ) : (
          <>
            {/* Week over week */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'This week', ...data.this_week },
                { label: 'Last week', ...data.last_week },
              ].map(w => (
                <div key={w.label} className="glass-card rounded-xl border border-white/[0.07] p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{w.label}</p>
                  <p className="text-xl font-black text-purple-400 tabular-nums mt-1">{w.xp} XP</p>
                  <p className="text-xs text-gray-500">{w.completions} completions</p>
                </div>
              ))}
            </div>

            {/* 30-day XP sparkline */}
            <div className="glass-card rounded-xl border border-white/[0.07] p-4">
              <p className="text-xs text-gray-400 font-semibold mb-3">XP earned — last 30 days</p>
              <SparkLine data={days} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-600">{days[0]?.date?.slice(5)}</span>
                <span className="text-[10px] text-gray-600">{days[days.length - 1]?.date?.slice(5)}</span>
              </div>
              {/* Bar breakdown (shows individual day XP) */}
              <div className="flex gap-px mt-4 items-end" style={{ height: 32 }}>
                {days.map(d => (
                  <div
                    key={d.date}
                    className="flex-1 bg-purple-700/50 rounded-[1px] transition-all"
                    style={{ height: `${maxXp > 0 ? Math.round((d.xp / maxXp) * 100) : 0}%` }}
                    title={`${d.date}: ${d.xp} XP`}
                  />
                ))}
              </div>
            </div>

            {/* Day of week */}
            <div className="glass-card rounded-xl border border-white/[0.07] p-4">
              <p className="text-xs text-gray-400 font-semibold mb-4">Completions by day of week</p>
              <div className="flex justify-around items-end">
                {dowFull.map(d => (
                  <MiniBar key={d.dow} value={d.count} max={maxDow} label={DOW_LABELS[d.dow]} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
