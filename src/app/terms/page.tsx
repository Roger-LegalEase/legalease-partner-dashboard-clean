import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LegalMarkdown, LegalPageShell } from "@/lib/legal/markdown";

export const metadata: Metadata = {
  title: "LegalEase RCAP Terms and Conditions",
  description: "LegalEase RCAP Terms and Conditions."
};

export default function TermsPage() {
  const source = fs.readFileSync(path.join(process.cwd(), "src/content/legal/terms.md"), "utf8");

  return (
    <LegalPageShell eyebrow="Terms and Conditions">
      <LegalMarkdown source={source} />
    </LegalPageShell>
  );
}
