import { memo, useEffect } from 'react';
import { useMode } from '../contexts/ModeContext.jsx';

const STYLE_ID = 'bg-scene-styles';
const SCENE_ID = 'bg-scene';

// Deterministic star positions — avoids re-generation on HMR
const STARS = Array.from({ length: 40 }, (_, i) => {
  const t = (i * 0.618033988749895) % 1; // golden ratio spread
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

const LIGHT_ORBS = [
  {
    color:  'rgba(124, 58, 237, 0.75)',
    width:  '800px', height: '800px',
    top: '-250px', left: '-180px',
    animationName: 'orb1', animationDuration: '22s', animationDelay: '0s',
  },
  {
    color:  'rgba(109, 40, 217, 0.70)',
    width:  '700px', height: '650px',
    top: '-180px', right: '-180px',
    animationName: 'orb2', animationDuration: '28s', animationDelay: '3s',
  },
  {
    color:  'rgba(168, 85, 247, 0.60)',
    width:  '600px', height: '600px',
    top: '40%', left: '-200px',
    animationName: 'orb3', animationDuration: '19s', animationDelay: '7s',
  },
  {
    color:  'rgba(236, 72, 153, 0.40)',
    width:  '500px', height: '500px',
    bottom: '-130px', right: '-120px',
    animationName: 'orb4', animationDuration: '34s', animationDelay: '12s',
  },
];

const SHADOW_ORBS = [
  {
    color:  'rgba(153, 27, 27, 0.80)',
    width:  '800px', height: '800px',
    top: '-250px', left: '-180px',
    animationName: 'orb1', animationDuration: '14s', animationDelay: '0s',
  },
  {
    color:  'rgba(127, 29, 29, 0.75)',
    width:  '700px', height: '650px',
    top: '-180px', right: '-180px',
    animationName: 'orb2', animationDuration: '18s', animationDelay: '2s',
  },
  {
    color:  'rgba(185, 28, 28, 0.65)',
    width:  '600px', height: '600px',
    top: '40%', left: '-200px',
    animationName: 'orb3', animationDuration: '12s', animationDelay: '4s',
  },
  {
    color:  'rgba(220, 38, 38, 0.45)',
    width:  '500px', height: '500px',
    bottom: '-130px', right: '-120px',
    animationName: 'orb4', animationDuration: '22s', animationDelay: '7s',
  },
];

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
    transition: background 1.2s ease;
  }
  #${SCENE_ID} .star {
    position: absolute;
    border-radius: 50%;
    background: white;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-name: star-twinkle;
    transition: background 0.8s ease;
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

    // Orbs — start with light config; updateOrbs() will fix on mode change
    LIGHT_ORBS.forEach(o => {
      const div = document.createElement('div');
      div.className = 'orb';
      div.style.width  = o.width;
      div.style.height = o.height;
      div.style.background = `radial-gradient(circle, ${o.color} 0%, transparent 70%)`;
      if (o.top)    div.style.top    = o.top;
      if (o.left)   div.style.left   = o.left;
      if (o.right)  div.style.right  = o.right;
      if (o.bottom) div.style.bottom = o.bottom;
      div.style.animationName     = o.animationName;
      div.style.animationDuration = o.animationDuration;
      div.style.animationDelay    = o.animationDelay;
      scene.appendChild(div);
    });

    // Stars
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

  // Vignette — separate fixed div at z-index 1
  if (!document.getElementById('bg-vignette')) {
    const vignette = document.createElement('div');
    vignette.id = 'bg-vignette';
    document.body.insertBefore(vignette, document.body.firstChild);
  }
}

function updateOrbs(mode) {
  const scene = document.getElementById(SCENE_ID);
  if (!scene) return;
  const configs = mode === 'SHADOW' ? SHADOW_ORBS : LIGHT_ORBS;
  scene.querySelectorAll('.orb').forEach((orb, i) => {
    if (!configs[i]) return;
    orb.style.background        = `radial-gradient(circle, ${configs[i].color} 0%, transparent 70%)`;
    orb.style.animationDuration = configs[i].animationDuration;
    orb.style.animationDelay    = configs[i].animationDelay;
  });
  const starColor = mode === 'SHADOW' ? 'rgba(255, 180, 180, 0.75)' : 'white';
  scene.querySelectorAll('.star').forEach(star => {
    star.style.background = starColor;
  });
}

function BackgroundScene() {
  const { mode } = useMode();

  useEffect(() => {
    inject();
    return () => {
      document.getElementById(SCENE_ID)?.remove();
      document.getElementById('bg-vignette')?.remove();
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  useEffect(() => {
    updateOrbs(mode);
  }, [mode]);

  return null;
}

export default memo(BackgroundScene);
