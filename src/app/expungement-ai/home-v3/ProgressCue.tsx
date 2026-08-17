"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ExpungementHomeV3.module.css";

export function ProgressCue() {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setActive(true);
        observer.disconnect();
      },
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={styles.progressCue} data-active={active ? "true" : "false"} aria-hidden="true">
      <span />
    </span>
  );
}
