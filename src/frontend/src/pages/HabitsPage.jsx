import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import HabitCard from '../components/HabitCard.jsx';
import NavHeader from '../components/NavHeader.jsx';
import ModeText from '../components/ModeText.jsx';

const PRESET_COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#dc2626', '#ea580c', '#0891b2'];
const PRESET_ICONS  = ['✅', '💪', '📚', '🧘', '🏃', '💧', '🎯', '🌿'];
const EMPTY_FORM    = { name: '', description: '', color: '#7c3aed', icon: '✅' };

export default function HabitsPage() {
  const [habits, setHabits]       = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(true);
  const { user }     = useAuth();
  const navigate     = useNavigate();

  useEffect(() => {
    client.get('/habits')
      .then(r => setHabits(r.data))
      .catch(err => { if (err.response?.status === 403) navigate('/upgrade'); })
      .finally(() => setLoading(false));
  }, [navigate]);

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
    // Scroll form into view on mobile
    setTimeout(() => document.getElementById('habit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function handleDelete(habitId) {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await client.delete(`/habits/${habitId}`);
      setHabits(prev => prev.filter(h => h.id !== habitId));
    } catch {
      setError('Failed to delete habit');
    }
  }

  function cancelForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  }

  return (
    <div className="min-h-screen">
      <NavHeader level={user?.level ?? 0} />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-white"><ModeText id="habits.page.title" /></h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
            >
              + New
            </button>
          )}
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div id="habit-form" className="bg-gray-900 rounded-2xl border border-gray-800 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              {editingId ? <ModeText id="habits.form.edit" /> : <ModeText id="habits.form.new" />}
            </h2>
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
                {error}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                  placeholder="e.g. Morning meditation"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`text-xl p-2 rounded-lg transition-all min-w-[40px] min-h-[40px] flex items-center justify-center ${
                        form.icon === icon ? 'bg-purple-700 ring-2 ring-purple-500' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Color</label>
                <div className="flex gap-3 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-full transition-all ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  {editingId ? 'Save Changes' : <ModeText id="habits.create.btn" />}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 sm:flex-none bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Habits list */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading habits…</div>
        ) : habits.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 border-dashed p-8 text-center">
            <p className="text-gray-500 text-sm sm:text-base"><ModeText id="habits.empty" /></p>
          </div>
        ) : (
          <div className="space-y-2">
            {habits.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                completedToday={!!h.completed_today}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
