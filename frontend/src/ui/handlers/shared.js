import { gsap } from "gsap";

let pressAnimBound = false;
export function BtnPressAnim() {
  if (pressAnimBound) return;
  pressAnimBound = true;

  const isPressable = (el) => el?.closest?.(".menu-btn, .create-btn");

  const press = (btn) => {
    if (!btn) return;
    btn.style.animation = "none";
    gsap.killTweensOf(btn);
    gsap.to(btn, {
      x: 0,
      scale: 0.96,
      y: 3,
      duration: 0.1,
      ease: "power2.out",
      overwrite: "auto",
      force3D: true,
    });
  };

  const release = (btn) => {
    if (!btn) return;
    gsap.killTweensOf(btn);
    gsap.to(btn, {
      x: 0,
      scale: 1,
      y: 0,
      duration: 0.35,
      ease: "elastic.out(1, 0.7)",
      overwrite: "auto",
      force3D: true,
    });
  };

  document.addEventListener("pointerdown", (e) => {
    const btn = isPressable(e.target);
    if (btn) press(btn);
  });

  document.addEventListener("pointerup", (e) => {
    const btn = isPressable(e.target);
    if (btn) release(btn);
  });

  document.addEventListener("pointercancel", (e) => {
    const btn = isPressable(e.target);
    if (btn) release(btn);
  });

  document.addEventListener("pointerout", (e) => {
    const btn = isPressable(e.target);
    if (!btn) return;
    if (!btn.contains(e.relatedTarget)) release(btn);
  });
}
