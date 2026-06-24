import Link from "next/link";

/**
 * Polished Expungement.ai logomark + wordmark.
 *
 * The mark is the same sunrise-arch glyph used by the consumer landing handoff
 * (design-handoff/expungement-ai-frontend/files-6/Expungement-Landing-Full.html), reproduced as a
 * React component so every consumer surface shows the branded logo instead of plain fallback text.
 *
 * `tone` controls the color treatment:
 * - "dark"  (default): navy mark + navy wordmark, for LIGHT backgrounds (app-style screening header).
 * - "light": white mark + white wordmark, for DARK backgrounds (marketing nav over #0B1320).
 *
 * Each instance uses a unique clipPath id (via `idSuffix`) so multiple marks on one page never
 * collide on the SVG `<clipPath>` id.
 */
export function ExpungementWordmark({
  tone = "dark",
  href = "/expungement-ai",
  idSuffix = "nav"
}: {
  tone?: "dark" | "light";
  href?: string;
  idSuffix?: string;
}) {
  const colors =
    tone === "light"
      ? { arch: "#FFFFFF", gap: "#0B1320", rayDark: "#94A3B8", rayLight: "#CBD5E1", text: "#FFFFFF" }
      : { arch: "#0B1320", gap: "#FFFFFF", rayDark: "#475A6E", rayLight: "#9AA8B8", text: "#0B1320" };
  const clipId = `ex-arch-${idSuffix}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-extrabold tracking-tight"
      style={{ color: colors.text }}
      aria-label="Expungement.ai home"
    >
      <svg viewBox="0 0 192 158" width="30" height="25" aria-hidden="true" className="shrink-0">
        <defs>
          <clipPath id={clipId}>
            <path d="M16 96 A80 80 0 0 1 176 96 L176 154 L16 154 Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path d="M16 96 A80 80 0 0 1 176 96 L176 154 L16 154 Z" fill={colors.arch} />
          <circle cx="96" cy="92" r="27" fill="#FF3B00" />
          <path d="M16 110 L176 110 L176 154 L16 154 Z" fill={colors.gap} />
          <path d="M96 96 L154 154 L122 154 Z" fill={colors.rayDark} />
          <path d="M96 96 L38 154 L70 154 Z" fill={colors.rayDark} />
          <path d="M96 96 L114 154 L78 154 Z" fill={colors.rayLight} />
        </g>
      </svg>
      <span className="text-base">Expungement.ai</span>
    </Link>
  );
}
