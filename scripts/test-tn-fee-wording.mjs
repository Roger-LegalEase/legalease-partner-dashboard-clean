import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import test from "node:test";

const directory = "data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading";
for (const route of ["tn_eligible_conviction", "tn_two_offense"]) {
  for (const fixture of ["canonical", "boundary"]) {
    test(`${route}/${fixture}: filing-fee guidance follows the adopted rule`, () => {
      const text = execFileSync("pdftotext", ["-layout",
        `${directory}/fixtures/routes/${route}/${fixture}.pdf`, "-"], { encoding: "utf8" })
        .replace(/\s+/g, " ");
      const start = text.indexOf("Fee as recorded:");
      const end = text.indexOf("Service as recorded:", start);
      assert.ok(start >= 0 && end > start, "exact fee section remains present");
      const fee = text.slice(start, end);
      assert.doesNotMatch(fee, /\$\s*\d/, "no filing-fee dollar figure, including superseded amounts");
      assert.match(fee, /8-21-401/);
      assert.match(fee, /40-32-108\(a\)/);
      assert.match(fee, /clerk of the court where the petition is filed what it charges before filing/);
      assert.match(fee, /None is asserted/, "no unsupported waiver promise");
      assert.doesNotMatch(fee, /installments allowed|discretionary waiver since 2021/);
    });
  }
}
test("the action sequence distinguishes the filing clerk from the DA preparing the petition", () => {
  const instructions = fs.readFileSync(`${directory}/participant-instructions.md`, "utf8");
  const step = instructions.split("\n").find(line => line.startsWith("5. "));
  assert.ok(step, "step five exists");
  assert.match(step, /eligible-conviction and two-offense routes/);
  assert.match(step, /clerk of the court where the petition is filed/);
  assert.match(step, /other routes, ask the filing office named for your route/);
});
