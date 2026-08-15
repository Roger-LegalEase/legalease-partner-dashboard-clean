"use client";

import { useEffect } from "react";
import {
  applyExpungementLocale,
  EXPUNGEMENT_LOCALE_EVENT_NAME,
  readSavedExpungementLocale
} from "@/app/expungement-ai/landing-locale-controller";
import type { Locale } from "@/lib/expungement-ai/localization";

const SECTION_IDS = ["how-it-works", "what-you-get", "pricing", "privacy", "faq"] as const;
type SectionId = (typeof SECTION_IDS)[number];

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function ExpungementLandingInteractions({
  dictionaries
}: {
  dictionaries: {
    en: Record<string, string>;
    es: Record<string, string>;
  };
}) {
  useEffect(() => {
    const root = document.documentElement;
    const nav = document.getElementById("nav");
    const navToggle = document.getElementById("navtoggle");
    const scrim = document.getElementById("menuscrim");
    const menu = document.getElementById("mobilemenu");
    const activeNav = document.querySelector<HTMLElement>("[data-active-nav]");
    const navIndicator = activeNav?.querySelector<HTMLElement>(".nav-indicator") ?? null;
    const journey = document.querySelector<HTMLElement>("[data-journey]");
    const journeySteps = Array.from(document.querySelectorAll<HTMLElement>(".jstep[data-i]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cleanup: Array<() => void> = [];
    const timeouts = new Set<number>();
    let frame = 0;
    let activeSection: SectionId | null = null;

    root.classList.add("motion-enhanced");
    cleanup.push(() => root.classList.remove("motion-enhanced"));

    const prefersReducedMotion = () => reducedMotion.matches;

    const setJourneyStep = (index: number) => {
      journeySteps.forEach((step, stepIndex) => {
        const active = stepIndex === index;
        step.classList.toggle("is-current", active);
        const button = step.querySelector<HTMLElement>("[data-journey-step]");
        if (active) button?.setAttribute("aria-current", "step");
        else button?.removeAttribute("aria-current");
      });
    };

    const positionNavIndicator = () => {
      if (!activeNav || !navIndicator) return;
      if (!activeSection) {
        activeNav.style.setProperty("--nav-indicator-opacity", "0");
        return;
      }
      const link = activeNav.querySelector<HTMLElement>(`[data-section-link="${activeSection}"]`);
      if (!link) return;
      activeNav.style.setProperty("--nav-indicator-x", `${link.offsetLeft}px`);
      activeNav.style.setProperty("--nav-indicator-width", `${link.offsetWidth}px`);
      activeNav.style.setProperty("--nav-indicator-opacity", "1");
    };

    const setActiveSection = (sectionId: SectionId | null) => {
      activeSection = sectionId;
      document.querySelectorAll<HTMLElement>("[data-section-link]").forEach((link) => {
        const active = link.dataset.sectionLink === sectionId;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      positionNavIndicator();
    };

    const updateViewportState = () => {
      frame = 0;
      nav?.classList.toggle("scrolled", window.scrollY > 40);

      const readingLine = window.innerHeight * 0.34;
      let nextSection: SectionId | null = null;
      for (const sectionId of SECTION_IDS) {
        const section = document.getElementById(sectionId);
        if (section && section.getBoundingClientRect().top <= readingLine) nextSection = sectionId;
      }
      if (nextSection !== activeSection) setActiveSection(nextSection);
      else positionNavIndicator();

      if (journey) {
        const rect = journey.getBoundingClientRect();
        const progress = prefersReducedMotion() ? 1 : clamp((readingLine - rect.top) / Math.max(rect.height, 1));
        journey.style.setProperty("--journey-progress", String(progress));
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const closestIndex = journeySteps.reduce((bestIndex, step, index) => {
            const stepRect = step.getBoundingClientRect();
            const stepCenter = stepRect.top + Math.min(stepRect.height, window.innerHeight) / 2;
            const bestRect = journeySteps[bestIndex].getBoundingClientRect();
            const bestCenter = bestRect.top + Math.min(bestRect.height, window.innerHeight) / 2;
            return Math.abs(stepCenter - readingLine) < Math.abs(bestCenter - readingLine) ? index : bestIndex;
          }, 0);
          setJourneyStep(closestIndex);
        }
      }
    };

    const scheduleViewportUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateViewportState);
    };

    window.addEventListener("scroll", scheduleViewportUpdate, { passive: true });
    window.addEventListener("resize", scheduleViewportUpdate, { passive: true });
    cleanup.push(() => {
      window.removeEventListener("scroll", scheduleViewportUpdate);
      window.removeEventListener("resize", scheduleViewportUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    });

    if (nav && navToggle && scrim && menu) {
      const menuLabel = (open: boolean) => {
        const dictionary = document.documentElement.lang === "es" ? dictionaries.es : dictionaries.en;
        return dictionary[open ? "menu_close" : "menu_open"] ?? (open ? "Close menu" : "Open menu");
      };
      const setMenu = (open: boolean, restoreFocus = false) => {
        nav.classList.toggle("open", open);
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", menuLabel(open));
        menu.setAttribute("aria-hidden", String(!open));
        menu.inert = !open;
        document.body.style.overflow = open ? "hidden" : "";
        if (!open && restoreFocus) navToggle.focus();
      };

      setMenu(false);
      const onToggleClick = () => setMenu(!nav.classList.contains("open"));
      const closeMenu = () => setMenu(false);
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && nav.classList.contains("open")) setMenu(false, true);
      };

      navToggle.addEventListener("click", onToggleClick);
      scrim.addEventListener("click", closeMenu);
      document.addEventListener("keydown", onKeydown);
      cleanup.push(() => {
        navToggle.removeEventListener("click", onToggleClick);
        scrim.removeEventListener("click", closeMenu);
        document.removeEventListener("keydown", onKeydown);
        menu.inert = false;
        document.body.style.overflow = "";
      });

      menu.querySelectorAll("a").forEach((anchor) => {
        anchor.addEventListener("click", closeMenu);
        cleanup.push(() => anchor.removeEventListener("click", closeMenu));
      });
    }

    const wilmaButton = document.getElementById("wilma-explainer-toggle");
    const wilmaPanel = document.getElementById("wilma-example");
    const updateWilmaButtonCopy = () => {
      if (!wilmaButton) return;
      const dictionary = document.documentElement.lang === "es" ? dictionaries.es : dictionaries.en;
      const expanded = wilmaButton.getAttribute("aria-expanded") === "true";
      wilmaButton.textContent = dictionary[expanded ? "wl_action_close" : "wl_action"]
        ?? (expanded ? "Close Wilma explanation" : "See Wilma explain it");
    };
    const setWilmaExpanded = (expanded: boolean) => {
      if (!wilmaButton || !wilmaPanel) return;
      wilmaButton.setAttribute("aria-expanded", String(expanded));
      if (expanded) {
        wilmaPanel.hidden = false;
        if (!prefersReducedMotion()) {
          wilmaPanel.classList.add("is-entering");
          window.requestAnimationFrame(() => wilmaPanel.classList.remove("is-entering"));
        }
      } else {
        wilmaPanel.hidden = true;
      }
      updateWilmaButtonCopy();
    };

    if (wilmaButton && wilmaPanel) {
      const onWilmaClick = () => setWilmaExpanded(wilmaButton.getAttribute("aria-expanded") !== "true");
      const onWilmaKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && wilmaButton.getAttribute("aria-expanded") === "true") {
          setWilmaExpanded(false);
          wilmaButton.focus();
        }
      };
      wilmaButton.addEventListener("click", onWilmaClick);
      document.addEventListener("keydown", onWilmaKeydown);
      cleanup.push(() => {
        wilmaButton.removeEventListener("click", onWilmaClick);
        document.removeEventListener("keydown", onWilmaKeydown);
      });
    }

    const applyLanguage = (lang: Locale, options: { persist?: boolean; dispatch?: boolean } = {}) => {
      applyExpungementLocale(lang, {
        dictionaries,
        persist: options.persist,
        dispatch: options.dispatch
      });
      if (nav && navToggle) {
        const dictionary = lang === "es" ? dictionaries.es : dictionaries.en;
        const open = nav.classList.contains("open");
        navToggle.setAttribute(
          "aria-label",
          dictionary[open ? "menu_close" : "menu_open"] ?? (open ? "Close menu" : "Open menu")
        );
      }
      updateWilmaButtonCopy();
      window.requestAnimationFrame(positionNavIndicator);
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

    const focusAnchorTarget = (target: HTMLElement) => {
      const hadTabIndex = target.hasAttribute("tabindex");
      if (!hadTabIndex) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      if (!hadTabIndex) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    };

    const smoothAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/expungement-ai#"]'));
    smoothAnchors.forEach((anchor) => {
      const onClick = (event: MouseEvent) => {
        const href = anchor.getAttribute("href") ?? "";
        const hash = href.split("#")[1];
        if (!hash) return;
        const target = document.getElementById(hash);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        window.history.replaceState(null, "", `/expungement-ai#${hash}`);
        if (event.detail === 0) {
          const timeout = window.setTimeout(() => {
            timeouts.delete(timeout);
            focusAnchorTarget(target);
          }, prefersReducedMotion() ? 0 : 360);
          timeouts.add(timeout);
        }
      };

      anchor.addEventListener("click", onClick);
      cleanup.push(() => anchor.removeEventListener("click", onClick));
    });

    document.querySelectorAll<HTMLElement>("[data-interactive-tabs]").forEach((tabGroup) => {
      const tabs = Array.from(tabGroup.querySelectorAll<HTMLButtonElement>('[role="tab"][data-tab-target]'));
      const panels = Array.from(tabGroup.querySelectorAll<HTMLElement>("[data-tab-panel]"));
      const liveRegion = tabGroup.querySelector<HTMLElement>("[data-tab-live]");

      const selectTab = (nextTab: HTMLButtonElement, announce: boolean) => {
        const target = nextTab.dataset.tabTarget;
        if (!target) return;
        tabs.forEach((tab) => {
          const active = tab === nextTab;
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
        });
        panels.forEach((panel) => {
          const active = panel.dataset.tabPanel === target;
          if (active) {
            panel.hidden = false;
            if (!prefersReducedMotion()) {
              panel.classList.add("is-entering");
              window.requestAnimationFrame(() => panel.classList.remove("is-entering"));
            }
          } else {
            panel.hidden = true;
            panel.classList.remove("is-entering");
          }
        });
        if (announce && liveRegion) liveRegion.textContent = nextTab.textContent?.trim() ?? "";
      };

      tabs.forEach((tab, index) => {
        const onClick = () => selectTab(tab, true);
        const onKeydown = (event: KeyboardEvent) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const nextIndex = event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
          tabs[nextIndex].focus();
          selectTab(tabs[nextIndex], true);
        };
        tab.addEventListener("click", onClick);
        tab.addEventListener("keydown", onKeydown);
        cleanup.push(() => {
          tab.removeEventListener("click", onClick);
          tab.removeEventListener("keydown", onKeydown);
        });
      });
    });

    journeySteps.forEach((step, index) => {
      const button = step.querySelector<HTMLButtonElement>("[data-journey-step]");
      if (!button) return;
      const onClick = () => {
        setJourneyStep(index);
        step.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      };
      button.addEventListener("click", onClick);
      cleanup.push(() => button.removeEventListener("click", onClick));
    });

    const revealGroups = [
      ".strip-grid .tcard",
      ".journey .jcard",
      ".pcards .pcard",
      ".pricing-head, .price-card",
      ".priv-grid .priv-item"
    ];
    const revealItems: HTMLElement[] = [];
    revealGroups.forEach((selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((item, index) => {
        item.classList.add("motion-reveal");
        item.style.setProperty("--reveal-delay", `${Math.min(index, 3) * 70}ms`);
        revealItems.push(item);
      });
    });

    let revealObserver: IntersectionObserver | null = null;
    const prepareReveals = () => {
      if (revealObserver) revealObserver.disconnect();
      if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
        revealItems.forEach((item) => {
          item.classList.remove("reveal-ready");
          item.classList.add("is-revealed");
        });
        return;
      }
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const item = entry.target as HTMLElement;
          item.classList.add("is-revealed");
          item.classList.remove("reveal-ready");
          revealObserver?.unobserve(item);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealItems.forEach((item) => {
        if (item.getBoundingClientRect().top <= window.innerHeight * 0.92) {
          item.classList.add("is-revealed");
        } else {
          item.classList.add("reveal-ready");
          revealObserver?.observe(item);
        }
      });
    };
    prepareReveals();
    cleanup.push(() => revealObserver?.disconnect());

    const onMotionPreferenceChange = () => {
      root.dataset.reducedMotion = String(prefersReducedMotion());
      prepareReveals();
      scheduleViewportUpdate();
    };
    root.dataset.reducedMotion = String(prefersReducedMotion());
    reducedMotion.addEventListener("change", onMotionPreferenceChange);
    cleanup.push(() => {
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      delete root.dataset.reducedMotion;
    });

    setActiveSection(activeSection);
    updateViewportState();

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      cleanup.forEach((dispose) => dispose());
    };
  }, [dictionaries]);

  return null;
}
