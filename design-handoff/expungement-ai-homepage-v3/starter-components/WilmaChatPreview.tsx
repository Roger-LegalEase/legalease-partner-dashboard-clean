"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./WilmaChatPreview.module.css";

type WilmaChatPreviewProps = { avatarSrc: string };

export function WilmaChatPreview({ avatarSrc }: WilmaChatPreviewProps) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setActive(true);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={styles.chat} data-active={active ? "true" : "false"} aria-label="Illustrative Wilma conversation">
      <header>
        <img src={avatarSrc} alt="" />
        <strong>Wilma</strong>
        <i aria-hidden="true" />
        <span>Online</span>
      </header>
      <div className={styles.messages}>
        <article className={`${styles.bubble} ${styles.user}`}>
          <small>You</small>
          <p>I have two old cases from different courts. Do I file them together or separately?</p>
        </article>
        <article className={`${styles.bubble} ${styles.wilma}`}>
          <small>Wilma</small>
          <p>It depends on your state and where each case was handled. Your checklist will show whether the filings must be separate, which court to use, what documents to include, and whether a filing fee or fee-waiver step may apply.</p>
        </article>
      </div>
      <p className={styles.note}>Illustrative copy for legal review. Wilma provides general self-help information, not legal advice.</p>
      <div className={styles.input} aria-hidden="true"><span>Ask Wilma a question...</span><b>→</b></div>
    </section>
  );
}
