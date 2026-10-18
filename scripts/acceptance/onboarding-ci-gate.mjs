#!/usr/bin/env node
// Onboarding CI gate for .github/workflows/rcap-partner-onboarding.yml.
//
//   node scripts/acceptance/onboarding-ci-gate.mjs inventory <workflow.yml>
//     every command line of every `run:` step, with the matrix group that runs it
//   node scripts/acceptance/onboarding-ci-gate.mjs parity <baseline.yml> <candidate.yml>
//     exit 1 if any baseline command is missing from the candidate, or a test command runs twice
//   NEEDS='${{ toJSON(needs) }}' node scripts/acceptance/onboarding-ci-gate.mjs gate <workflow.yml> <job>...
//     exit 1 unless every named job reports result=success, and the workflow's own gating is sound
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// shortcut: line-based extraction tuned to this workflow's indentation (steps at 6 spaces, step keys
// at 8, run bodies at 10+); switch to a YAML parser if the file gains nested structure.
export function inventory(text) {
  const rows = [];
  let step = null, group = 'all', inRun = false;
  for (const line of text.split('\n')) {
    if (/^      - name: /.test(line)) { step = line.slice(14).trim(); group = 'all'; inRun = false; continue; }
    const gated = /^        if: matrix\.group == '([^']+)'\s*$/.exec(line);
    if (gated) { group = gated[1]; continue; }
    const oneLine = /^        run: (?!\|)(.+)$/.exec(line);
    if (oneLine) { rows.push({ step, group, cmd: oneLine[1].trim() }); inRun = false; continue; }
    if (/^        run: \|\s*$/.test(line)) { inRun = true; continue; }
    if (inRun) {
      if (/^ {10}\S/.test(line)) rows.push({ step, group, cmd: line.trim() });
      else if (line.trim() !== '') inRun = false;
    }
  }
  return rows;
}

export function matrixGroups(text) {
  const m = /^\s+group: \[([^\]]+)\]\s*$/m.exec(text);
  return m ? m[1].split(',').map((g) => g.trim()) : [];
}

const isTestCommand = (cmd) => /^(node |npm run )/.test(cmd);

export function parity(baselineRows, candidateRows) {
  const baseline = new Set(baselineRows.map((r) => r.cmd));
  const candidate = new Set(candidateRows.map((r) => r.cmd));
  const missing = [...baseline].filter((c) => !candidate.has(c));
  const added = [...candidate].filter((c) => !baseline.has(c));
  return { missing, added, duplicated: duplicatedTestCommands(candidateRows), ok: missing.length === 0 && duplicatedTestCommands(candidateRows).length === 0 };
}

function duplicatedTestCommands(rows) {
  const counts = new Map();
  for (const r of rows) if (isTestCommand(r.cmd)) counts.set(r.cmd, (counts.get(r.cmd) ?? 0) + 1);
  return [...counts].filter(([, n]) => n > 1).map(([cmd]) => cmd);
}

/** Problems in the workflow itself: a gated step whose group is not in the matrix would be
 * skipped on every leg and look green; a test command listed twice runs twice. */
export function structure(text) {
  const groups = matrixGroups(text);
  const problems = [];
  if (groups.length === 0) problems.push('no matrix group list found');
  for (const row of inventory(text)) {
    if (row.group !== 'all' && !groups.includes(row.group)) problems.push(`step "${row.step}" is gated on group '${row.group}', which is not in the matrix ${JSON.stringify(groups)}`);
  }
  for (const cmd of duplicatedTestCommands(inventory(text))) problems.push(`command runs more than once: ${cmd}`);
  return [...new Set(problems)];
}

export function gate(needs, jobs) {
  const problems = [];
  if (jobs.length === 0) problems.push('no jobs named');
  for (const job of jobs) {
    const result = needs?.[job]?.result;
    if (result === undefined) problems.push(`${job}: no result`);
    else if (result !== 'success') problems.push(`${job}: ${result}`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, ...args] = process.argv.slice(2);
  const read = (p) => fs.readFileSync(p, 'utf8');
  if (mode === 'inventory') {
    console.log(JSON.stringify(inventory(read(args[0])), null, 1));
  } else if (mode === 'parity') {
    const result = parity(inventory(read(args[0])), inventory(read(args[1])));
    console.log(JSON.stringify({ baselineCommands: inventory(read(args[0])).length, candidateCommands: inventory(read(args[1])).length, ...result }, null, 1));
    process.exit(result.ok ? 0 : 1);
  } else if (mode === 'gate') {
    const [workflow, ...jobs] = args;
    const needs = process.env.NEEDS ? JSON.parse(process.env.NEEDS) : null;
    const problems = [...gate(needs, jobs), ...structure(read(workflow))];
    console.log(`tested merge-ref ${process.env.GITHUB_SHA ?? '(not in Actions)'}; needs=${JSON.stringify(needs)}`);
    for (const p of problems) console.error(`::error::${p}`);
    if (problems.length) process.exit(1);
    console.log(`all ${jobs.length} group job(s) succeeded; ${inventory(read(workflow)).length} commands, each test command once`);
  } else {
    console.error('usage: inventory <yml> | parity <baseline.yml> <candidate.yml> | gate <yml> <job>...');
    process.exit(2);
  }
}
