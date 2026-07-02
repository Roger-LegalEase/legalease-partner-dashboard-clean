"use client";

import { useEffect } from "react";
import {
  applyExpungementLocale,
  EXPUNGEMENT_LOCALE_EVENT_NAME,
  readSavedExpungementLocale
} from "@/app/expungement-ai/landing-locale-controller";
import type { Locale } from "@/lib/expungement-ai/localization";

export function ExpungementLandingInteractions({
  dictionaries
}: {
  dictionaries: {
    en: Record<string, string>;
    es: Record<string, string>;
  };
}) {
  useEffect(() => {
    const nav = document.getElementById("nav");

    const navToggle = document.getElementById("navtoggle");
    const scrim = document.getElementById("menuscrim");
    const menu = document.getElementById("mobilemenu");
    const cleanup: Array<() => void> = [];

    const onScroll = () => {
      if (!nav) return;
      nav.classList.toggle("scrolled", window.scrollY > 40);
    };

    if (nav) {
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup.push(() => window.removeEventListener("scroll", onScroll));
      onScroll();
    }

    if (nav && navToggle && scrim && menu) {
      const setMenu = (open: boolean) => {
        nav.classList.toggle("open", open);
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        menu.setAttribute("aria-hidden", String(!open));
        document.body.style.overflow = open ? "hidden" : "";
      };

      const onToggleClick = () => setMenu(!nav.classList.contains("open"));
      const closeMenu = () => setMenu(false);
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setMenu(false);
        }
      };

      navToggle.addEventListener("click", onToggleClick);
      scrim.addEventListener("click", closeMenu);
      document.addEventListener("keydown", onKeydown);
      cleanup.push(() => {
        navToggle.removeEventListener("click", onToggleClick);
        scrim.removeEventListener("click", closeMenu);
        document.removeEventListener("keydown", onKeydown);
        document.body.style.overflow = "";
      });

      menu.querySelectorAll("a").forEach((anchor) => {
        anchor.addEventListener("click", closeMenu);
        cleanup.push(() => anchor.removeEventListener("click", closeMenu));
      });
    }

    const applyLanguage = (lang: Locale, options: { persist?: boolean; dispatch?: boolean } = {}) => {
      applyExpungementLocale(lang, {
        dictionaries,
        persist: options.persist,
        dispatch: options.dispatch
      });
    };

    applyLanguage(readSavedExpungementLocale(), { persist: false, dispatch: false });

    const onSharedLanguageChange = (event: Event) => {
      const lang = event instanceof CustomEvent && event.detail?.locale === "es" ? "es" : "en";
      applyLanguage(lang, { persist: false, dispatch: false });
    };
    window.addEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onSharedLanguageChange);
    cleanup.push(() => window.removeEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onSharedLanguageChange));

    document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((button) => {
      const onLanguageClick = () => {
        applyLanguage(button.getAttribute("data-lang") === "es" ? "es" : "en", { persist: true });
      };
      button.addEventListener("click", onLanguageClick);
      cleanup.push(() => button.removeEventListener("click", onLanguageClick));
    });

    const smoothAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/expungement-ai#"]'));
    smoothAnchors.forEach((anchor) => {
      const onClick = (event: MouseEvent) => {
        const href = anchor.getAttribute("href") ?? "";
        const hash = href.split("#")[1];
        if (!hash) {
          return;
        }

        const target = document.getElementById(hash);
        if (!target) {
          return;
        }

        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", `/expungement-ai#${hash}`);
      };

      anchor.addEventListener("click", onClick);
      cleanup.push(() => anchor.removeEventListener("click", onClick));
    });

    // The legacy scripted Wilma widget has been removed from the landing. The live
    // <WilmaBubble context="landing" mode="public" /> (rendered in ExpungementLandingHandoff)
    // now owns the Wilma chat, calling the anonymous /public-chat route. No DOM wiring here.

    return () => {
      cleanup.forEach((dispose) => dispose());
    };
  }, [dictionaries]);

  return null;
}
