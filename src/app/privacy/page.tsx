import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LegalMarkdown, LegalPageShell } from "@/lib/legal/markdown";

export const metadata: Metadata = {
  title: "LegalEase RCAP Privacy Policy",
  description: "LegalEase RCAP Privacy Policy."
};

export default function PrivacyPage() {
  const source = fs.readFileSync(path.join(process.cwd(), "src/content/legal/privacy-policy.md"), "utf8");

  return (
    <LegalPageShell eyebrow="Privacy Policy">
      <LegalMarkdown source={source} />
    </LegalPageShell>
  );
}
