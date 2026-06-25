"use client";

import { useEffect } from "react";

export function ExpungementLandingInteractions() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    if (!nav) {
      return;
    }

    const navToggle = document.getElementById("navtoggle");
    const scrim = document.getElementById("menuscrim");
    const menu = document.getElementById("mobilemenu");
    const cleanup: Array<() => void> = [];

    const onScroll = () => {
      nav.classList.toggle("scrolled", window.scrollY > 40);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    cleanup.push(() => window.removeEventListener("scroll", onScroll));
    onScroll();

    if (navToggle && scrim && menu) {
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
  }, []);

  return null;
}
