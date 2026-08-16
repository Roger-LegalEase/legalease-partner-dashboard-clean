"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

export function WilmaPreview() {
  const copy = useLandingCopy();
  const ref = useRef<HTMLDivElement>(null);
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
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={styles.wilmaChat}
      data-active={active ? "true" : "false"}
      aria-label={copy("wl_demo_aria")}
    >
      <header>
        <Image src="/expungement-ai/wilma-avatar.webp" alt="" width={44} height={44} />
        <div><strong>Wilma</strong><span>{copy("wl_example")}</span></div>
        <i aria-hidden="true" />
      </header>
      <div className={styles.wilmaMessages}>
        <article className={styles.wilmaUserMessage}>
          <span>{copy("wl_you")}</span>
          <p>{copy("wl_q")}</p>
        </article>
        <article className={styles.wilmaReply}>
          <span>Wilma</span>
          <p>{copy("wl_a")}</p>
        </article>
      </div>
      <p className={styles.wilmaNote}>{copy("wl_illustrative")} {copy("wl_safe")}</p>
    </div>
  );
}
