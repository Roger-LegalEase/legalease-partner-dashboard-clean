import "server-only";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ny16059CurrentDocumentInputs, NY_CURRENT_REVIEW_SOURCE } from "@/lib/expungement-ai/ny-16059-current-document-inputs";

const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
type Field = { page: number; ordinal: number; field: string; rect: number[]; type: string; actor: string; buttonStates?: { normal: string[] } };
/** No endpoint, registry selection or admission. This only assembles a held
 * review artifact from a record already obtained under protected owner access. */
export async function renderNewYork16059DocumentReview(record: Parameters<typeof ny16059CurrentDocumentInputs>[0]) {
  const input = ny16059CurrentDocumentInputs(record);
  assert(input, "NY protected record integrity or route is unavailable");
  const [sourceBytes, mappingBytes] = await Promise.all([fs.readFile(NY_CURRENT_REVIEW_SOURCE.path), fs.readFile(NY_CURRENT_REVIEW_SOURCE.mappingPath)]);
  assert(sourceBytes.length === input.source.bytes && sha(sourceBytes) === input.source.sha256, "NY exact retained source mismatch");
  assert(sha(mappingBytes) === input.source.mappingSha256, "NY exact current source mapping mismatch");
  const map = JSON.parse(mappingBytes.toString()) as { sourceSha256: string; fields: Field[] };
  assert(map.sourceSha256 === input.source.sha256 && map.fields.length === 84, "NY mapping inventory mismatch");
  // Existing held-review tooling preserves the publisher's exact vector widget
  // appearances. pdf-lib's regenerated appearances do not match this source.
  // No file is rewritten and no application endpoint invokes this renderer.
  const baked = execFileSync("python", ["-c", `import pymupdf,sys
source=pymupdf.open(stream=sys.stdin.buffer.read(),filetype="pdf")
assert len(source)==14
widgets=[w for p in source for w in p.widgets()]
assert len(widgets)==84
assert all(w.field_type_string=="Button" or w.field_value is None or str(w.field_value).strip() in ["", "Off"] for w in widgets)
expected=[(2,"ResetForm",[515.42,15.327,587.42,35.327]),(10,"ResetForm",[515.42,15.327,587.42,35.327]),(14,"PrintForm",[299.917,741.537,371.917,761.537])]
observed=[]
for index,page in enumerate(source):
 for widget in list(page.widgets()):
  if widget.field_type_string!="Button": continue
  match=next((e for e in expected if e[0]==index+1 and e[1]==widget.field_name),None)
  assert match and all(abs(a-b)<.001 for a,b in zip(widget.rect,match[2]))
  flag=source.xref_get_key(widget.xref,"F");assert flag[0]=="null" or flag[0]=="int" and not(int(flag[1])&4)
  observed.append((index+1,widget.field_name));page.delete_widget(widget)
assert observed==[(e[0],e[1]) for e in expected]
source.bake(annots=True,widgets=True)
sys.stdout.buffer.write(source.tobytes(garbage=4,deflate=True,no_new_id=True))`], { input: sourceBytes, maxBuffer: 32 * 1024 * 1024 });
  const source = await PDFDocument.load(baked), widgetCount = 84;
  assert(source.getPageCount() === 14 && source.getForm().getFields().length === 0, "NY exact baked source inventory mismatch");
  const output = await PDFDocument.create();
  output.setCreationDate(new Date("2026-10-14T00:00:00Z")); output.setModificationDate(new Date("2026-10-14T00:00:00Z"));
  const outFont = await output.embedFont(StandardFonts.Helvetica);
  const pages = await output.copyPages(source, source.getPageIndices()); pages.forEach(p => output.addPage(p));
  const writes: Array<{ page: number; field: string; value: string; rect: number[]; factIds: string[]; caseIds: string[] }> = [];
  const continuations: Array<{ id: string; sourceId: string; page: number; text: string; caseIds: string[]; execution: string }> = [];
  const pending: Array<{ id: string; text: string; caseIds: string[] }> = [];
  function lines(text: string, width: number, size = 9) {
    const result: string[] = [];
    // Exact paragraph and word content retained; wrapping only inserts linebreaks.
    for (const paragraph of text.replace(/\r\n/g, "\n").split("\n")) {
      let line = "";
      for (const token of paragraph.split(/(?<=\s)/u)) {
        if (line && outFont.widthOfTextAtSize(line + token, size) > width) { result.push(line.trimEnd()); line = ""; }
        if (outFont.widthOfTextAtSize(token, size) > width) {
          for (const char of token) { if (outFont.widthOfTextAtSize(line + char, size) > width) { result.push(line); line = ""; } line += char; }
        } else line += token;
      }
      result.push(line.trimEnd());
    }
    return result;
  }
  function draw(page: number, rect: number[], text: string, field: string, factIds: string[], caseIds: string[], allowOverflow = true) {
    const [x, top, right, bottom] = rect, width = right - x - 4, height = bottom - top - 4, size = 9, leading = 11;
    const wrapped = lines(text, width, size), capacity = Math.max(1, Math.floor(height / leading));
    if (wrapped.length > capacity && allowOverflow) {
      pending.push({ id: `${page}:${field}`, text: `${field === "StateReasons" ? "Applicant reasons" : field}\n${text}`, caseIds });
      const reference = "See identified continuation";
      assert(outFont.widthOfTextAtSize(reference, size) <= width, "NY reference does not fit source field");
      return draw(page, rect, reference, field, factIds, caseIds, false);
    }
    assert(wrapped.length <= capacity, "NY field overflow requires continuation");
    wrapped.forEach((line, i) => output.getPage(page - 1).drawText(line, { x: x + 2, y: output.getPage(page - 1).getHeight() - top - size - 2 - i * leading, size, font: outFont, color: rgb(0, 0, 0) }));
    writes.push({ page, field, value: text, rect, factIds, caseIds });
  }
  for (const write of input.writes) {
    const fields = map.fields.filter(f => f.page === write.page && f.field === write.field);
    assert(fields.length > 0 && fields.every(f => ["Text", "ComboBox"].includes(f.type)), "NY write does not match exact current field");
    assert(!/Affirmation|Server|Service|DistrictAttorney/.test(write.field), "NY execution and service are reserved");
    for (const f of fields) draw(write.page, f.rect, write.value, f.field, write.factIds, write.caseIds);
  }
  for (const selection of input.selections) {
    const fields = map.fields.filter(f => f.page === selection.page && f.field === selection.field && f.type === "RadioButton" && f.buttonStates?.normal.includes(selection.state));
    assert(fields.length === 1 && ["HaveOrNotAnother", "DoOrNotIntendFile"].includes(selection.field), "NY factual selection source mismatch");
    draw(selection.page, fields[0].rect, "X", `${selection.field}:${selection.state}`, selection.factIds, [], false);
  }
  pending.push(...input.continuations.map(c => ({ id: c.id, text: `${c.title}\n${c.text}`, caseIds: c.caseIds })));
  const textField = map.fields.find(f => f.page === 14 && f.field === "Additional Statement by the Applicant");
  assert(textField, "NY additional statement geometry missing");
  const name = input.writes.find(w => w.page === 14 && w.field === "ApplicantName");
  const nameField = map.fields.find(f => f.page === 14 && f.field === "ApplicantName");
  for (const item of pending) {
    const wrapped = lines(item.text, textField.rect[2] - textField.rect[0] - 4), capacity = Math.floor((textField.rect[3] - textField.rect[1] - 4) / 11) - 2;
    for (let offset = 0, part = 1; offset < wrapped.length; offset += capacity, part++) {
      const [extra] = await output.copyPages(source, [13]); output.addPage(extra);
      const page = output.getPageCount(), text = `Continuation ${item.id}; part ${part}\n${wrapped.slice(offset, offset + capacity).join("\n")}`;
      draw(page, textField.rect, text, "Additional Statement by the Applicant", [], item.caseIds, false);
      if (name && nameField) draw(page, nameField.rect, name.value, "ApplicantName", name.factIds, item.caseIds, false);
      continuations.push({ id: `${item.id}:${part}`, sourceId: item.id, page, text, caseIds: item.caseIds, execution: "unsigned_undated_unaffirmed" });
    }
  }
  // One prospective proof sheet per affected county, not a claim that any
  // prosecutor was served. Missing recipient/address/server/event stays blank.
  const servicePages = [{ page: 13, obligation: input.serviceObligations[0] ?? null }];
  for (const obligation of input.serviceObligations.slice(1)) {
    const [extra] = await output.copyPages(source, [12]); output.addPage(extra); const page = output.getPageCount();
    for (const w of input.writes.filter(w => w.page === 13)) for (const f of map.fields.filter(f => f.page === 13 && f.field === w.field)) draw(page, f.rect, w.value, w.field, w.factIds, w.caseIds);
    servicePages.push({ page, obligation });
  }
  for (const service of servicePages) if (service.obligation) draw(service.page, [36, 9, 575, 29], `Prospective service: ${service.obligation.county} County; actual recipient/service unresolved.`, "held_review_prospective_county", [], service.obligation.caseIds, false);
  for (const page of output.getPages()) page.drawText("HELD REVIEW DRAFT - NOT FOR FILING OR SERVICE", { x: 36, y: 8, size: 8, font: outFont, color: rgb(.55, 0, 0) });
  const bytes = Buffer.from(await output.save({ useObjectStreams: false }));
  return { bytes, artifactSha256: sha(bytes), input, inputSha256: sha(JSON.stringify(input)), sourceSha256: sha(sourceBytes), mappingSha256: sha(mappingBytes), normalizedSourceSha256: sha(baked), normalizationTool: JSON.parse(execFileSync("python", ["-c", "import pymupdf,hashlib,pathlib,json;print(json.dumps({'version':pymupdf.VersionBind,'moduleSha256':hashlib.sha256(pathlib.Path(pymupdf.__file__).read_bytes()).hexdigest(),'nativeSha256':hashlib.sha256(pathlib.Path(pymupdf._mupdf.__file__).read_bytes()).hexdigest()}))"], { encoding: "utf8" })), excludedPublisherControls: map.fields.filter(f => f.type === "Button").map(f => ({ page: f.page, field: f.field, rect: f.rect, originalPrintFlag: false })), transport: "internal_review_tool_only_not_installed_worker", writes, continuations, servicePages,
    preservedSourcePages: 14, sourceWidgetCount: widgetCount, blankWidgetAppearancePolicy: "source_vector_appearances_preserved_by_pymupdf_bake", executionFieldsFilled: false, served: false, filingReady: false,
    generationAllowed: false, admissionGranted: false, deliveryAllowed: false, qualifiedLanguageApproval: false };
}
