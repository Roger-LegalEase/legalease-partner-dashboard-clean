// Optional help retains hidden choices; open it through the participant control first.
export async function clickVisibleScreeningChoice(page, expected) {
  const help = page.getByRole('button', {name: /^show optional help$/i});
  if (await help.isVisible()) await help.click();
  for (const candidate of await page.locator('label, [role=radio], button[type=button], [role=option], li').all()) {
    if (!await candidate.isVisible()) continue;
    const text = ((await candidate.textContent().catch(() => '')) ?? '').trim();
    if (expected.test(text)) { await candidate.click(); return text; }
  }
  return null;
}
