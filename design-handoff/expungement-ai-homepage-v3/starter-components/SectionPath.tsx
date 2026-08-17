import type { CSSProperties } from "react";

type SectionPathProps = {
  className?: string;
  viewBox?: string;
  path: string;
  active?: boolean;
  terminus?: { x: number; y: number; size?: number };
  style?: CSSProperties;
};

/**
 * Decorative route only. Keep it aria-hidden, use 90-degree turns,
 * and never route it across readable content or interactive controls.
 */
export function SectionPath({
  className,
  viewBox = "0 0 1600 180",
  path,
  active = false,
  terminus,
  style,
}: SectionPathProps) {
  const size = terminus?.size ?? 16;

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-active={active ? "true" : "false"}
      preserveAspectRatio="none"
      style={style}
      viewBox={viewBox}
    >
      <path pathLength={1} d={path} />
      {terminus ? (
        <rect
          x={terminus.x - size / 2}
          y={terminus.y - size / 2}
          width={size}
          height={size}
        />
      ) : null}
    </svg>
  );
}
