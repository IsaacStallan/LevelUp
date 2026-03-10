import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import PlayerName from '../components/PlayerName.jsx';
import ModeText from '../components/ModeText.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import client from '../api/client.js';

/* ── debounce ── */
function useDebounce(value, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/* ── FriendRow: shown in legion list ─────────────────────────────────────── */
function FriendRow({ friend, isShadow, onRemove, onChallenge }) {
  const accentClass = isShadow ? 'text-red-400' : 'text-purple-400';
  return (
    <div className="glass-card rounded-xl border border-white/[0.07] px-4 py-3 flex items-center gap-3">
      <Avatar username={friend.username} size={38} hasWarlordPass={friend.has_warlord_pass} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlayerName
            name={friend.username}
            hasWarlordPass={friend.has_warlord_pass}
            className="text-sm font-semibold text-white"
          />
          {friend.equipped_title && (
            <span className="text-[10px] bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-1.5 py-0.5 rounded-full shrink-0">
              {friend.equipped_title}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Lv.{friend.level}
          {friend.rank ? ` · #${friend.rank} globally` : ''}
          {friend.duel_wins > 0 ? ` · ${friend.duel_wins}W` : ''}
          {friend.active_today ? (
            <span className="ml-1.5 text-green-500/80">● <ModeText id="friends.active_today" /></span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChallenge(friend)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
            isShadow
              ? 'border-red-700/60 text-red-400 hover:bg-red-900/30'
              : 'border-purple-700/60 text-purple-400 hover:bg-purple-900/30'
          }`}
        >
          ⚔️ <ModeText id="friends.challenge" />
        </button>
        <button
          onClick={() => onRemove(friend.friendship_id)}
          className="text-[11px] text-gray-700 hover:text-red-500 transition-colors px-1"
          title="Remove friend"
        >×</button>
      </div>
    </div>
  );
}

/* ── RequestRow: shown in incoming requests ──────────────────────────────── */
function RequestRow({ req: fr, isShadow, onRespond }) {
  const [loading, setLoading] = useState(null);
  async function respond(action) {
    setLoading(action);
    await onRespond(fr.friendship_id, action);
    setLoading(null);
  }
  return (
    <div className="glass-card rounded-xl border border-white/[0.07] px-4 py-3 flex items-center gap-3">
      <Avatar username={fr.username} size={36} hasWarlordPass={fr.has_warlord_pass} />
      <div className="flex-1 min-w-0">
        <PlayerName name={fr.username} hasWarlordPass={fr.has_warlord_pass} className="text-sm font-semibold text-white" />
        <p className="text-[11px] text-gray-500 mt-0.5">Lv.{fr.level}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => respond('accept')}
          disabled={loading !== null}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 ${
            isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
          }`}
        >{loading === 'accept' ? '…' : 'Accept'}</button>
        <button
          onClick={() => respond('decline')}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
        >{loading === 'decline' ? '…' : 'Decline'}</button>
      </div>
    </div>
  );
}

/* ── SearchResultRow ─────────────────────────────────────────────────────── */
function SearchResultRow({ entry, isShadow, onRequest }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(entry.friendship_status);
  const iMine = entry.i_requested;

  async function handleAdd() {
    setLoading(true);
    try {
      await onRequest(entry.id);
      setStatus('pending');
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  let btnLabel, btnDisabled;
  if (status === 'accepted') { btnLabel = 'Friends ✓'; btnDisabled = true; }
  else if (status === 'pending' && iMine) { btnLabel = 'Request Sent'; btnDisabled = true; }
  else if (status === 'pending' && !iMine) { btnLabel = 'Accept'; btnDisabled = false; }
  else { btnLabel = <ModeText id="friends.add" />; btnDisabled = false; }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] hover:border-white/10 transition-colors"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <Avatar username={entry.username} size={34} hasWarlordPass={entry.has_warlord_pass} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlayerName name={entry.username} hasWarlordPass={entry.has_warlord_pass} className="text-sm font-semibold text-white" />
          {entry.equipped_title && (
            <span className="text-[10px] bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-1.5 py-0.5 rounded-full shrink-0">
              {entry.equipped_title}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">Lv.{entry.level}</p>
      </div>
      <button
        onClick={handleAdd}
        disabled={btnDisabled || loading}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all active:scale-95 disabled:opacity-50 shrink-0 ${
          status === 'accepted'
            ? 'border-green-700/40 text-green-400'
            : isShadow
              ? 'border-red-700/60 text-red-400 hover:bg-red-900/30'
              : 'border-purple-700/60 text-purple-400 hover:bg-purple-900/30'
        }`}
      >{loading ? '…' : btnLabel}</button>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function FriendsPage() {
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();

  const [friends, setFriends]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const debouncedQ = useDebounce(query);
  const searchRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [frRes, reqRes] = await Promise.all([
        client.get('/friends'),
        client.get('/friends/requests'),
      ]);
      setFriends(frRes.data);
      setRequests(reqRes.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); return; }
    setSearching(true);
    client.get(`/friends/search?q=${encodeURIComponent(debouncedQ)}`)
      .then(r => setResults(r.data))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQ]);

  async function handleRequest(addressee_id) {
    await client.post('/friends/request', { addressee_id });
  }

  async function handleRespond(friendship_id, action) {
    await client.post('/friends/respond', { friendship_id, action });
    await fetchAll();
    // refresh search results so status updates
    if (query.trim()) {
      const r = await client.get(`/friends/search?q=${encodeURIComponent(query)}`);
      setResults(r.data);
    }
  }

  async function handleRemove(friendship_id) {
    if (!window.confirm('Remove this friend?')) return;
    await client.delete(`/friends/${friendship_id}`);
    await fetchAll();
  }

  function handleChallenge(friend) {
    navigate(`/battles?opponent_id=${friend.id}&opponent_username=${encodeURIComponent(friend.username)}`);
  }

  const accentClass = isShadow ? 'text-red-400' : 'text-purple-400';

  return (
    <div className="page-enter min-h-screen">
      <NavHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
            <ModeText id="friends.page.title" />
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isShadow ? 'Build your legion. Issue challenges.' : 'Search for friends and challenge them to duels.'}
          </p>
        </div>

        {/* Search */}
        <div ref={searchRef} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isShadow ? 'Seek warriors by username...' : 'Search warriors by username...'}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/25 transition-all pr-10"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">…</span>
            )}
          </div>

          {results.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden divide-y divide-white/[0.05]"
              style={{ background: 'rgba(10,6,25,0.95)' }}>
              {results.map(entry => (
                <SearchResultRow
                  key={entry.id}
                  entry={entry}
                  isShadow={isShadow}
                  onRequest={handleRequest}
                />
              ))}
            </div>
          )}
          {!searching && query.trim().length > 0 && results.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-3">No warriors found matching "{query}"</p>
          )}
        </div>

        {/* Incoming requests */}
        {requests.length > 0 && (
          <section className="space-y-2">
            <h2 className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>
              <ModeText id="friends.requests" />
              <span className="ml-2 bg-red-700 text-white text-[10px] px-1.5 py-0.5 rounded-full tabular-nums">
                {requests.length}
              </span>
            </h2>
            {requests.map(fr => (
              <RequestRow
                key={fr.friendship_id}
                req={fr}
                isShadow={isShadow}
                onRespond={handleRespond}
              />
            ))}
          </section>
        )}

        {/* Legion / Friends list */}
        <section className="space-y-2">
          <h2 className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>
            <ModeText id="friends.legion" />
            {friends.length > 0 && (
              <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal">{friends.length}</span>
            )}
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton rounded-xl h-16" />)}
            </div>
          ) : friends.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] p-8 text-center"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-gray-500 text-sm"><ModeText id="friends.empty" /></p>
            </div>
          ) : (
            friends.map(fr => (
              <FriendRow
                key={fr.friendship_id}
                friend={fr}
                isShadow={isShadow}
                onRemove={handleRemove}
                onChallenge={handleChallenge}
              />
            ))
          )}
        </section>

      </main>
    </div>
  );
}
