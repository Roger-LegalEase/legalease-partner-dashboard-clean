import Link from "next/link";

const emailPattern = /info@legalease\.law/g;

export function LegalMarkdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);

  return (
    <article className="rounded-md border border-[#e0d4c4] bg-white p-5 shadow-sm md:p-8">
      {blocks.map((block, index) => renderBlock(block, index))}
    </article>
  );
}

type MarkdownBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ol"; items: string[] };

function parseMarkdown(source: string) {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim()) {
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "ol", items });
      continue;
    }

    blocks.push({ type: "p", text: line });
  }

  return blocks;
}

function renderBlock(block: MarkdownBlock, index: number) {
  if (block.type === "h1") {
    return (
      <h1 key={index} className="font-serif text-4xl font-black leading-tight text-[#102d4a] md:text-6xl">
        {renderInline(block.text)}
      </h1>
    );
  }

  if (block.type === "h2") {
    return (
      <h2 key={index} className="mt-10 border-t border-[#eadfce] pt-8 text-2xl font-black leading-tight text-[#102d4a]">
        {renderInline(block.text)}
      </h2>
    );
  }

  if (block.type === "h3") {
    return (
      <h3 key={index} className="mt-6 text-lg font-black leading-tight text-[#0f4f66]">
        {renderInline(block.text)}
      </h3>
    );
  }

  if (block.type === "ol") {
    return (
      <ol key={index} className="mt-3 list-decimal space-y-2 pl-6 text-base leading-7 text-[#31465b] marker:font-black marker:text-[#c84f2b]">
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  }

  return (
    <p key={index} className="mt-3 text-base leading-7 text-[#31465b]">
      {renderInline(block.text)}
    </p>
  );
}

function renderInline(text: string) {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldStart = remaining.indexOf("**");
    if (boldStart === -1) {
      nodes.push(...linkifyEmail(remaining, key));
      break;
    }

    if (boldStart > 0) {
      nodes.push(...linkifyEmail(remaining.slice(0, boldStart), key));
      key += 1;
    }

    const afterStart = remaining.slice(boldStart + 2);
    const boldEnd = afterStart.indexOf("**");
    if (boldEnd === -1) {
      nodes.push(...linkifyEmail(remaining.slice(boldStart), key));
      break;
    }

    const boldText = afterStart.slice(0, boldEnd);
    nodes.push(
      <strong key={`strong-${key}`} className="font-black text-[#102d4a]">
        {linkifyEmail(boldText, key)}
      </strong>
    );
    key += 1;
    remaining = afterStart.slice(boldEnd + 2);
  }

  return nodes;
}

function linkifyEmail(text: string, keySeed: number) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(emailPattern)) {
    if (match.index === undefined) {
      continue;
    }

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <a key={`email-${keySeed}-${match.index}`} href="mailto:info@legalease.law" className="font-bold text-[#c84f2b] underline underline-offset-4">
        info@legalease.law
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function LegalPageShell({
  eyebrow,
  children
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fbf6ee] text-[#102033]">
      <header className="border-b border-[#e3d8c8] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/partners" className="text-sm font-black text-[#102d4a]">
            LegalEase
          </Link>
          <nav className="flex items-center gap-4 text-sm font-bold text-[#31465b]" aria-label="Legal navigation">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </header>
      <section className="border-b border-[#e3d8c8] bg-[#fffaf2]">
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">{eyebrow}</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">{children}</section>
      <footer className="border-t border-[#e3d8c8] bg-[#102d4a]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm font-semibold text-white/78 md:flex-row md:items-center md:justify-between md:px-6">
          <p>LegalEase Incorporated</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-white hover:text-[#f6b44b]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-white hover:text-[#f6b44b]">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
