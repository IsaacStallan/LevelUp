import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import HabitCard from '../components/HabitCard.jsx';
import NavHeader from '../components/NavHeader.jsx';
import ModeText from '../components/ModeText.jsx';

const PRESET_COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#dc2626', '#ea580c', '#0891b2'];
const PRESET_ICONS  = ['✅', '💪', '📚', '🧘', '🏃', '💧', '🎯', '🌿'];
const EMPTY_FORM    = { name: '', description: '', color: '#7c3aed', icon: '✅' };

function parseHabitsJson(json) {
  try { return JSON.parse(json || '[]'); } catch { return []; }
}

// ── Active Duels Tab ─────────────────────────────────────────────────────────

function ProofStatusBadge({ status, isShadow }) {
  if (status === 'verified')
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isShadow ? 'bg-red-900/40 text-red-300 border border-red-700/40' : 'bg-green-900/40 text-green-300 border border-green-700/40'}`}>{isShadow ? '✓ VERIFIED' : '✅ Verified'}</span>;
  if (status === 'pending')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40">{isShadow ? '⏳ TRIBUNAL' : '⏳ Pending'}</span>;
  if (status === 'disputed')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-800/40">✗ Disputed</span>;
  return null;
}

function DuelHabitRow({ habit, proof, isShadow, onSubmit }) {
  const status = proof?.final_verified ? 'verified'
    : proof?.disputed_at ? 'disputed'
    : proof ? 'pending'
    : null;

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-base shrink-0">{habit.icon}</span>
      <span className="flex-1 text-sm text-gray-300 truncate">{habit.name}</span>
      {status ? (
        <ProofStatusBadge status={status} isShadow={isShadow} />
      ) : (
        <button
          onClick={() => onSubmit(habit.name)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
            isShadow
              ? 'bg-red-900/30 border border-red-700/40 text-red-300 hover:bg-red-800/40'
              : 'bg-purple-900/30 border border-purple-700/40 text-purple-300 hover:bg-purple-800/40'
          }`}
        >
          {isShadow ? 'Submit Evidence' : 'Submit Proof'}
        </button>
      )}
    </div>
  );
}

