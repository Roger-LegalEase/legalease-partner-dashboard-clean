"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExpungementWordmark } from "@/components/expungement-ai/ExpungementWordmark";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

const navItems = [
  ["how-it-works", "nav_how"],
  ["what-you-get", "nav_brief"],
  ["pricing", "nav_pricing"],
  ["privacy", "nav_privacy"],
  ["faq", "nav_faq"]
] as const;

export function HomepageHeader() {
  const copy = useLandingCopy();
  const { locale, setLocale } = useLocalization();
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = document.getElementById("homepage-v3-hero");
    if (!hero || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom < 88),
      { rootMargin: "-88px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }
        const next = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        setActiveSection(next);
      },
      { rootMargin: "-26% 0px -58% 0px", threshold: [0.05, 0.25, 0.5] }
    );
    navItems.forEach(([id]) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = menuRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key === "Tab") {
        const panelItems = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []
        );
        const toggle = menuButtonRef.current;
        if (!toggle || panelItems.length === 0) return;
        const first = panelItems[0];
        const last = panelItems.at(-1) ?? first;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          toggle.focus();
        } else if (event.shiftKey && document.activeElement === toggle) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          toggle.focus();
        } else if (!event.shiftKey && document.activeElement === toggle) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const tone = pastHero ? "dark" : "light";

  return (
    <header className={styles.header} data-homepage-header="true" data-past-hero={pastHero ? "true" : "false"}>
      <div className={styles.announcement}>
        <span aria-hidden="true" />
        <p data-i18n="v3_announce">{copy("v3_announce")}</p>
      </div>
      <div className={styles.navBar}>
        <ExpungementWordmark
          tone={tone}
          idSuffix="homepage-v3"
          ariaLabel={copy("home_label")}
          i18nAriaLabel="home_label"
        />
        <nav className={styles.desktopNav} aria-label={copy("primary_navigation")}>
          {navItems.map(([id, key]) => (
            <Link
              key={id}
              href={`/expungement-ai#${id}`}
              aria-current={activeSection === id ? "location" : undefined}
            >
              {copy(key)}
            </Link>
          ))}
        </nav>
        <div className={styles.navActions}>
          <div className={styles.localeSwitch} role="group" aria-label={copy("language_selector")}>
            <button
              type="button"
              data-lang="en"
              aria-label={copy("language_english")}
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              data-lang="es"
              aria-label={copy("language_spanish")}
              aria-pressed={locale === "es"}
              onClick={() => setLocale("es")}
            >
              ES
            </button>
          </div>
          <Link className={styles.loginLink} href="/expungement-ai/sign-in?mode=signin">
            {copy("nav_login")}
          </Link>
          <Link className={styles.navCta} href="/expungement-ai/start">
            {copy("nav_cta")} <span aria-hidden="true" />
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="homepage-v3-mobile-menu"
            aria-label={copy(menuOpen ? "menu_close" : "menu_open")}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      <div
        ref={menuRef}
        id="homepage-v3-mobile-menu"
        className={styles.mobileMenu}
        data-open={menuOpen ? "true" : "false"}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label={copy("mobile_navigation")}
      >
        <nav aria-label={copy("mobile_navigation")}>
          {navItems.map(([id, key], index) => (
            <Link key={id} href={`/expungement-ai#${id}`} onClick={closeMenu}>
              <span aria-hidden="true">0{index + 1}</span>
              {copy(key)}
            </Link>
          ))}
          <Link href="/expungement-ai/sign-in?mode=signin" onClick={closeMenu}>
            <span aria-hidden="true">06</span>
            {copy("nav_login")}
          </Link>
        </nav>
        <div className={styles.mobileMenuFooter}>
          <div className={styles.localeSwitch} role="group" aria-label={copy("language_selector")}>
            <button type="button" aria-label={copy("language_english")} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
            <span aria-hidden="true">/</span>
            <button type="button" aria-label={copy("language_spanish")} aria-pressed={locale === "es"} onClick={() => setLocale("es")}>ES</button>
          </div>
          <Link href="/expungement-ai/start" onClick={closeMenu}>{copy("nav_cta")}</Link>
        </div>
      </div>
    </header>
  );
}
