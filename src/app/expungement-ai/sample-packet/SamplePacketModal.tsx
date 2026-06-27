"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SAMPLE_BADGE,
  samplePacketMatter,
  samplePacketTabs
} from "@/app/expungement-ai/sample-packet/sample-packet-demo";

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
// "Alex Rivera" persona). A persistent banner + diagonal watermark make the
// SAMPLE status unmistakable.
//
// The trigger is the static landing button carrying [data-sample-packet-trigger].
// We intercept its click in the capture phase so it opens the modal instead of
// navigating / smooth-scrolling.
// ============================================================================

const STYLES = `
.sp-overlay{position:fixed;inset:0;z-index:120;display:flex;align-items:flex-start;justify-content:center;
  padding:24px 16px;overflow-y:auto;background:rgba(11,19,32,.62);backdrop-filter:blur(4px);
  font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:sp-fade .2s ease both}
@keyframes sp-fade{from{opacity:0}to{opacity:1}}
.sp-modal{position:relative;width:100%;max-width:860px;background:#fff;border-radius:20px;overflow:hidden;
  box-shadow:0 40px 90px rgba(8,15,40,.5);margin:auto}
.sp-banner{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  background:#FF3B00;color:#fff;padding:12px 20px;font-size:13px;font-weight:700;letter-spacing:.02em}
.sp-banner .sp-dot{width:9px;height:9px;border-radius:50%;background:#fff;flex-shrink:0;box-shadow:0 0 0 4px rgba(255,255,255,.28)}
.sp-banner .sp-sub{font-weight:500;opacity:.92;font-size:12.5px}
.sp-close{margin-left:auto;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);color:#fff;
  width:30px;height:30px;border-radius:9px;font-size:18px;line-height:1;cursor:pointer;flex-shrink:0;
  display:grid;place-items:center}
.sp-close:hover{background:rgba(255,255,255,.3)}
.sp-head{padding:22px 24px 4px}
.sp-eyebrow{color:#00A99D;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.sp-title{color:#0B1320;font-size:22px;font-weight:800;letter-spacing:-.01em;margin-top:6px}
.sp-meta{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 18px;
  background:#F7F3EC;border:1px solid #ECE6DA;border-radius:12px;padding:14px 16px}
.sp-meta div{font-size:12.5px;color:#5A6275}
.sp-meta b{display:block;color:#0B1320;font-size:13px;font-weight:600;margin-top:1px}
.sp-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:16px 24px 0}
.sp-tab{font-size:12px;font-weight:700;padding:8px 14px;border-radius:999px;border:1px solid #ECE6DA;
  background:#fff;color:#5A6275;cursor:pointer}
.sp-tab:hover{border-color:#cdc4b2}
.sp-tab.on{background:#0B1320;color:#fff;border-color:#0B1320}
.sp-doc{position:relative;margin:16px 24px 24px;border:1px solid #ECE6DA;border-radius:14px;overflow:hidden;background:#fff}
.sp-doc-inner{position:relative;z-index:1;padding:26px 26px 30px}
.sp-doc-heading{font-size:16px;font-weight:800;color:#14213D;letter-spacing:-.01em;margin-bottom:16px;
  padding-bottom:12px;border-bottom:1px solid #ECE6DA}
.sp-block{margin-bottom:18px}
.sp-block:last-child{margin-bottom:0}
.sp-block-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#00A99D;margin-bottom:7px}
.sp-line{font-size:13.5px;line-height:1.6;color:#27303f;white-space:pre-wrap}
.sp-watermark{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  background-image:repeating-linear-gradient(-24deg,transparent,transparent 120px,rgba(11,19,32,.045) 120px,rgba(11,19,32,.045) 320px)}
.sp-watermark span{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%) rotate(-20deg);
  font-size:54px;font-weight:800;letter-spacing:.14em;color:rgba(11,19,32,.06);white-space:nowrap}
.sp-foot{padding:0 24px 22px;font-size:12px;color:#8A7E62;font-style:italic}
@media(max-width:560px){.sp-title{font-size:19px}.sp-watermark span{font-size:38px}}
`;

const TRIGGER_SELECTOR = "[data-sample-packet-trigger]";

export function SamplePacketModal() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(samplePacketTabs[0].id);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

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
      setActive(samplePacketTabs[0].id);
      setOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  if (!open) {
    return null;
  }

  const tab = samplePacketTabs.find((entry) => entry.id === active) ?? samplePacketTabs[0];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        className="sp-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Sample packet preview — demo data only"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}
      >
        <div className="sp-modal">
          <div className="sp-banner">
            <span className="sp-dot" aria-hidden="true" />
            <span>{SAMPLE_BADGE}</span>
            <span className="sp-sub">Demo data only — not a real, filable packet.</span>
            <button ref={closeRef} type="button" className="sp-close" aria-label="Close sample packet preview" onClick={close}>
              ×
            </button>
          </div>

          <div className="sp-head">
            <p className="sp-eyebrow">Sample packet</p>
            <h2 className="sp-title">How a finished packet is organized</h2>
            <div className="sp-meta">
              <div>Petitioner<b>{samplePacketMatter.petitioner} (sample)</b></div>
              <div>Case no.<b>{samplePacketMatter.caseNumber}</b></div>
              <div>Court<b>{samplePacketMatter.court}</b></div>
              <div>Disposition<b>{samplePacketMatter.disposition}</b></div>
            </div>
          </div>

          <div className="sp-tabs" role="tablist" aria-label="Sample packet sections">
            {samplePacketTabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={entry.id === active}
                className={`sp-tab${entry.id === active ? " on" : ""}`}
                onClick={() => setActive(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="sp-doc">
            <div className="sp-watermark" aria-hidden="true">
              <span>SAMPLE</span>
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

          <p className="sp-foot">
            Sample only. Your actual forms depend on your state, court, case, and eligibility. This preview is
            illustrative and is not legal advice.
          </p>
        </div>
      </div>
    </>
  );
}
