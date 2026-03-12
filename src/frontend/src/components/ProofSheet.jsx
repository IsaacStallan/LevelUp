import { useState, useRef } from 'react';
import client from '../api/client.js';

/**
 * ProofSheet — bottom-sheet camera/upload flow for battle habit proof.
 *
 * Props:
 *   sheet    { battleId, habitName }
 *   isShadow bool
 *   onClose  () => void  — called after dismiss or successful submit
 */
export default function ProofSheet({ sheet, isShadow, onClose }) {
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
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
