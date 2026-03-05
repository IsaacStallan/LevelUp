import { memo } from 'react';

const KEYFRAMES = `
  @keyframes orb-drift-1 {
    0%   { transform: translate(  0px,   0px); }
    25%  { transform: translate( 80px,  65px); }
    50%  { transform: translate( 45px, 130px); }
    75%  { transform: translate(-30px,  85px); }
    100% { transform: translate(  0px,   0px); }
  }
  @keyframes orb-drift-2 {
    0%   { transform: translate(   0px,   0px); }
    30%  { transform: translate( -90px,  85px); }
    60%  { transform: translate(-130px,  30px); }
    80%  { transform: translate( -50px, -20px); }
    100% { transform: translate(   0px,   0px); }
  }
  @keyframes orb-drift-3 {
    0%   { transform: translate(  0px,    0px); }
    20%  { transform: translate( 75px,  -70px); }
    55%  { transform: translate(115px,  -25px); }
    80%  { transform: translate( 35px, -100px); }
    100% { transform: translate(  0px,    0px); }
  }
  @keyframes orb-drift-4 {
    0%   { transform: translate(   0px,    0px); }
    35%  { transform: translate( -55px,  -95px); }
    65%  { transform: translate(-105px,  -45px); }
    85%  { transform: translate( -18px, -125px); }
    100% { transform: translate(   0px,    0px); }
  }
  @keyframes bg-star-slow {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  @keyframes bg-star-med {
    0%, 100% { opacity: 0.65; }
    50%       { opacity: 0.08; }
  }
  @keyframes bg-star-fast {
    0%, 100% { opacity: 0.45; }
    50%       { opacity: 0.05; }
  }
`;

const ORB_BASE = {
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(80px)',
  willChange: 'transform',
  pointerEvents: 'none',
};

const ORBS = [
  {
    width: '700px', height: '700px',
    top: '-200px', left: '-150px',
    background: 'rgba(124, 58, 237, 0.6)',
    animation: 'orb-drift-1 22s ease-in-out infinite',
  },
  {
    width: '650px', height: '600px',
    top: '-150px', right: '-150px',
    background: 'rgba(109, 40, 217, 0.6)',
    animation: 'orb-drift-2 29s ease-in-out 7s infinite',
  },
  {
    width: '600px', height: '650px',
    top: '40%', left: '-200px',
    background: 'rgba(37, 99, 235, 0.5)',
    animation: 'orb-drift-3 34s ease-in-out 14s infinite',
  },
  {
    width: '560px', height: '560px',
    bottom: '-150px', right: '-120px',
    background: 'rgba(168, 85, 247, 0.55)',
    animation: 'orb-drift-4 19s ease-in-out 4s infinite',
  },
];

const STAR_BASE = {
  position: 'absolute',
  top: 0, left: 0,
  width: '1px', height: '1px',
  background: 'transparent',
  pointerEvents: 'none',
};

const STARS = [
  {
    animation: 'bg-star-slow 4.2s ease-in-out infinite',
    boxShadow: [
      '148px 72px 0 1px rgba(255,255,255,0.90)',
      '435px 189px 0 0px rgba(255,255,255,0.80)',
      '923px 54px 0 1px rgba(255,255,255,0.85)',
      '1567px 234px 0 0px rgba(255,255,255,0.90)',
      '287px 456px 0 1px rgba(255,255,255,0.70)',
      '812px 123px 0 0px rgba(255,255,255,0.85)',
      '1234px 678px 0 1px rgba(255,255,255,0.80)',
      '67px 890px 0 0px rgba(255,255,255,0.90)',
      '1678px 456px 0 1px rgba(255,255,255,0.75)',
      '345px 789px 0 0px rgba(255,255,255,0.85)',
      '1890px 123px 0 1px rgba(255,255,255,0.80)',
      '789px 567px 0 0px rgba(255,255,255,0.90)',
      '456px 234px 0 1px rgba(255,255,255,0.70)',
      '1123px 890px 0 0px rgba(255,255,255,0.85)',
      '678px 345px 0 1px rgba(255,255,255,0.80)',
      '234px 678px 0 0px rgba(255,255,255,0.90)',
      '1456px 789px 0 1px rgba(255,255,255,0.75)',
      '890px 234px 0 0px rgba(255,255,255,0.85)',
      '123px 567px 0 1px rgba(255,255,255,0.80)',
      '1789px 890px 0 0px rgba(255,255,255,0.70)',
    ].join(','),
  },
  {
    animation: 'bg-star-med 7s ease-in-out 2.1s infinite',
    boxShadow: [
      '267px 145px 0 0px rgba(255,255,255,0.50)',
      '678px 389px 0 1px rgba(255,255,255,0.45)',
      '1089px 267px 0 0px rgba(255,255,255,0.50)',
      '1456px 512px 0 1px rgba(255,255,255,0.40)',
      '89px 723px 0 0px rgba(255,255,255,0.55)',
      '912px 456px 0 1px rgba(255,255,255,0.45)',
      '1567px 789px 0 0px rgba(255,255,255,0.50)',
      '345px 189px 0 1px rgba(255,255,255,0.40)',
      '1823px 678px 0 0px rgba(255,255,255,0.55)',
      '567px 345px 0 1px rgba(255,255,255,0.45)',
      '1234px 123px 0 0px rgba(255,255,255,0.50)',
      '789px 890px 0 1px rgba(255,255,255,0.40)',
      '456px 678px 0 0px rgba(255,255,255,0.55)',
      '1678px 234px 0 1px rgba(255,255,255,0.45)',
      '234px 890px 0 0px rgba(255,255,255,0.50)',
      '1012px 567px 0 1px rgba(255,255,255,0.40)',
      '678px 123px 0 0px rgba(255,255,255,0.55)',
      '1345px 789px 0 1px rgba(255,255,255,0.45)',
      '89px 456px 0 0px rgba(255,255,255,0.50)',
      '1890px 345px 0 1px rgba(255,255,255,0.40)',
    ].join(','),
  },
  {
    animation: 'bg-star-fast 3.1s ease-in-out 0.8s infinite',
    boxShadow: [
      '512px 256px 0 1px rgba(255,255,255,0.30)',
      '1024px 512px 0 1px rgba(255,255,255,0.25)',
      '256px 768px 0 1px rgba(255,255,255,0.30)',
      '768px 384px 0 1px rgba(255,255,255,0.25)',
      '1536px 640px 0 1px rgba(255,255,255,0.30)',
      '384px 128px 0 1px rgba(255,255,255,0.25)',
      '1280px 896px 0 1px rgba(255,255,255,0.30)',
      '640px 256px 0 1px rgba(255,255,255,0.25)',
      '1152px 640px 0 1px rgba(255,255,255,0.30)',
      '128px 384px 0 1px rgba(255,255,255,0.25)',
    ].join(','),
  },
];

const NOISE_STYLE = {
  position: 'absolute',
  inset: 0,
  opacity: 0.038,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
  backgroundSize: '300px 300px',
  backgroundRepeat: 'repeat',
  pointerEvents: 'none',
};

function BackgroundScene() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {ORBS.map((orb, i) => (
          <div key={i} style={{ ...ORB_BASE, ...orb }} />
        ))}
        {STARS.map((star, i) => (
          <div key={i} style={{ ...STAR_BASE, ...star }} />
        ))}
        <div style={NOISE_STYLE} />
      </div>
    </>
  );
}

export default memo(BackgroundScene);
