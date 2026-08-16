"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionPath } from "./SectionPath";
import styles from "./HeroVideo.module.css";

type HeroVideoProps = {
  videoSrc: string;
  posterWebp: string;
  posterJpg: string;
  startHref: string;
  sampleHref: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

const proofItems = [
  ["No account to begin", "Begin before creating a login."],
  ["No payment to start", "Review the guided-check result first."],
  ["50 states + D.C.", "Coverage of the free guided check."],
] as const;

export function HeroVideo({
  videoSrc,
  posterWebp,
  posterJpg,
  startHref,
  sampleHref,
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pathActive, setPathActive] = useState(false);

  const shouldUsePoster = useMemo(() => reduceMotion, [reduceMotion]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    const update = () => setReduceMotion(media.matches || saveData);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || shouldUsePoster || paused) {
      node?.pause();
      return;
    }
    node.muted = true;
    void node.play().catch(() => setPaused(true));
  }, [paused, shouldUsePoster]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPathActive(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay={!shouldUsePoster}
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterJpg}
        tabIndex={-1}
        aria-hidden="true"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      <picture className={`${styles.poster} ${shouldUsePoster ? styles.posterVisible : ""}`} aria-hidden="true">
        <source srcSet={posterWebp} type="image/webp" />
        <img src={posterJpg} alt="" />
      </picture>

      <div className={styles.gridLines} aria-hidden="true" />

      <div className={styles.panel}>
        <p className={styles.eyebrow}>Private record-clearing check</p>
        <h1 id="hero-title">The law is complicated. Your next step should not be.</h1>
        <p className={styles.lede}>
          Start with a free guided check. Answer plain-English questions about your state,
          case, and outcome. If a supported self-help packet is available, review your
          information before paying $50 to generate it.
        </p>

        <div className={styles.actions}>
          <a className={styles.primary} href={startHref}>Start free <i aria-hidden="true" /></a>
          <a className={styles.secondary} href={sampleHref}>See a sample packet <i aria-hidden="true" /></a>
        </div>

        <div className={styles.proof} aria-label="Key facts">
          {proofItems.map(([title, body]) => (
            <div key={title}><strong>{title}</strong><span>{body}</span></div>
          ))}
        </div>

        <p className={styles.boundary}>
          Self-help document preparation. Not a law firm. The court or agency makes the final decision.
        </p>
      </div>

      {!shouldUsePoster ? (
        <button
          type="button"
          className={styles.videoControl}
          aria-pressed={paused}
          onClick={() => setPaused(value => !value)}
        >
          <i aria-hidden="true" />
          {paused ? "Play background video" : "Pause background video"}
        </button>
      ) : null}

      <SectionPath
        className={styles.route}
        path="M0 46 H520 V122 H1432"
        active={pathActive}
        terminus={{ x: 1432, y: 122, size: 16 }}
      />
    </section>
  );
}