function DuelCard({ battle, userId, isShadow, expanded, onToggle, proofs, onSubmit }) {
  const isChallenger = battle.challenger_id === userId;
  const myHabits = isChallenger
    ? parseHabitsJson(battle.opponent_assigned_habits)
    : parseHabitsJson(battle.challenger_assigned_habits);
  const theirName = isChallenger ? battle.opponent_username : battle.challenger_username;
  const myScore   = isChallenger ? battle.challenger_score : battle.opponent_score;
  const remaining = Math.max(0, Math.ceil((new Date(battle.ends_at) - Date.now()) / 86400000));

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  function getProof(habitName) {
    return proofs?.find(p => p.user_id === userId && p.habit_name === habitName && p.completed_date === today);
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${isShadow ? 'border-red-900/30' : 'border-white/[0.08]'}`}
      style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.94), rgba(8,4,20,0.98))' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <span className="text-xl">⚔️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-200 truncate">vs {theirName ?? '?'}</p>
          <p className="text-[10px] text-gray-600">{remaining}d left · {myScore}% you</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-600">{myHabits.length} habit{myHabits.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04]">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold pt-3 pb-2">
            {isShadow ? 'Your Sentence' : 'Your Assigned Habits'}
          </p>
          {myHabits.length === 0 ? (
            <p className="text-xs text-gray-600 italic py-2">No habits assigned yet</p>
          ) : myHabits.map(h => (
            <DuelHabitRow
              key={h.name}
              habit={h}
              proof={getProof(h.name)}
              isShadow={isShadow}
              onSubmit={(habitName) => onSubmit(battle.id, habitName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Proof Bottom Sheet ────────────────────────────────────────────────────────

function ProofSheet({ sheet, isShadow, onClose }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [state, setState] = useState('idle'); // idle | uploading | verified | pending | rejected
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setState('idle');
    setResult(null);
  }

  async function handleSubmit() {
    if (!photoFile) return;
    setState('uploading');
    const formData = new FormData();
    formData.append('habit_name', sheet.habitName);
    formData.append('photo', photoFile);
    try {
      const { data } = await client.post(`/battles/${sheet.battleId}/submit-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.aiVerified && data.confidence > 0.75) setState('verified');
      else if (data.aiVerified === false) setState('rejected');
      else setState('pending');
    } catch (err) {
      setResult({ reasoning: err.response?.data?.error || 'Upload failed' });
      setState('rejected');
    }
  }

  function close() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    onClose();
  }

  const isDone = state === 'verified' || state === 'pending';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
      {/* Sheet */}
      <div style={{ position: 'relative', background: 'rgba(12,6,28,0.99)', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px 20px 0 0', padding: '24px 16px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">
              {isShadow ? 'Submit Evidence' : 'Submit Proof'}
            </p>
            <p className="text-sm font-semibold text-gray-200">{sheet.habitName}</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>✕</button>
        </div>

        {state === 'uploading' ? (
          <div className="text-center py-8 space-y-3">
            <div className="text-3xl animate-pulse">🤖</div>
            <p className="text-sm text-gray-400">{isShadow ? 'Tribunal is reviewing...' : 'AI is verifying your proof...'}</p>
          </div>

        ) : state === 'verified' ? (
          <div className="text-center py-6 space-y-3">
            <div className={`text-4xl ${isShadow ? '' : 'animate-bounce'}`}>{isShadow ? '⚔️' : '✅'}</div>
            <p className={`text-base font-bold ${isShadow ? 'text-red-400' : 'text-green-400'}`}>
              {isShadow ? 'VERIFIED — PROTOCOL LOGGED' : 'Verified! +1 completion'}
            </p>
            {result?.reasoning && <p className="text-xs text-gray-500">{result.reasoning}</p>}
            <button onClick={close} className={`mt-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all ${isShadow ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}>Done</button>
          </div>

        ) : state === 'pending' ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">⏳</div>
            <p className="text-sm font-semibold text-amber-300">
              {isShadow ? 'AWAITING TRIBUNAL' : 'Sent to opponent for review'}
            </p>
            <p className="text-xs text-gray-500">Your opponent will verify the proof</p>
            <button onClick={close} className="mt-2 px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all">Close</button>
          </div>

        ) : state === 'rejected' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-3 text-center">
              <p className="text-sm font-semibold text-red-400">❌ {isShadow ? 'Evidence rejected' : 'Proof rejected'}</p>
              {result?.reasoning && <p className="text-xs text-gray-500 mt-1">{result.reasoning}</p>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition-all">
              Try Again — Retake Photo
            </button>
          </div>

        ) : (
          /* idle state */
          <div className="space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img src={photoPreview} alt="Proof preview" className="w-full h-full object-cover" />
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 text-xs bg-black/60 border border-white/10 text-gray-300 px-2 py-1 rounded-lg">Retake</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-all">
                <span className="text-4xl">📷</span>
                <p className="text-sm text-gray-500">{isShadow ? 'Capture your evidence' : 'Take a photo or choose from library'}</p>
              </button>
            )}

            {photoFile && (
              <button onClick={handleSubmit}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 ${
                  isShadow ? 'bg-red-700 hover:bg-red-600' : 'bg-purple-700 hover:bg-purple-600'
                }`}>
                {isShadow ? 'Submit to Tribunal ⚔️' : 'Submit Proof'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const [habits, setHabits]       = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(true);
  const { user } = useAuth();
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();

  const [activeTab, setActiveTab]       = useState('habits');
  const [battles, setBattles]           = useState([]);
  const [battlesLoading, setBattlesLoading] = useState(false);
  const [expanded, setExpanded]         = useState(null);
  const [battleProofs, setBattleProofs] = useState({});
  const [sheet, setSheet]               = useState(null); // { battleId, habitName }

  useEffect(() => {
    client.get('/habits')
      .then(r => setHabits(r.data))
      .catch(err => { if (err.response?.status === 403) navigate('/upgrade'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (activeTab !== 'duels') return;
    setBattlesLoading(true);
    client.get('/battles/mine')
      .then(r => setBattles(r.data.filter(b => b.status === 'active')))
      .finally(() => setBattlesLoading(false));
  }, [activeTab]);

  async function handleExpand(battleId) {
    if (expanded === battleId) { setExpanded(null); return; }
    setExpanded(battleId);
    if (!battleProofs[battleId]) {
      try {
        const { data } = await client.get(`/battles/${battleId}/proofs`);
        setBattleProofs(prev => ({ ...prev, [battleId]: data }));
      } catch { /* ignore */ }
    }
  }

  function openSheet(battleId, habitName) {
    setSheet({ battleId, habitName });
  }

  async function closeSheet() {
    if (sheet) {
      // Refresh proofs for the battle
      try {
        const { data } = await client.get(`/battles/${sheet.battleId}/proofs`);
        setBattleProofs(prev => ({ ...prev, [sheet.battleId]: data }));
      } catch { /* ignore */ }
    }
    setSheet(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        const { data } = await client.put(`/habits/${editingId}`, form);
        setHabits(prev => prev.map(h => h.id === editingId ? { ...h, ...data } : h));
      } else {
        const { data } = await client.post('/habits', form);
        setHabits(prev => [...prev, { ...data, completed_today: 0 }]);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save habit');
    }
  }

  function handleEdit(habit) {
    setForm({ name: habit.name, description: habit.description || '', color: habit.color, icon: habit.icon });
    setEditingId(habit.id);
    setShowForm(true);
    setTimeout(() => document.getElementById('habit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function handleDelete(habitId) {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await client.delete(`/habits/${habitId}`);
      setHabits(prev => prev.filter(h => h.id !== habitId));
    } catch { setError('Failed to delete habit'); }
  }

  function cancelForm() {
    setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); setError('');
  }

  const tabs = [
    { id: 'habits', label: isShadow ? 'Protocol' : 'My Habits' },
    { id: 'duels',  label: isShadow ? 'Duels' : 'Active Duels' },
  ];

  return (
    <div className="min-h-screen">
      <NavHeader />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-white"><ModeText id="habits.page.title" /></h1>
          {activeTab === 'habits' && !showForm && (
            <button onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors">
              + New
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? isShadow ? 'bg-red-800/40 text-red-300' : 'bg-purple-800/40 text-purple-300'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── My Habits Tab ── */}
        {activeTab === 'habits' && (
          <>
            {showForm && (
              <div id="habit-form" className="bg-gray-900 rounded-2xl border border-gray-800 p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">
                  {editingId ? <ModeText id="habits.form.edit" /> : <ModeText id="habits.form.new" />}
                </h2>
                {error && <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                      placeholder="e.g. Morning meditation" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                      placeholder="Optional description" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_ICONS.map(icon => (
                        <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                          className={`text-xl p-2 rounded-lg transition-all min-w-[40px] min-h-[40px] flex items-center justify-center ${form.icon === icon ? 'bg-purple-700 ring-2 ring-purple-500' : 'bg-gray-800 hover:bg-gray-700'}`}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Color</label>
                    <div className="flex gap-3 flex-wrap">
                      {PRESET_COLORS.map(color => (
                        <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                          className={`w-8 h-8 rounded-full transition-all ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
                          style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                      {editingId ? 'Save Changes' : <ModeText id="habits.create.btn" />}
                    </button>
                    <button type="button" onClick={cancelForm} className="flex-1 sm:flex-none bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2.5 rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading habits…</div>
            ) : habits.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 border-dashed p-8 text-center">
                <p className="text-gray-500 text-sm sm:text-base"><ModeText id="habits.empty" /></p>
              </div>
            ) : (
              <div className="space-y-2">
                {habits.map(h => (
                  <HabitCard key={h.id} habit={h} completedToday={!!h.completed_today} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Active Duels Tab ── */}
        {activeTab === 'duels' && (
          <div className="space-y-3">
            {battlesLoading ? (
              <div className="text-center text-gray-500 py-8">Loading duels…</div>
            ) : battles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.06] p-8 text-center">
                <p className="text-3xl mb-3">⚔️</p>
                <p className="text-gray-500 text-sm">{isShadow ? 'No active duels.' : 'No active battles.'}</p>
              </div>
            ) : battles.map(battle => (
              <DuelCard
                key={battle.id}
                battle={battle}
                userId={user?.id}
                isShadow={isShadow}
                expanded={expanded === battle.id}
                onToggle={() => handleExpand(battle.id)}
                proofs={battleProofs[battle.id]}
                onSubmit={openSheet}
              />
            ))}
          </div>
        )}
      </main>

      {/* Proof Sheet */}
      {sheet && <ProofSheet sheet={sheet} isShadow={isShadow} onClose={closeSheet} />}
    </div>
  );
}
