"use client";

import { useEffect } from "react";
import { persistExpungementLocale } from "@/components/expungement-ai/LocalizationProvider";

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

    const applyLanguage = (lang: "en" | "es", options: { persist?: boolean } = {}) => {
      const dictionary = lang === "es" ? dictionaries.es : dictionaries.en;
      const setHtmlContent = (element: Element, value: string) => {
        element.innerHTML = value;
      };
      const setTextContent = (element: Element, value: string) => {
        element.textContent = value;
      };

      document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n") ?? "";
        const value = dictionary[key];
        if (typeof value === "string") setTextContent(element, value);
      });
      document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((element) => {
        const key = element.getAttribute("data-i18n-html") ?? "";
        const value = dictionary[key];
        if (typeof value === "string") setHtmlContent(element, value);
      });
      document.documentElement.setAttribute("lang", lang);
      document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((item) => {
        const on = item.getAttribute("data-lang") === lang;
        item.classList.toggle("on", on);
        item.setAttribute("aria-pressed", String(on));
      });
      if (options.persist) {
        persistExpungementLocale(lang);
      } else {
        document.documentElement.setAttribute("lang", lang);
      }
    };

    const initialLanguage = (() => {
      try {
        const saved = window.localStorage.getItem("exp_lang");
        if (saved === "es" || saved === "en") return saved;
      } catch {
        // Ignore storage failures; fall back below.
      }
      const navLanguage = navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
      return navLanguage;
    })();
    applyLanguage(initialLanguage);

    const onSharedLanguageChange = (event: Event) => {
      const lang = event instanceof CustomEvent && event.detail?.locale === "es" ? "es" : "en";
      applyLanguage(lang);
    };
    window.addEventListener("expungement-ai:language-change", onSharedLanguageChange);
    cleanup.push(() => window.removeEventListener("expungement-ai:language-change", onSharedLanguageChange));

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
  }, [dictionaries.en, dictionaries.es]);

  return null;
}
