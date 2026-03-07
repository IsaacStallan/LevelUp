import { useState, useCallback } from 'react';

const STYLE_ID = 'crt-transition-styles';

// ── SVG crack pattern — 8 jagged lines + sub-cracks radiating from center ────
const CRACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg"
  style="position:absolute;inset:0;width:100%;height:100%;display:block"
  viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="crt-crack-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#crt-crack-glow)" stroke-linecap="round" stroke-linejoin="round" fill="none" class="crt-cracks">
    <path d="M50,50 L49,42 L53,33 L47,22 L51,8"         stroke="#fff"    stroke-width="0.5"/>
    <path d="M50,50 L57,44 L65,36 L73,26 L83,15"         stroke="#00ffff" stroke-width="0.4"/>
    <path d="M50,50 L59,51 L70,48 L82,53 L94,49"         stroke="#fff"    stroke-width="0.48"/>
    <path d="M50,50 L56,59 L63,68 L69,79 L76,93"         stroke="#00ffff" stroke-width="0.38"/>
    <path d="M50,50 L51,61 L47,73 L53,85 L48,98"         stroke="#fff"    stroke-width="0.42"/>
    <path d="M50,50 L43,58 L36,67 L28,77 L19,89"         stroke="#00ffff" stroke-width="0.36"/>
    <path d="M50,50 L40,50 L29,46 L17,51 L4,47"          stroke="#fff"    stroke-width="0.48"/>
    <path d="M50,50 L43,42 L35,33 L27,23 L16,11"         stroke="#00ffff" stroke-width="0.4"/>
    <!-- secondary hairline cracks -->
    <path d="M53,33 L58,27 L54,19"                       stroke="#fff"    stroke-width="0.25" opacity="0.6"/>
    <path d="M63,68 L70,63 L76,67"                       stroke="#00ffff" stroke-width="0.22" opacity="0.55"/>
    <path d="M40,50 L34,43 L28,46"                       stroke="#fff"    stroke-width="0.22" opacity="0.5"/>
    <path d="M57,44 L62,40 L68,43"                       stroke="#00ffff" stroke-width="0.2"  opacity="0.45"/>
  </g>
  <!-- epicenter -->
  <circle cx="50" cy="50" r="1.8"  fill="white"               opacity="0.95"/>
  <circle cx="50" cy="50" r="4.5"  fill="none" stroke="white"               stroke-width="0.3" opacity="0.55"/>
  <circle cx="50" cy="50" r="9"    fill="none" stroke="rgba(0,255,255,0.35)" stroke-width="0.2" opacity="0.4"/>
