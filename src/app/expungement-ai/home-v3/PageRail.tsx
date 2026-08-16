"use client";

import { useEffect, useRef } from "react";
import styles from "./ExpungementHomeV3.module.css";

export function PageRail() {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${progress})`;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span className={styles.pageRail} aria-hidden="true">
      <span ref={fillRef} />
    </span>
  );
}
