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

function BackgroundScene() {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "bg-scene-styles";
    if (!document.getElementById("bg-scene-styles")) {
      style.textContent = css;
      document.head.appendChild(style);
    }
    return () => {};
  }, []);

  const orbs = [
    { w: 700, h: 700, top: "-15%", left: "-10%", color: "rgba(124,58,237,0.55)", anim: "orb1 22s ease-in-out infinite" },
    { w: 600, h: 600, top: "50%", right: "-10%", color: "rgba(109,40,217,0.45)", anim: "orb2 28s ease-in-out infinite 3s" },
    { w: 500, h: 500, top: "20%", left: "40%", color: "rgba(168,85,247,0.35)", anim: "orb3 19s ease-in-out infinite 7s" },
    { w: 400, h: 400, bottom: "-5%", left: "20%", color: "rgba(61,10,46,0.5)", anim: "orb4 34s ease-in-out infinite 12s" },
  ];

  const stars = Array.from({ length: 50 }, (_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() > 0.7 ? 2 : 1,
    anim: `twinkle ${3 + Math.random() * 5}s ease-in-out infinite ${Math.random() * 4}s`,
  }));

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          width: o.w, height: o.h,
          top: o.top, left: o.left, right: o.right, bottom: o.bottom,
          background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          filter: "blur(80px)",
          animation: o.anim,
        }} />
      ))}
      {stars.map((s, i) => (
        <div key={`s${i}`} style={{
          position: "absolute", borderRadius: "50%",
          width: s.size, height: s.size,
          top: s.top, left: s.left,
          background: "white",
          animation: s.anim,
        }} />
      ))}
    </div>
  );
}

export default memo(BackgroundScene);
