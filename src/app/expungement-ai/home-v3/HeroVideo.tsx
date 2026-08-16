"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SectionPath } from "./SectionPath";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

export function HeroVideo() {
  const copy = useLandingCopy();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posterOnly, setPosterOnly] = useState(true);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 640px)");
    const update = () => {
      const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
      setPosterOnly(reducedMotion.matches || mobile.matches || saveData);
    };
    update();
    reducedMotion.addEventListener("change", update);
    mobile.addEventListener("change", update);
    return () => {
      reducedMotion.removeEventListener("change", update);
      mobile.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (posterOnly || manuallyPaused) {
      video.pause();
      return;
    }
    video.muted = true;
    void video.play().catch(() => {
      setManuallyPaused(true);
      setPlaying(false);
    });
  }, [manuallyPaused, posterOnly]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (manuallyPaused || video.paused) {
      setManuallyPaused(false);
      video.muted = true;
      void video.play().catch(() => setManuallyPaused(true));
    } else {
      setManuallyPaused(true);
      video.pause();
    }
  };

  return (
    <section id="homepage-v3-hero" className={styles.hero} aria-labelledby="homepage-v3-title">
      <picture className={styles.heroPoster}>
        <source media="(max-width: 640px)" srcSet="/expungement-ai/hero/expungement-ai-hero-poster-mobile.webp" type="image/webp" />
        <source media="(max-width: 640px)" srcSet="/expungement-ai/hero/expungement-ai-hero-poster-mobile.jpg" />
        <source srcSet="/expungement-ai/hero/expungement-ai-hero-poster.webp" type="image/webp" />
        <img
          src="/expungement-ai/hero/expungement-ai-hero-poster.jpg"
          width="1600"
          height="900"
          alt=""
          fetchPriority="high"
        />
      </picture>
      {!posterOnly ? (
        <div className={styles.heroVideoLayer} aria-hidden="true">
          <video
            ref={videoRef}
            className={styles.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/expungement-ai/hero/expungement-ai-hero-poster.jpg"
            tabIndex={-1}
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src="/expungement-ai/hero/expungement-ai-hero-approved.mp4" type="video/mp4" />
          </video>
        </div>
      ) : null}
      <span className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroPanel}>
        <p className={styles.eyebrow} data-i18n="hero_eyebrow">{copy("hero_eyebrow")}</p>
        <h1 id="homepage-v3-title" data-i18n="hero_h1">{copy("hero_h1")}</h1>
        <p className={styles.heroLead} data-i18n="hero_sub">{copy("hero_sub")}</p>
        <div className={styles.heroActions}>
          <Link className={styles.primaryButton} href="/expungement-ai/start">
            {copy("hero_cta1")} <span aria-hidden="true" />
          </Link>
          <a
            className={styles.secondaryButton}
            href="/expungement-ai#what-you-get"
            data-sample-packet-trigger="true"
          >
            {copy("hero_cta2")} <span aria-hidden="true" />
          </a>
        </div>
        <p className={styles.heroBoundary} data-i18n="hero_disclaimer">{copy("hero_disclaimer")}</p>
        <div className={styles.heroFacts} aria-label={copy("hero_facts_label")}>
          <div><strong>{copy("hero_fact_account")}</strong><span>{copy("hero_fact_account_detail")}</span></div>
          <div><strong>{copy("hero_fact_payment")}</strong><span>{copy("hero_fact_payment_detail")}</span></div>
          <div><strong>{copy("hero_fact_coverage")}</strong><span>{copy("hero_fact_coverage_detail")}</span></div>
        </div>
      </div>
      {!posterOnly ? (
        <button
          type="button"
          className={styles.videoControl}
          aria-pressed={manuallyPaused}
          aria-label={copy(manuallyPaused || !playing ? "video_play" : "video_pause")}
          onClick={togglePlayback}
        >
          <span aria-hidden="true" data-playing={playing && !manuallyPaused ? "true" : "false"} />
          {copy(manuallyPaused || !playing ? "video_play_short" : "video_pause_short")}
        </button>
      ) : null}
      <SectionPath
        className={`${styles.sectionPath} ${styles.heroPath}`}
        path="M0 34 H680 V92 H1230"
        terminus={{ x: 1230, y: 92, size: 18 }}
      />
    </section>
  );
}