</svg>`;

const CSS = `
  @keyframes crt-crack-appear {
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes crt-scanlines-fast {
    from { background-position: 0 0; }
    to   { background-position: 0 80px; }
  }
  @keyframes crt-shutdown {
    0%   { transform: scaleY(1);     filter: brightness(1); }
    30%  { transform: scaleY(0.07);  filter: brightness(3.5); }
    60%  { transform: scaleY(0.004); filter: brightness(7); }
    80%  { transform: scaleY(0.001); filter: brightness(10); }
    100% { transform: scaleY(0.001); filter: brightness(0); }
  }
  @keyframes crt-line-pulse-shrink {
    0%   { transform: scaleX(1)    scaleY(1);    opacity: 1;   box-shadow: 0 0 28px 10px #fff, 0 0 55px 22px rgba(255,255,255,0.45); }
    15%  { transform: scaleX(1.01) scaleY(3.5);  opacity: 1;   box-shadow: 0 0 42px 16px #fff; }
    30%  { transform: scaleX(0.98) scaleY(0.6);  opacity: 1;   box-shadow: 0 0 55px 22px #fff; }
    48%  { transform: scaleX(1.0)  scaleY(2.5);  opacity: 1;   box-shadow: 0 0 38px 14px #fff; }
    63%  { transform: scaleX(0.38) scaleY(1);    opacity: 1;   box-shadow: 0 0 72px 28px #fff; }
    78%  { transform: scaleX(0.07) scaleY(0.4);  opacity: 1;   box-shadow: 0 0 95px 36px #fff; }
    90%  { transform: scaleX(0.01) scaleY(0.2);  opacity: 0.8; box-shadow: 0 0 120px 42px #fff; }
    100% { transform: scaleX(0)    scaleY(0);    opacity: 0;   box-shadow: none; }
  }
  @keyframes crt-reboot {
    0%   { transform: scaleY(0.001); filter: brightness(0);    opacity: 0; }
    6%   { transform: scaleY(0.001); filter: brightness(5);    opacity: 1; }
    12%  { transform: scaleY(0.001); filter: brightness(0);    opacity: 0; }
    18%  { transform: scaleY(0.001); filter: brightness(6);    opacity: 1; }
    24%  { transform: scaleY(0.001); filter: brightness(0);    opacity: 0; }
    30%  { transform: scaleY(0.001); filter: brightness(7);    opacity: 1; }
    36%  { transform: scaleY(0.001); filter: brightness(0);    opacity: 0; }
    44%  { transform: scaleY(0.001); filter: brightness(5.5);  opacity: 1; }
    57%  { transform: scaleY(0.3);   filter: brightness(1.7);  opacity: 1; }
    71%  { transform: scaleY(1.04);  filter: brightness(1.25); opacity: 1; }
    83%  { transform: scaleY(0.98);  filter: brightness(1.06); opacity: 1; }
    92%  { transform: scaleY(1.01);  filter: brightness(1.02); opacity: 1; }
    100% { transform: scaleY(1);     filter: brightness(1);    opacity: 1; }
  }
  @keyframes crt-scan {
    from { top: -4px; opacity: 0.95; }
    to   { top: 100%; opacity: 0; }
  }
  @keyframes crt-bloom {
    0%   { opacity: 0; }
    18%  { opacity: 0.65; }
    100% { opacity: 0; }
  }
  @keyframes crt-chroma {
    0%   {
      text-shadow: -4px 0 rgba(255,0,0,0.85), 4px 0 rgba(0,255,255,0.85);
      filter: drop-shadow(-3px 0 rgba(255,0,0,0.55)) drop-shadow(3px 0 rgba(0,255,255,0.55));
    }
    50%  {
      text-shadow: -2px 0 rgba(255,0,0,0.4), 2px 0 rgba(0,255,255,0.4);
      filter: drop-shadow(-1px 0 rgba(255,0,0,0.2)) drop-shadow(1px 0 rgba(0,255,255,0.2));
    }
    100% { text-shadow: none; filter: none; }
  }
  .crt-cracks {
    animation: crt-crack-appear 200ms ease-out forwards;
  }
  #root.crt-shutdown {
    animation: crt-shutdown var(--crt-t-shut, 400ms) ease-in forwards;
    transform-origin: center center;
  }
  #root.crt-reboot {
    animation: crt-reboot var(--crt-t-boot, 500ms) ease-out forwards;
    transform-origin: center center;
  }
  #root.crt-chroma {
    animation: crt-chroma var(--crt-t-settl, 300ms) ease-out forwards;
  }
`;

function injectStyles() {
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function playSound(toMode) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t   = ctx.currentTime;

    if (toMode === 'SHADOW') {
      // Deep layered bass hit
      const osc1  = ctx.createOscillator();
      const osc2  = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const master = ctx.createGain();
      master.gain.value = 0.75;

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(85, t);
      osc1.frequency.exponentialRampToValueAtTime(22, t + 0.45);
      gain1.gain.setValueAtTime(0.55, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(52, t);
      osc2.frequency.exponentialRampToValueAtTime(16, t + 0.38);
      gain2.gain.setValueAtTime(0.28, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc1.connect(gain1); gain1.connect(master);
      osc2.connect(gain2); gain2.connect(master);
      master.connect(ctx.destination);

      osc1.start(t); osc1.stop(t + 0.5);
      osc2.start(t); osc2.stop(t + 0.42);
    } else {
      // Soft two-harmonic chime
      const osc1  = ctx.createOscillator();
      const osc2  = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'sine'; osc1.frequency.value = 660;
      osc2.type = 'sine'; osc2.frequency.value = 990;

      gain1.gain.setValueAtTime(0.2,  t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      gain2.gain.setValueAtTime(0.12, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc2.connect(gain2); gain2.connect(ctx.destination);

      osc1.start(t); osc1.stop(t + 0.5);
      osc2.start(t); osc2.stop(t + 0.35);
    }

    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCRTTransition() {
  const [transitioning, setTransitioning] = useState(false);

  const triggerTransition = useCallback((toMode, onSwap) => {
    if (transitioning) return;
    setTransitioning(true);
    injectStyles();

    const mobile = window.innerWidth < 640;
    const root   = document.getElementById('root');

    if (!root) { onSwap(); setTransitioning(false); return; }

    const T_CRACK = mobile ? 350  : 600;
    const T_SHUT  = mobile ? 250  : 400;
    const T_VOID  = mobile ? 180  : 300;
    const T_BOOT  = mobile ? 320  : 500;
    const T_SETTL = mobile ? 150  : 300;

    root.style.setProperty('--crt-t-shut',  `${T_SHUT}ms`);
    root.style.setProperty('--crt-t-boot',  `${T_BOOT}ms`);
    root.style.setProperty('--crt-t-settl', `${T_SETTL}ms`);
    root.style.transformOrigin = 'center center';

    // Overlay is a direct body child so #root transforms don't affect it
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;pointer-events:none;overflow:hidden;background:transparent;';
    document.body.appendChild(overlay);

    // ── Phase 1: Screen crack + glitch ─────────────────────────────────────────

    // SVG crack
    const crackWrap = document.createElement('div');
    crackWrap.style.cssText = 'position:absolute;inset:0;';
    crackWrap.innerHTML = CRACK_SVG;
    overlay.appendChild(crackWrap);

    // Horizontal scan lines sweeping fast across screen
    const scanlines = document.createElement('div');
    scanlines.style.cssText =
      'position:absolute;inset:0;' +
      'background:repeating-linear-gradient(0deg,transparent 0px,transparent 3px,' +
      'rgba(255,255,255,0.028) 3px,rgba(255,255,255,0.028) 4px);' +
      `animation:crt-scanlines-fast ${mobile ? 55 : 75}ms linear infinite;`;
    overlay.appendChild(scanlines);

    // White horizontal line (shown during shutdown, then shrinks)
    const line = document.createElement('div');
    line.style.cssText =
      'position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;' +
      'background:#fff;transform-origin:center;opacity:0;';
    overlay.appendChild(line);

    // JS-driven rapid glitch on #root (50ms ticks)
    const glitchStates = [
      { tr: 'translateX(-4px)', fi: 'brightness(1.35) hue-rotate(90deg)' },
      { tr: 'translateX(4px)',  fi: 'brightness(0.78)' },
      { tr: 'translateX(-3px)', fi: 'brightness(1.55) hue-rotate(-60deg)' },
      { tr: 'translateX(5px)',  fi: 'brightness(1.1) hue-rotate(120deg)' },
      { tr: 'translateX(-5px)', fi: 'brightness(0.72)' },
      { tr: 'translateX(2px)',  fi: 'brightness(1.45) hue-rotate(-90deg)' },
      { tr: 'translateX(-2px)', fi: 'brightness(1.2)' },
      { tr: 'translateX(4px)',  fi: 'brightness(0.85) hue-rotate(45deg)' },
    ];
    let gi = 0;
    const glitchInterval = setInterval(() => {
      const s = glitchStates[gi % glitchStates.length];
      root.style.transform = s.tr;
      root.style.filter    = s.fi;
      gi++;
    }, 50);

    // ── Phase 2: CRT shutdown ───────────────────────────────────────────────────
    setTimeout(() => {
      clearInterval(glitchInterval);
      root.style.transform = '';
      root.style.filter    = '';
      root.classList.add('crt-shutdown');

      // Fade crack out as shutdown begins
      crackWrap.style.transition = `opacity ${T_SHUT * 0.4}ms ease-out`;
      crackWrap.style.opacity    = '0';

      // Show pulsing line at ~35% through shutdown, animate until collapse
      setTimeout(() => {
        line.style.opacity   = '1';
        line.style.animation = `crt-line-pulse-shrink ${T_SHUT * 0.88}ms ease-in-out forwards`;
      }, T_SHUT * 0.35);
    }, T_CRACK);

    // ── Phase 3: Black void + mode swap ────────────────────────────────────────
    setTimeout(() => {
      root.classList.remove('crt-shutdown');
      root.style.transform = 'scaleY(0.001)';
      root.style.filter    = 'brightness(0)';
      overlay.style.background = '#000';
      crackWrap.remove();
      scanlines.remove();

      playSound(toMode);
      onSwap(); // mode swaps here — screen is black, transition invisible
    }, T_CRACK + T_SHUT);

    // ── Phase 4: Reboot flicker + expand ───────────────────────────────────────
    setTimeout(() => {
      overlay.style.background = 'transparent';
      root.style.transform     = '';
      root.style.filter        = '';
      root.classList.add('crt-reboot');

      // Green phosphor scan (Shadow) or white bloom (Light)
      if (toMode === 'SHADOW') {
        const scan = document.createElement('div');
        scan.style.cssText =
          'position:absolute;left:0;right:0;height:5px;top:0;' +
          'background:linear-gradient(transparent,rgba(0,255,80,0.95),transparent);' +
          `box-shadow:0 0 22px 5px rgba(0,255,80,0.85);` +
          `animation:crt-scan ${T_BOOT * 0.62}ms ease-in forwards;` +
          `animation-delay:${T_BOOT * 0.28}ms;`;
        overlay.appendChild(scan);
        setTimeout(() => scan.remove(), T_BOOT);
      } else {
        const bloom = document.createElement('div');
        bloom.style.cssText =
          'position:absolute;inset:0;' +
          'background:radial-gradient(ellipse at center,rgba(255,255,255,0.32) 0%,transparent 66%);' +
          `animation:crt-bloom ${T_BOOT}ms ease-out forwards;`;
        overlay.appendChild(bloom);
        setTimeout(() => bloom.remove(), T_BOOT);
      }
    }, T_CRACK + T_SHUT + T_VOID);

    // ── Settle: chromatic aberration ───────────────────────────────────────────
    setTimeout(() => {
      root.classList.remove('crt-reboot');
      root.style.transform = '';
      root.style.filter    = '';
      root.classList.add('crt-chroma');
    }, T_CRACK + T_SHUT + T_VOID + T_BOOT);

    // ── Cleanup ────────────────────────────────────────────────────────────────
    setTimeout(() => {
      root.classList.remove('crt-chroma');
      root.style.removeProperty('--crt-t-shut');
      root.style.removeProperty('--crt-t-boot');
      root.style.removeProperty('--crt-t-settl');
      root.style.removeProperty('transform-origin');
      overlay.remove();
      setTransitioning(false);
    }, T_CRACK + T_SHUT + T_VOID + T_BOOT + T_SETTL + 20);

  }, [transitioning]);

  return { triggerTransition, transitioning };
}
