"use client";

import { useEffect, useRef, useState } from "react";

type SectionPathProps = {
  className: string;
  path: string;
  terminus: { x: number; y: number; size?: number };
  viewBox?: string;
};

export function SectionPath({
  className,
  path,
  terminus,
  viewBox = "0 0 1600 120"
}: SectionPathProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setActive(true);
        observer.disconnect();
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const size = terminus.size ?? 16;
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      className={className}
      data-section-path="true"
      data-active={active ? "true" : "false"}
      preserveAspectRatio="none"
      viewBox={viewBox}
    >
      <path pathLength={1} d={path} />
      <rect
        x={terminus.x - size / 2}
        y={terminus.y - size / 2}
        width={size}
        height={size}
      />
    </svg>
  );
}
