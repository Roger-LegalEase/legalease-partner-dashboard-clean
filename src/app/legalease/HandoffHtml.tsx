import fs from "node:fs";
import path from "node:path";

const handoffRoot = path.join(process.cwd(), "design-handoff/legalease-suite-page/latest/legalease-handoff/handoff/pages");
type LegalEaseHandoffFile = "legalease-opendoor.html" | "contact.html" | "waitlist.html" | "terms.html" | "disclaimer.html";

function readHandoff(file: LegalEaseHandoffFile) {
  const source = fs.readFileSync(path.join(handoffRoot, file), "utf8");
  const styles = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
  return { body, styles };
}

export function HandoffStyles({ file }: { file: LegalEaseHandoffFile }) {
  const { styles } = readHandoff(file);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div hidden data-handoff-source={`latest/legalease-handoff/handoff/pages/${file}`} />
    </>
  );
}

export function HandoffHtml({ file }: { file: LegalEaseHandoffFile }) {
  const { body, styles } = readHandoff(file);
  const withoutScripts = body.replace(/<script[\s\S]*?<\/script>/g, "");
  const html = withoutScripts
    .replaceAll("legalease-opendoor.html", "/legalease")
    .replaceAll("contact.html", "/legalease/contact")
    .replaceAll("waitlist.html", "/legalease/waitlist")
    .replaceAll("terms.html", "/legalease/terms")
    .replaceAll("disclaimer.html", "/legalease/disclaimer")
    .replaceAll("../assets/", "/legalease/");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="le-handoff-source" data-handoff-source={`latest/legalease-handoff/handoff/pages/${file}`} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
