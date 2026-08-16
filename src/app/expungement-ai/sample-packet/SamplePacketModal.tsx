"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXPUNGEMENT_LOCALE_EVENT_NAME,
  readSavedExpungementLocale
} from "@/app/expungement-ai/landing-locale-controller";
import {
  SAMPLE_BADGE,
  SAMPLE_BADGE_ES,
  samplePacketMatter,
  samplePacketMatterEs,
  samplePacketTabs,
  samplePacketTabsEs
} from "@/app/expungement-ai/sample-packet/sample-packet-demo";
import type { Locale } from "@/lib/expungement-ai/localization";

// ============================================================================
// "View sample packet" — DEMO format preview.
//
// Isolation guarantees (intentional, do not regress):
//   • No network: this component never calls fetch / a route / Supabase.
//   • No pipeline: it never imports or invokes packet generation, and never
//     reads or writes `packet_jobs` or any real user data.
//   • No payment path: it is a read-only illustration of a finished packet's
//     FORMAT — it cannot produce a usable filing and is not a checkout bypass.
//
// All content comes from the static `sample-packet-demo` module (fabricated
// "Alex Rivera" persona). A persistent banner + watermark make the SAMPLE
// status unmistakable.
//
// The trigger is the static landing button carrying [data-sample-packet-trigger].
// We intercept its click in the capture phase so it opens the modal instead of
// navigating / smooth-scrolling.
// ============================================================================

const STYLES = `
.sp-overlay{position:fixed;inset:0;z-index:120;display:flex;align-items:flex-start;justify-content:center;
  padding:24px 16px;overflow-y:auto;background:rgba(7,27,51,.82);
  font-family:Inter,var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif;animation:sp-fade 160ms cubic-bezier(.7,0,.3,1) both;
  transition:opacity 160ms cubic-bezier(.7,0,.3,1)}
@keyframes sp-fade{from{opacity:0}to{opacity:1}}
.sp-modal{position:relative;width:100%;max-width:860px;margin:auto;overflow:hidden;background:#fff;
  border:1px solid rgba(247,244,238,.42);animation:sp-reveal 240ms cubic-bezier(.7,0,.3,1) both;
  transition:opacity 160ms cubic-bezier(.7,0,.3,1),clip-path 160ms cubic-bezier(.7,0,.3,1)}
@keyframes sp-reveal{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0)}}
.sp-overlay.sp-closing{opacity:0}
.sp-overlay.sp-closing .sp-modal{opacity:0;clip-path:inset(0 0 100% 0)}
.sp-banner{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  background:#FF3B00;color:#fff;padding:12px 20px;font-size:13px;font-weight:700;letter-spacing:.02em}
.sp-banner .sp-dot{width:9px;height:9px;background:#fff;flex-shrink:0}
.sp-banner .sp-sub{font-weight:500;opacity:.92;font-size:12.5px}
.sp-close{margin-left:auto;background:transparent;border:1px solid rgba(255,255,255,.72);color:#fff;
  width:44px;height:44px;font-size:22px;line-height:1;cursor:pointer;flex-shrink:0;
  display:grid;place-items:center}
.sp-close:hover,.sp-close:focus-visible{background:#071B33;outline:3px solid #fff;outline-offset:2px}
.sp-head{padding:22px 24px 4px}
.sp-eyebrow{color:#0A8E9A;font:700 11px/1.4 'IBM Plex Mono',var(--font-geist-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}
.sp-title{color:#071B33;font-size:24px;font-weight:850;letter-spacing:-.02em;margin-top:6px}
.sp-meta{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 18px;
  background:#F7F4EE;border:1px solid rgba(7,27,51,.18);padding:14px 16px}
.sp-meta div{font-size:12.5px;color:#5A6275}
.sp-meta b{display:block;color:#071B33;font-size:13px;font-weight:700;margin-top:1px}
.sp-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:16px 24px 0}
.sp-tab{min-height:44px;font-size:12px;font-weight:750;padding:8px 14px;border:1px solid rgba(7,27,51,.18);
  background:#fff;color:#475A6E;cursor:pointer}
.sp-tab:hover,.sp-tab:focus-visible{border-color:#FF3B00;outline:3px solid #FF3B00;outline-offset:2px}
.sp-tab.on{background:#071B33;color:#fff;border-color:#071B33}
.sp-doc{position:relative;margin:16px 24px 24px;border:1px solid rgba(7,27,51,.18);overflow:hidden;background:#fff}
.sp-doc-inner{position:relative;z-index:1;padding:26px 26px 30px}
.sp-doc-heading{font-size:17px;font-weight:800;color:#071B33;letter-spacing:-.01em;margin-bottom:16px;
  padding-bottom:12px;border-bottom:1px solid rgba(7,27,51,.18)}
.sp-block{margin-bottom:18px}
.sp-block:last-child{margin-bottom:0}
.sp-block-title{font:700 11px/1.4 'IBM Plex Mono',var(--font-geist-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:#0A8E9A;margin-bottom:7px}
.sp-line{font-size:13.5px;line-height:1.6;color:#27303f;white-space:pre-wrap}
.sp-watermark{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.sp-watermark span{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);
  font-size:54px;font-weight:900;letter-spacing:.14em;color:rgba(7,27,51,.055);white-space:nowrap}
.sp-foot{padding:0 24px 22px;font-size:12px;color:#8A7E62;font-style:italic}
@media(max-width:560px){.sp-title{font-size:19px}.sp-watermark span{font-size:38px}}
@media(prefers-reduced-motion:reduce){.sp-overlay,.sp-modal{animation:none!important;transition:none!important}}
`;

