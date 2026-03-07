import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import client from '../api/client.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

const LS_INSTALL  = 'vivify_install_dismissed';
const LS_PUSH     = 'vivify_notifications_dismissed';
const VAPID_KEY   = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !('MSStream' in window);
}
function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

// ── Install Modal ─────────────────────────────────────────────────────────────
function InstallModal({ isShadow, isIos, deferredPrompt, onDone }) {
  const [step, setStep] = useState('idle'); // idle | installing | done

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    setStep('installing');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setStep('done');
    else setStep('idle');
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl
        ${isShadow
          ? 'bg-gray-950/95 border-cyan-900/60'
          : 'bg-gray-900/95 border-purple-800/40'}`}>

        <div className="text-center mb-5">
          <div className="text-5xl mb-3">📲</div>
          <h2 className="text-lg font-bold text-white mb-1">
            {isShadow ? 'Claim Your Dominion' : 'Add Vivify to your Home Screen'}
          </h2>
          <p className={`text-sm ${isShadow ? 'text-gray-400' : 'text-gray-400'}`}>
            {isShadow
              ? 'Install the Dominion Console. Never miss a protocol.'
              : 'Get daily reminders and instant access to your habits.'}
          </p>
        </div>

        {isIos ? (
          <ol className="space-y-3 text-sm text-gray-300 mb-6">
            <li className="flex items-start gap-3">
              <span className="text-xl shrink-0">1️⃣</span>
              <span>Tap the <strong className="text-white">Share</strong> button <span className="text-blue-400">↑</span> at the bottom of your browser</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl shrink-0">2️⃣</span>
              <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl shrink-0">3️⃣</span>
              <span>Tap <strong className="text-white">Add</strong> to confirm</span>
            </li>
          </ol>
        ) : (
          <button
            onClick={handleAndroidInstall}
            disabled={step === 'installing'}
            className={`w-full py-3 rounded-xl font-semibold text-sm mb-4 transition-all
              ${isShadow
                ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 hover:bg-cyan-500/30'
                : 'bg-purple-700/80 text-white hover:bg-purple-600/80'}`}>
            {step === 'installing' ? 'Opening prompt…' : 'Add to Home Screen'}
          </button>
        )}

        <div className="text-center">
          <button onClick={onDone} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Push Notification Modal ───────────────────────────────────────────────────
function PushModal({ isShadow, onDone }) {
  const [status, setStatus] = useState('idle'); // idle | requesting | done | error

  async function handleEnable() {
    if (!VAPID_KEY) { onDone(); return; }
    setStatus('requesting');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('idle'); onDone(); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      await client.post('/push/subscribe', sub.toJSON());
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      onDone();
    }
  }

  return (
    <div className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl
        ${isShadow
          ? 'bg-gray-950/95 border-cyan-900/60'
          : 'bg-gray-900/95 border-purple-800/40'}`}>

        <div className="text-center mb-5">
          <div className="text-5xl mb-3">{isShadow ? '⚔️' : '🔥'}</div>
          <h2 className="text-lg font-bold text-white mb-1">
            {isShadow ? 'Activate Protocol Alerts ⚔️' : 'Stay on streak 🔥'}
          </h2>
          <p className="text-sm text-gray-400">
            Get notified if your streak is at risk. We only send one reminder per day.
          </p>
        </div>

        <button
          onClick={handleEnable}
          disabled={status === 'requesting'}
          className={`w-full py-3 rounded-xl font-semibold text-sm mb-4 transition-all
            ${isShadow
              ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 hover:bg-cyan-500/30'
              : 'bg-purple-700/80 text-white hover:bg-purple-600/80'}`}>
          {status === 'requesting' ? 'Requesting permission…' : 'Enable Notifications'}
        </button>

        <div className="text-center">
          <button onClick={onDone} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InstallPrompt() {
  const { isAuthenticated } = useAuth();
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';

  const [phase, setPhase] = useState(null); // null | 'install' | 'push'
  const deferredPromptRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Capture Android install prompt
    function onBeforeInstall(e) {
      e.preventDefault();
      deferredPromptRef.current = e;
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Determine what to show
    const installDismissed      = localStorage.getItem(LS_INSTALL);
    const pushDismissed         = localStorage.getItem(LS_PUSH);
    const alreadyInstalled      = isStandalone();
    const pushSupported         = 'PushManager' in window && 'serviceWorker' in navigator && VAPID_KEY;
    const notificationGranted   = Notification?.permission === 'granted';
    const ios                   = isIOS();

    // Nothing left to show
    if (installDismissed && (pushDismissed || !pushSupported || notificationGranted)) return;

    timerRef.current = setTimeout(() => {
      if (!installDismissed && !alreadyInstalled && (deferredPromptRef.current || ios)) {
        setPhase('install');
      } else if (!pushDismissed && pushSupported && !notificationGranted) {
        setPhase('push');
      }
    }, 60000);

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, [isAuthenticated]);

  function handleInstallDone() {
    localStorage.setItem(LS_INSTALL, '1');
    setPhase(null);
    const pushDismissed       = localStorage.getItem(LS_PUSH);
    const pushSupported       = 'PushManager' in window && 'serviceWorker' in navigator && VAPID_KEY;
    const notificationGranted = Notification?.permission === 'granted';
    if (!pushDismissed && pushSupported && !notificationGranted) {
      setTimeout(() => setPhase('push'), 5000);
    }
  }

  function handlePushDone() {
    localStorage.setItem(LS_PUSH, '1');
    setPhase(null);
  }

  if (!isAuthenticated || !phase) return null;

  if (phase === 'install') {
    return (
      <InstallModal
        isShadow={isShadow}
        isIos={isIOS()}
        deferredPrompt={deferredPromptRef.current}
        onDone={handleInstallDone}
      />
    );
  }

  if (phase === 'push') {
    return <PushModal isShadow={isShadow} onDone={handlePushDone} />;
  }

  return null;
}
