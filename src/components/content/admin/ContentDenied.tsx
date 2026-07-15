import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * The CMS denial page. Mirrors InternalAdminDenied, but does not reuse src/components/ui/Card —
 * that component references Tailwind classes (grayWilma-*) that are not in the config and emit no
 * CSS. Everything here uses real tokens.
 *
 * An authenticated user with no content role lands here rather than being bounced to sign-in, which
 * would be a redirect loop: they are signed in, they are just not authorized.
 */
export function ContentDenied({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-cream text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <div className="w-full rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-orange" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black text-navy">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Content roles are assigned in the content platform settings by a primary admin.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            Sign in with another account
          </Link>
        </div>
      </div>
    </main>
  );
}
