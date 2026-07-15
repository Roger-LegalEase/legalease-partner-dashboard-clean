import Link from "next/link";
import { AuthorAvatar } from "@/components/content/AuthorByline";
import { authorHref, brandFor, type ContentSurface } from "@/components/content/brand";
import type { PublicAuthor } from "@/lib/content/types";

/**
 * The "about the author" block that closes an article, and the header of an author page.
 *
 * `linkToProfile` is off on the author's own page (a self-link is a dead end for keyboard and screen
 * reader users) and on wherever the card is already the page subject.
 */
export function AuthorCard({
  author,
  surface,
  linkToProfile = true,
  headingLevel = "h2"
}: {
  author: PublicAuthor;
  surface: ContentSurface;
  linkToProfile?: boolean;
  headingLevel?: "h1" | "h2";
}) {
  const brand = brandFor(surface);
  const Heading = headingLevel;
  const isExpungement = surface === "expungement_ai";

  return (
    <section className={`${brand.cls.card} p-6 md:p-8`} aria-label={`About ${author.name}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <AuthorAvatar author={author} surface={surface} size={72} />

        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-extrabold uppercase tracking-[0.1em] ${isExpungement ? "text-[#00A99D]" : "text-[#1F8F88]"}`}>
            {headingLevel === "h1" ? "Author" : "About the author"}
          </p>

          <Heading className={`mt-1 ${brand.cls.heading} ${headingLevel === "h1" ? "text-[30px] md:text-[38px]" : "text-[20px]"}`}>
            {linkToProfile ? (
              <Link href={authorHref(surface, author.slug)} className={`hover:underline ${brand.cls.focus}`}>
                {author.name}
              </Link>
            ) : (
              author.name
            )}
          </Heading>

          {author.title || author.organization ? (
            <p className={`mt-1 text-[14px] font-semibold ${brand.cls.muted}`}>
              {[author.title, author.organization].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          {author.bio ? (
            <p className={`mt-3 text-[15px] leading-7 ${brand.cls.muted}`}>{author.bio}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
