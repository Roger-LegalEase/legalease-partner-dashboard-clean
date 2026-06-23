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

    const panel = document.getElementById("wilma-static-panel");
    const toggle = document.getElementById("wilma-static-toggle");
    const close = document.getElementById("wilma-static-close");
    const form = document.getElementById("wilma-static-form") as HTMLFormElement | null;
    const input = document.getElementById("wilma-static-input") as HTMLInputElement | null;
    const send = document.getElementById("wilma-static-send") as HTMLButtonElement | null;
    const messages = document.getElementById("wilma-static-messages");
    const report = document.getElementById("wilma-static-report");
    const guide = "Start with the free screening. It covers all 50 states and DC. A packet or payment option only appears if the result and jurisdiction allow it.";

    if (panel && toggle && close && form && input && send && messages && report) {
      const setOpen = (open: boolean) => {
        panel.hidden = !open;
      };
      const setSendState = () => {
        const ready = input.value.trim().length > 0;
        send.disabled = !ready;
        send.style.background = ready ? "#FF3B00" : "#C7CDD8";
        send.style.cursor = ready ? "pointer" : "not-allowed";
      };
      const bubble = (text: string, side: "user" | "guide") => {
        const element = document.createElement("div");
        element.textContent = text;
        element.style.cssText = `border-radius:14px;padding:10px 12px;font-size:13px;line-height:1.45;${side === "user" ? "margin-left:32px;background:#0B1320;color:#fff" : "margin-right:32px;background:#F7F3EC;color:#0B1320"}`;
        messages.appendChild(element);
        messages.scrollTop = messages.scrollHeight;
      };

      const onToggle = () => setOpen(panel.hidden);
      const onClose = () => setOpen(false);
      const onSubmit = (event: SubmitEvent) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) {
          return;
        }

        bubble(text, "user");
        bubble(guide, "guide");
        input.value = "";
        setSendState();
      };
      const onReport = () => {
        report.textContent = "Reported, thank you. A reviewer will take a look.";
      };

      toggle.addEventListener("click", onToggle);
      close.addEventListener("click", onClose);
      input.addEventListener("input", setSendState);
      form.addEventListener("submit", onSubmit);
      report.addEventListener("click", onReport);
      cleanup.push(() => {
        toggle.removeEventListener("click", onToggle);
        close.removeEventListener("click", onClose);
        input.removeEventListener("input", setSendState);
        form.removeEventListener("submit", onSubmit);
        report.removeEventListener("click", onReport);
      });
      setSendState();
    }

    return () => {
      cleanup.forEach((dispose) => dispose());
    };
  }, []);

  return null;
}
