import { memo, useEffect } from "react";

const css = `
@keyframes orb1 {
  0%,100% { transform: translate(0px, 0px); }
  33% { transform: translate(80px, -60px); }
  66% { transform: translate(-40px, 80px); }
}
@keyframes orb2 {
  0%,100% { transform: translate(0px, 0px); }
  33% { transform: translate(-90px, 70px); }
  66% { transform: translate(60px, -50px); }
}
@keyframes orb3 {
  0%,100% { transform: translate(0px, 0px); }
  50% { transform: translate(70px, 60px); }
}
@keyframes orb4 {
  0%,100% { transform: translate(0px, 0px); }
  50% { transform: translate(-60px, -80px); }
}
@keyframes twinkle {
  0%,100% { opacity: 1; }
  50% { opacity: 0.2; }
}
`;

const ORB_DEFS = [
  {
    w: 700, h: 700, top: "-15%", left: "-10%",
    color: "rgba(124,58,237,0.55)",
    animationName: "orb1",
    animationDuration: "22s",
    animationDelay: "0s",
  },
  {
    w: 600, h: 600, top: "50%", right: "-10%",
    color: "rgba(109,40,217,0.45)",
    animationName: "orb2",
    animationDuration: "28s",
    animationDelay: "3s",
  },
  {
    w: 500, h: 500, top: "20%", left: "40%",
    color: "rgba(168,85,247,0.35)",
    animationName: "orb3",
    animationDuration: "19s",
    animationDelay: "7s",
  },
  {
    w: 400, h: 400, bottom: "-5%", left: "20%",
    color: "rgba(61,10,46,0.5)",
    animationName: "orb4",
    animationDuration: "34s",
    animationDelay: "12s",
  },
];

// Generate star positions once at module load so memo works correctly
const STARS = Array.from({ length: 50 }, (_, i) => {
  const seed = i / 50;
  return {
    top:  `${((seed * 97.3 + 0.13) % 1) * 100}%`,
    left: `${((seed * 83.7 + 0.41) % 1) * 100}%`,
    size: i % 3 === 0 ? 2 : 1,
    animationDuration:  `${3 + (i % 7) * 0.7}s`,
    animationDelay:     `${(i % 5) * 0.8}s`,
  };
});

function BackgroundScene() {
  useEffect(() => {
    if (!document.getElementById("bg-scene-styles")) {
      const style = document.createElement("style");
      style.id = "bg-scene-styles";
      style.textContent = css;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0,
      width: "100vw", height: "100vh",
      zIndex: 0, pointerEvents: "none", overflow: "hidden",
    }}>
      {ORB_DEFS.map((o, i) => (
        <div key={i} style={{
          position: "absolute",
          borderRadius: "50%",
          width: o.w,
          height: o.h,
          top: o.top,
          left: o.left,
          right: o.right,
          bottom: o.bottom,
          background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          filter: "blur(80px)",
          animationName: o.animationName,
          animationDuration: o.animationDuration,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDelay: o.animationDelay,
          animationFillMode: "both",
        }} />
      ))}
      {STARS.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          borderRadius: "50%",
          width: s.size,
          height: s.size,
          top: s.top,
          left: s.left,
          background: "white",
          animationName: "twinkle",
          animationDuration: s.animationDuration,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDelay: s.animationDelay,
        }} />
      ))}
    </div>
  );
}

export default memo(BackgroundScene);