const TRIGGER_SELECTOR = "[data-sample-packet-trigger]";

const SAMPLE_COPY = {
  en: {
    dialogLabel: "Sample packet preview with demonstration information only",
    demonstration: "Demonstration information only. This is not a real packet and cannot be filed.",
    close: "Close sample packet preview",
    eyebrow: "Sample packet",
    title: "How a finished packet is organized",
    petitioner: "Petitioner",
    sample: "sample",
    caseNumber: "Case no.",
    court: "Court",
    disposition: "Disposition",
    sections: "Sample packet sections",
    watermark: "SAMPLE",
    foot: "Sample only. Your actual forms depend on your state, court, case, and supported record-clearing option. This preview is illustrative and is not legal advice."
  },
  es: {
    dialogLabel: "Vista de un paquete de ejemplo con información de demostración",
    demonstration: "Solo contiene información de demostración. No es un paquete real y no se puede presentar.",
    close: "Cerrar la vista del paquete de ejemplo",
    eyebrow: "Paquete de ejemplo",
    title: "Cómo se organiza un paquete terminado",
    petitioner: "Peticionario",
    sample: "ejemplo",
    caseNumber: "Caso núm.",
    court: "Tribunal",
    disposition: "Resultado",
    sections: "Secciones del paquete de ejemplo",
    watermark: "EJEMPLO",
    foot: "Solo es un ejemplo. Sus formularios dependen de su estado, tribunal, caso y opción de limpieza de antecedentes disponible. Esta vista es ilustrativa y no constituye asesoría legal."
  }
} as const;

export function SamplePacketModal() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [active, setActive] = useState(samplePacketTabs[0].id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const close = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpen(false);
      setClosing(false);
      return;
    }
    setClosing(true);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
      setClosing(false);
    }, 180);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  // Intercept the landing trigger in the capture phase so the static anchor's own
  // navigation / smooth-scroll handler never fires.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const trigger = target?.closest?.(TRIGGER_SELECTOR);
      if (!trigger) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      returnFocusRef.current = trigger as HTMLElement;
      setLocale(readSavedExpungementLocale());
      setActive(samplePacketTabs[0].id);
      setClosing(false);
      setOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const onLanguageChange = (event: Event) => {
      setLocale(event instanceof CustomEvent && event.detail?.locale === "es" ? "es" : "en");
    };
    window.addEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onLanguageChange);
    return () => window.removeEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onLanguageChange);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key === "Tab") {
        const focusable = Array.from(
          modalRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          ) ?? []
        );
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open, close]);

  if (!open) {
    return null;
  }

  const copy = SAMPLE_COPY[locale];
  const badge = locale === "es" ? SAMPLE_BADGE_ES : SAMPLE_BADGE;
  const matter = locale === "es" ? samplePacketMatterEs : samplePacketMatter;
  const tabs = locale === "es" ? samplePacketTabsEs : samplePacketTabs;
  const tab = tabs.find((entry) => entry.id === active) ?? tabs[0];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        className={`sp-overlay${closing ? " sp-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={copy.dialogLabel}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}
      >
        <div className="sp-modal" ref={modalRef}>
          <div className="sp-banner">
            <span className="sp-dot" aria-hidden="true" />
            <span>{badge}</span>
            <span className="sp-sub">{copy.demonstration}</span>
            <button ref={closeRef} type="button" className="sp-close" aria-label={copy.close} onClick={close}>
              ×
            </button>
          </div>

          <div className="sp-head">
            <p className="sp-eyebrow">{copy.eyebrow}</p>
            <h2 className="sp-title">{copy.title}</h2>
            <div className="sp-meta">
              <div>{copy.petitioner}<b>{matter.petitioner} ({copy.sample})</b></div>
              <div>{copy.caseNumber}<b>{matter.caseNumber}</b></div>
              <div>{copy.court}<b>{matter.court}</b></div>
              <div>{copy.disposition}<b>{matter.disposition}</b></div>
            </div>
          </div>

          <div className="sp-tabs" role="tablist" aria-label={copy.sections}>
            {tabs.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`sample-tab-${entry.id}`}
                aria-controls="sample-tab-panel"
                aria-selected={entry.id === active}
                tabIndex={entry.id === active ? 0 : -1}
                className={`sp-tab${entry.id === active ? " on" : ""}`}
                onClick={() => setActive(entry.id)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const nextIndex = event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                  setActive(tabs[nextIndex].id);
                  requestAnimationFrame(() => document.getElementById(`sample-tab-${tabs[nextIndex].id}`)?.focus());
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div
            className="sp-doc"
            id="sample-tab-panel"
            role="tabpanel"
            aria-labelledby={`sample-tab-${tab.id}`}
          >
            <div className="sp-watermark" aria-hidden="true">
              <span>{copy.watermark}</span>
            </div>
            <div className="sp-doc-inner">
              <div className="sp-doc-heading">{tab.heading}</div>
              {tab.blocks.map((block, blockIndex) => (
                <div className="sp-block" key={blockIndex}>
                  {block.title ? <div className="sp-block-title">{block.title}</div> : null}
                  {block.lines.map((line, lineIndex) => (
                    <p className="sp-line" key={lineIndex}>
                      {line || " "}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p className="sp-foot">{copy.foot}</p>
        </div>
      </div>
    </>
  );
}
