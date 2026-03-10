import { memo, useEffect } from 'react';
import { useMode } from '../contexts/ModeContext.jsx';

const STYLE_ID = 'bg-scene-styles';
const SCENE_ID = 'bg-scene';

// Deterministic star positions — avoids re-generation on HMR
const STARS = Array.from({ length: 40 }, (_, i) => {
  const t = (i * 0.618033988749895) % 1;
  const l = (i * 0.381966011250105) % 1;
  return {
    top:    `${(t * 96 + 1).toFixed(2)}%`,
    left:   `${(l * 96 + 1).toFixed(2)}%`,
    size:   i % 4 === 0 ? 2 : 1,
    dur:    `${(3 + (i % 7) * 0.85).toFixed(1)}s`,
    delay:  `${((i % 9) * 0.55).toFixed(1)}s`,
    bright: i % 5 === 0,
  };
});

const ORB_BASE = [
  { width: '800px', height: '800px', top: '-250px', left: '-180px',    dur: '22s', delay: '0s',  anim: 'orb1' },
  { width: '700px', height: '650px', top: '-180px', right: '-180px',   dur: '28s', delay: '3s',  anim: 'orb2' },
  { width: '600px', height: '600px', top: '40%',   left: '-200px',     dur: '19s', delay: '7s',  anim: 'orb3' },
  { width: '500px', height: '500px', bottom: '-130px', right: '-120px', dur: '34s', delay: '12s', anim: 'orb4' },
];

const ORB_COLORS = {
  light:   ['rgba(124,58,237,0.75)',   'rgba(109,40,217,0.70)',  'rgba(168,85,247,0.60)',  'rgba(236,72,153,0.40)'],
  crimson: ['rgba(153,27,27,0.80)',    'rgba(127,29,29,0.75)',   'rgba(185,28,28,0.65)',   'rgba(220,38,38,0.45)'],
  void:    ['rgba(0,90,180,0.60)',     'rgba(0,70,160,0.55)',    'rgba(0,130,220,0.50)',   'rgba(0,170,255,0.35)'],
  eclipse: ['rgba(90,20,180,0.65)',    'rgba(70,15,160,0.60)',   'rgba(130,55,200,0.55)',  'rgba(155,89,182,0.40)'],
  inferno: ['rgba(170,55,0,0.72)',     'rgba(150,45,0,0.65)',    'rgba(195,75,0,0.58)',    'rgba(245,95,0,0.42)'],
};

const ORB_ANIM_DURATIONS = {
  light:   ['22s','28s','19s','34s'],
  crimson: ['14s','18s','12s','22s'],
  void:    ['16s','20s','14s','26s'],
  eclipse: ['18s','22s','15s','28s'],
  inferno: ['13s','17s','11s','20s'],
};

const STAR_COLORS = {
  light:   'white',
  crimson: 'rgba(255,180,180,0.75)',
  void:    'rgba(180,220,255,0.80)',
  eclipse: 'rgba(220,180,255,0.80)',
  inferno: 'rgba(255,190,120,0.80)',
};

const CSS = `
  #${SCENE_ID} {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  #${SCENE_ID} .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    transition: background 1.4s ease;
  }
  #${SCENE_ID} .star {
    position: absolute;
    border-radius: 50%;
    background: white;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-name: star-twinkle;
    transition: background 1s ease;
  }
  #bg-vignette {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.60) 100%);
  }
  @keyframes orb1 {
    0%,100% { transform: translate(0px,   0px); }
    33%      { transform: translate(90px, -70px); }
    66%      { transform: translate(-50px, 90px); }
  }
  @keyframes orb2 {
    0%,100% { transform: translate(0px,    0px); }
    33%      { transform: translate(-100px, 80px); }
    66%      { transform: translate(70px,  -60px); }
  }
  @keyframes orb3 {
    0%,100% { transform: translate(0px,  0px); }
    50%      { transform: translate(80px, -90px); }
  }
  @keyframes orb4 {
    0%,100% { transform: translate(0px,   0px); }
    40%      { transform: translate(-70px,-100px); }
    80%      { transform: translate(-30px, -50px); }
  }
  @keyframes star-twinkle {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.15; }
  }
`;

function inject() {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  if (!document.getElementById(SCENE_ID)) {
    const scene = document.createElement('div');
    scene.id = SCENE_ID;

    ORB_BASE.forEach((o, i) => {
      const div = document.createElement('div');
      div.className = 'orb';
      div.style.width  = o.width;
      div.style.height = o.height;
      div.style.background = `radial-gradient(circle, ${ORB_COLORS.light[i]} 0%, transparent 70%)`;
      if (o.top)    div.style.top    = o.top;
      if (o.left)   div.style.left   = o.left;
      if (o.right)  div.style.right  = o.right;
      if (o.bottom) div.style.bottom = o.bottom;
      div.style.animationName     = o.anim;
      div.style.animationDuration = ORB_ANIM_DURATIONS.light[i];
      div.style.animationDelay    = o.delay;
      scene.appendChild(div);
    });

    STARS.forEach(s => {
      const div = document.createElement('div');
      div.className = 'star';
      div.style.top     = s.top;
      div.style.left    = s.left;
      div.style.width   = s.size + 'px';
      div.style.height  = s.size + 'px';
      div.style.opacity = s.bright ? '0.9' : '0.55';
      div.style.animationDuration = s.dur;
      div.style.animationDelay    = s.delay;
      scene.appendChild(div);
    });

    document.body.insertBefore(scene, document.body.firstChild);
  }

  if (!document.getElementById('bg-vignette')) {
    const vignette = document.createElement('div');
    vignette.id = 'bg-vignette';
    document.body.insertBefore(vignette, document.body.firstChild);
  }
}

function updateOrbs(mode, theme) {
  const scene = document.getElementById(SCENE_ID);
  if (!scene) return;

  const key = mode !== 'SHADOW' ? 'light' : (theme || 'crimson');
  const colors = ORB_COLORS[key] || ORB_COLORS.crimson;
  const durations = ORB_ANIM_DURATIONS[key] || ORB_ANIM_DURATIONS.crimson;
  const starColor = STAR_COLORS[key] || STAR_COLORS.crimson;

  scene.querySelectorAll('.orb').forEach((orb, i) => {
    if (!colors[i]) return;
    orb.style.background        = `radial-gradient(circle, ${colors[i]} 0%, transparent 70%)`;
    orb.style.animationDuration = durations[i];
  });
  scene.querySelectorAll('.star').forEach(star => {
    star.style.background = starColor;
  });
}

function BackgroundScene() {
  const { mode, theme } = useMode();

  useEffect(() => {
    inject();
    return () => {
      document.getElementById(SCENE_ID)?.remove();
      document.getElementById('bg-vignette')?.remove();
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  useEffect(() => {
    updateOrbs(mode, theme);
  }, [mode, theme]);

  return null;
}

export default memo(BackgroundScene);
