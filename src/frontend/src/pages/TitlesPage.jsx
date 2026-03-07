import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';
import NavHeader from '../components/NavHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import ModeText from '../components/ModeText.jsx';

const TITLE_ICONS = {
  first_step:     '👣',
  habit_seed:     '🌱',
  fortnight:      '💪',
  monthly_master: '🔥',
  habit_machine:  '⚙️',
  century_club:   '💯',
  xp_apprentice:  '⚡',
  xp_knight:      '🛡️',
  xp_legend:      '👑',
  rising_star:    '⭐',
  the_grind:      '🧠',
  legendary:      '🏆',
};

export default function TitlesPage() {
  const { user } = useAuth();
  const [titles, setTitles]   = useState([]);
  const [equipped, setEquipped] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  useEffect(() => {
    client.get('/titles')
      .then(r => {
        setTitles(r.data.titles);
        setEquipped(r.data.equipped_title);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleEquip(titleId, titleName) {
    setSaving(titleId);
    try {
      if (equipped === titleName) {
        // Unequip
        await client.delete('/titles/equip');
        setEquipped('');
      } else {
        const { data } = await client.post(`/titles/equip/${titleId}`);
        setEquipped(data.equipped_title);
      }
    } catch { /* ignore */ } finally {
      setSaving(null);
    }
  }

  const unlockedCount = titles.filter(t => t.unlocked).length;

  return (
    <div className="page-enter min-h-screen">
      <NavHeader level={user?.level ?? 0} />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white"><ModeText id="titles.page.title" /></h1>
            {!loading && (
              <p className="text-xs text-gray-500 mt-0.5">{unlockedCount} / {titles.length} unlocked</p>
            )}
          </div>
          {equipped && (
            <div className="text-right">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Equipped</p>
              <p className="text-sm font-semibold text-yellow-400">{equipped}</p>
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {titles.map(t => {
              const isEquipped = equipped === t.name;
              return (
                <div
                  key={t.id}
                  className={`glass-card rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                    isEquipped
                      ? 'border-yellow-600/60 bg-yellow-950/20'
                      : t.unlocked
                      ? 'border-purple-700/40'
                      : 'border-white/[0.05] opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{TITLE_ICONS[t.id] ?? '🏅'}</span>
                    {isEquipped && (
                      <span className="text-[9px] bg-yellow-900/40 border border-yellow-700/50 text-yellow-400 px-1.5 py-0.5 rounded-full">
                        ON
                      </span>
                    )}
                    {!t.unlocked && (
                      <span className="text-[9px] text-gray-600">🔒</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className={`text-xs font-bold leading-tight ${t.unlocked ? 'text-white' : 'text-gray-600'}`}>
                      {t.name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t.desc}</p>
                  </div>

                  {t.unlocked && (
                    <button
                      onClick={() => handleEquip(t.id, t.name)}
                      disabled={saving === t.id}
                      className={`text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${
                        isEquipped
                          ? 'bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60'
                          : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60'
                      }`}
                    >
                      {saving === t.id ? '…' : isEquipped ? 'Unequip' : 'Equip'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
