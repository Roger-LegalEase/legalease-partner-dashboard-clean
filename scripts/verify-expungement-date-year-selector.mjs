import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { CalendarDateField } = await import("../src/components/expungement-ai/screening/fields/CalendarDateField.tsx");
const { questionAnswerState } = await import("../src/lib/expungement-ai/question-answer-state.ts");
// The old source-string check required a 90-year cutoff and component-local drafts.
// The contract is usable calendar input, honest validity and retained partial data.
for (const [value, year] of [["1890-02-28", "1890"], ["2000-02-29", "2000"], ["2001-02-", "2001"]]) {
  const html = renderToStaticMarkup(createElement(CalendarDateField, { id: "birth", value: { value }, onChange() {} }));
  assert.match(html, new RegExp(`value="${year}"`));
  assert.match(html, /value="02" selected=""/);
  assert.match(html, /Month/); assert.match(html, /Day/); assert.match(html, /Year/);
}
const question = { id: "date_of_birth", type: "date" };
assert.equal(questionAnswerState(question, "2001-02-", "2026-10-11"), "invalid");
assert.equal(questionAnswerState(question, "2001-02-29", "2026-10-11"), "invalid");
assert.equal(questionAnswerState(question, "2000-02-29", "2026-10-11"), "known_valid");
assert.equal(questionAnswerState(question, "2026-10-12", "2026-10-11"), "invalid");
console.log("Calendar control source render and date validation passed; protected save/recovery and interactive browser coverage remain separate.");
