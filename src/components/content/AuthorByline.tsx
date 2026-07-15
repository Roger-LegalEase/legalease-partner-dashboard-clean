/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { authorHref, brandFor, formatPublishDate, type ContentSurface } from "@/components/content/brand";
import type { PublicAuthor } from "@/lib/content/types";

/**
 * The byline under an article headline: who wrote it, when it was published, whether it has been
 * updated since, and how long it takes to read.
 *
 * Avatars come from the media library as arbitrary remote URLs, so they are plain <img> elements
 * rather than next/image — next/image would need every future media host registered in
 * next.config, and a missing host is a hard runtime error on a public page. Sizes are fixed and the
 * images are small, so the optimization loss is negligible.
 */
export function AuthorByline({
  author,
  surface,
  publishedAt,
  updatedAt,
  readingMinutes
}: {
  author: PublicAuthor | null;
  surface: ContentSurface;
  publishedAt: string;
  updatedAt?: string | null;
  readingMinutes?: number;
}) {
  const brand = brandFor(surface);
  const published = formatPublishDate(publishedAt);
  const updated = formatPublishDate(updatedAt);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {author ? (
        <Link
          href={authorHref(surface, author.slug)}
          className={`group flex items-center gap-3 ${brand.cls.focus} rounded-[8px]`}
        >
          <AuthorAvatar author={author} surface={surface} size={44} />
          <span className="flex flex-col">
            <span className={`text-[15px] font-bold ${surface === "expungement_ai" ? "text-[#0B1320]" : "text-[#101046]"} group-hover:underline`}>
              {author.name}
            </span>
            {author.title || author.organization ? (
              <span className={`text-[13px] ${brand.cls.muted}`}>
                {[author.title, author.organization].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </span>
        </Link>
      ) : (
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`grid h-11 w-11 place-items-center ${
              surface === "expungement_ai" ? "rounded-full bg-[#E7F7F4] text-[#00A99D]" : "rounded-[2px] border border-[#B8D8D8] bg-white text-[#1F8F88]"
            } text-[13px] font-extrabold`}
          >
            {surface === "expungement_ai" ? "EA" : "LE"}
          </span>
          <span className={`text-[15px] font-bold ${surface === "expungement_ai" ? "text-[#0B1320]" : "text-[#101046]"}`}>
            {brand.siteName} Editorial
          </span>
        </span>
      )}

      <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${brand.cls.muted}`}>
        {published ? (
          <time dateTime={publishedAt}>{published}</time>
        ) : null}
        {updated ? (
          <>
            <Dot />
            <span>
              Updated <time dateTime={updatedAt ?? undefined}>{updated}</time>
            </span>
          </>
        ) : null}
        {readingMinutes ? (
          <>
            <Dot />
            <span>{readingMinutes} min read</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

export function AuthorAvatar({
  author,
  surface,
  size = 44
}: {
  author: PublicAuthor;
  surface: ContentSurface;
  size?: number;
}) {
  const shape = surface === "expungement_ai" ? "rounded-full" : "rounded-[2px]";
  const initials = author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (!author.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`grid shrink-0 place-items-center ${shape} ${
          surface === "expungement_ai" ? "bg-[#E7F7F4] text-[#00A99D]" : "border border-[#B8D8D8] bg-white text-[#1F8F88]"
        } text-[13px] font-extrabold`}
      >
        {initials || "LE"}
      </span>
    );
  }

  return (
    <img
      src={author.avatarUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={`shrink-0 object-cover ${shape} ${
        surface === "expungement_ai" ? "bg-[#E7F7F4]" : "bg-white"
      }`}
    />
  );
}

function Dot() {
  return (
    <span aria-hidden="true" className="opacity-50">
      ·
    </span>
  );
}
