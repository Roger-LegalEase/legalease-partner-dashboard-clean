"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { contentApi } from "./api-client";

/** Create a public byline. An author need not be a Supabase user — bylines and logins are separate. */
export default function AuthorForm({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError({ message: "A name is required.", problems: [] });
      return;
    }

    setBusy(true);
    const result = await contentApi.createAuthor({
      name: name.trim(),
      slug: (slug.trim() || slugify(name)).toLowerCase(),
      title: title.trim() || null,
      organization: organization.trim() || null,
      bio: bio.trim() || null
    });
    setBusy(false);

    if (!result.ok) {
      setError({ message: result.message, problems: result.problems });
      return;
    }

    setName("");
    setSlug("");
    setTitle("");
    setOrganization("");
    setBio("");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</span>
          <input
            value={name}
            disabled={!canManage}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Slug</span>
          <input
            value={slug}
            disabled={!canManage}
            onChange={(event) => setSlug(event.target.value)}
            placeholder={name ? slugify(name) : "jane-doe"}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Title</span>
          <input
            value={title}
            disabled={!canManage}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Organization</span>
          <input
            value={organization}
            disabled={!canManage}
            onChange={(event) => setOrganization(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Bio</span>
        <textarea
          value={bio}
          rows={3}
          disabled={!canManage}
          onChange={(event) => setBio(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {error.message}
          </p>
          {error.problems.length > 0 && (
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {error.problems.map((problem, index) => (
                <li key={index} className="text-xs leading-5 text-red-700">
                  {problem}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!canManage || busy}
        className="rounded-md bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Creating…" : "Add author"}
      </button>
      {!canManage && (
        <p className="text-xs text-slate-500">Your content role cannot manage authors.</p>
      )}
    </form>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
