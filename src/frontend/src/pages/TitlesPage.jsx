import { useEffect, useState } from 'react';
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
  // Shadow titles use the emoji embedded in the name, icon just for the card display
  the_unseen:     '👁️',
  warlord:        '⚔️',
  eternal_flame:  '🔥',
  the_relentless: '💀',
};

function TitleCard({ t, equipped, saving, onEquip, locked, lockReason }) {
  const isEquipped = equipped === t.name;
  return (
    <div
      className={`glass-card rounded-xl border p-3 flex flex-col gap-2 transition-all ${
        isEquipped
          ? t.shadow
            ? 'border-red-700/70 bg-red-950/20'
            : 'border-yellow-600/60 bg-yellow-950/20'
          : t.shadow && !locked
          ? 'border-red-900/50 bg-red-950/10'
          : t.unlocked && !locked
          ? 'border-purple-700/40'
          : 'border-white/[0.05] opacity-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{TITLE_ICONS[t.id] ?? '🏅'}</span>
        {isEquipped && (
          <span className={`text-[9px] border px-1.5 py-0.5 rounded-full ${
            t.shadow
              ? 'bg-red-900/40 border-red-700/50 text-red-300'
              : 'bg-yellow-900/40 border-yellow-700/50 text-yellow-400'
          }`}>
            ON
          </span>
        )}
        {locked && <span className="text-[9px] text-gray-600">🔒</span>}
        {!locked && !t.unlocked && <span className="text-[9px] text-gray-600">🔒</span>}
      </div>

      <div className="flex-1">
        <p className={`text-xs font-bold leading-tight ${
          locked ? 'text-gray-600' : t.unlocked ? 'text-white' : 'text-gray-600'
        }`}>
          {t.name}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t.desc}</p>
      </div>

      {locked ? (
        <p className="text-[10px] text-red-500/70 font-medium">{lockReason}</p>
      ) : t.unlocked ? (
        <button
          onClick={() => onEquip(t.id, t.name)}
          disabled={saving === t.id}
          className={`text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${
            isEquipped
              ? t.shadow
                ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                : 'bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60'
              : t.shadow
              ? 'bg-red-950/40 text-red-400 hover:bg-red-900/40'
              : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60'
          }`}
        >
          {saving === t.id ? '…' : isEquipped ? 'Unequip' : 'Equip'}
        </button>
      ) : null}
    </div>
  );
}

export default function TitlesPage() {
  const { refreshStats } = useAuth();
  const [titles, setTitles]     = useState([]);
  const [equipped, setEquipped] = useState('');
  const [hasWarlordPass, setHasWarlordPass] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(null);

  useEffect(() => {
    client.get('/titles')
      .then(r => {
        setTitles(r.data.titles);
        setEquipped(r.data.equipped_title);
        setHasWarlordPass(r.data.hasWarlordPass);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleEquip(titleId, titleName) {
    setSaving(titleId);
    try {
      if (equipped === titleName) {
        await client.delete('/titles/equip');
        setEquipped('');
      } else {
        const { data } = await client.post(`/titles/equip/${titleId}`);
        setEquipped(data.equipped_title);
      }
      refreshStats();
    } catch { /* ignore */ } finally {
      setSaving(null);
    }
  }

  const regularTitles = titles.filter(t => !t.shadow);
  const shadowTitles  = titles.filter(t => t.shadow);
  const unlockedCount = regularTitles.filter(t => t.unlocked).length;

  return (
    <div className="page-enter min-h-screen">
      <NavHeader />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white"><ModeText id="titles.page.title" /></h1>
            {!loading && (
              <p className="text-xs text-gray-500 mt-0.5">{unlockedCount} / {regularTitles.length} earned</p>
            )}
          </div>
          {equipped && (
            <div className="text-right">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Equipped</p>
              <p className="text-sm font-semibold text-yellow-400">{equipped}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-24" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Regular titles grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {regularTitles.map(t => (
                <TitleCard
                  key={t.id}
                  t={t}
                  equipped={equipped}
                  saving={saving}
                  onEquip={handleEquip}
                  locked={false}
                />
              ))}
            </div>

            {/* Shadow titles section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-red-500">Shadow Titles</h2>
                <span className="text-[10px] font-bold bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-2 py-0.5 rounded-full">
                  👑 WARLORD PASS
                </span>
                {!hasWarlordPass && (
                  <span className="text-[10px] text-gray-600 italic">Upgrade to unlock</span>
                )}
              </div>

              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${!hasWarlordPass ? 'opacity-70' : ''}`}>
                {shadowTitles.map(t => (
                  <TitleCard
                    key={t.id}
                    t={t}
                    equipped={equipped}
                    saving={saving}
                    onEquip={handleEquip}
                    locked={!hasWarlordPass}
                    lockReason={!hasWarlordPass ? 'Warlord Pass Required' : undefined}
                  />
                ))}
              </div>

              {!hasWarlordPass && (
                <div className="rounded-xl border border-red-900/30 bg-red-950/10 px-4 py-3 flex items-center gap-3">
                  <span className="text-base">🔥</span>
                  <p className="text-xs text-red-400/80 leading-relaxed">
                    Shadow Titles are exclusive to <span className="text-red-400 font-semibold">Warlord Pass</span> holders.
                    They appear on the leaderboard and in duels — letting opponents know who they face.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
