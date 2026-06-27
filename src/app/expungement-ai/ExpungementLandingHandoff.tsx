import fs from "node:fs";
import path from "node:path";
import { ExpungementLandingInteractions } from "@/app/expungement-ai/ExpungementLandingInteractions";
import { SamplePacketModal } from "@/app/expungement-ai/sample-packet/SamplePacketModal";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";

const landingPath = path.join(
  process.cwd(),
  "design-handoff/expungement-ai-frontend/files-12/Expungement-Landing-Full.html"
);
const noScriptRevealFallback = `
  #how-it-works .jstep {
    opacity: 1 !important;
    transform: none !important;
  }

  #how-it-works .jline {
    transform: scaleY(1) !important;
  }
`;

// Live implementation fix (intentionally diverges from the design file).
// The hero "See a sample packet" secondary button (`.h-ghost`) ships as a
// translucent glass button with `backdrop-filter: blur()`. Sitting ~13px to the
// right of the primary CTA, its backdrop blur picked up that button's orange
// drop-shadow (`0 8px 24px rgba(255,59,0,.38)`) and smeared it into a red/orange
// bleed on the secondary button's left edge. This is a faithful reproduction of
// an artifact in the static mockup, not something to preserve.
//
// Render it as a clean dark-glass outline button instead: drop the backdrop blur
// (the smear amplifier) and use an opaque-enough fill so a neighbour's shadow
// can't bleed through. Scoped to `.hero-cta-row` so the design's other `.h-ghost`
// uses (e.g. the privacy section) are untouched. Cosmetic only — behaviour and
// the #sample anchor are unchanged.
const landingDesignFixes = `
  .hero-cta-row a.h-ghost {
    background: rgba(13, 21, 40, 0.6);
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }
  .hero-cta-row a.h-ghost:hover {
    background: rgba(13, 21, 40, 0.74);
    border-color: #fff;
  }
`;

// The Geist webfont is requested from a <head> <link> in the static mockup, but the loader only
// extracts <style> + <body>, so we re-add the stylesheet link here to keep the design's type.
const fontLinks = (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap"
    />
  </>
);

export function ExpungementLandingHandoff() {
  const source = fs.readFileSync(landingPath, "utf8");
  const styles = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
  const html = body
    // Remove the legacy scripted Wilma widget if present; the live <WilmaBubble mode="public" />
    // replaces it below. (The files-12 mockup ships no such block, so this is a safe no-op there.)
    .replace(/<div id="wilma-static"[\s\S]*?<\/div>\s*(?=<script)/i, "")
    // Strip inline scripts; nav/menu/anchor behaviour is owned by ExpungementLandingInteractions.
    .replace(/<script[\s\S]*?<\/script>/g, "")
    // Rewrite design-relative asset paths to the served /expungement-ai/* public assets.
    .replaceAll('src="hero-', 'src="/expungement-ai/hero-')
    .replaceAll('srcset="hero-', 'srcset="/expungement-ai/hero-')
    .replaceAll(", hero-", ", /expungement-ai/hero-")
    .replaceAll('src="shot-', 'src="/expungement-ai/shot-')
    .replaceAll('srcset="shot-', 'srcset="/expungement-ai/shot-')
    .replaceAll('src="wilma-avatar', 'src="/expungement-ai/wilma-avatar')
    .replaceAll('srcset="wilma-avatar', 'srcset="/expungement-ai/wilma-avatar')
    // Primary funnel CTAs (the design's #elig anchors) enter the live screening flow.
    .replaceAll('href="#elig"', 'href="/expungement-ai/start"')
    // In-page section anchors become /expungement-ai#... so the smooth-scroll handler catches them.
    .replaceAll('href="#how-it-works"', 'href="/expungement-ai#how-it-works"')
    .replaceAll('href="#brief"', 'href="/expungement-ai#brief"')
    .replaceAll('href="#pricing"', 'href="/expungement-ai#pricing"')
    .replaceAll('href="#privacy"', 'href="/expungement-ai#privacy"')
    .replaceAll('href="#faq"', 'href="/expungement-ai#faq"')
    .replaceAll('href="#sample"', 'href="/expungement-ai#sample"')
    .replaceAll('href="#trust"', 'href="/expungement-ai#trust"')
    .replaceAll('href="#top"', 'href="/expungement-ai"');

  return (
    <>
      {fontLinks}
      <style dangerouslySetInnerHTML={{ __html: `${styles}\n${noScriptRevealFallback}\n${landingDesignFixes}` }} />
      <div
        data-handoff-source="design-handoff/expungement-ai-frontend/files-12/Expungement-Landing-Full.html"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ExpungementLandingInteractions />
      {/* DEMO-ONLY format preview. Opened by the [data-sample-packet-trigger] button in the
          "Sample packet" section. Fully isolated: no fetch, no packet pipeline, no payment. */}
      <SamplePacketModal />
      <WilmaBubble context="landing" mode="public" />
    </>
  );
}
