import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { MN_CAPTION_SOURCE_FILES } from './rcap-official-forms/mn-caption-source-files.mjs';
import { createRuntimeAuthorityTracingIncludes, tracingIncludeKey } from './rcap-runtime-authority-consumers.mjs';

const appPath = 'briefcase/[packetId]/mn-caption-preview/[documentId]/route';
const source = fs.readFileSync(`src/app/${appPath}.ts`, 'utf8');
const tree = ts.createSourceFile('route.ts', source, ts.ScriptTarget.Latest, true);
const reads = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'readFile') {
    const arg = node.arguments[0];
    assert(ts.isCallExpression(arg) && arg.expression.getText(tree) === 'path.join');
    assert.equal(arg.arguments.length, 2);
    assert.equal(arg.arguments[0].getText(tree), 'process.cwd()');
    assert(ts.isStringLiteral(arg.arguments[1]), 'runtime PDF reads must have finite literal paths, never a project-root wildcard');
    reads.push(arg.arguments[1].text);
  }
  ts.forEachChild(node, visit);
}
visit(tree);
assert.deepEqual(reads.sort(), Object.values(MN_CAPTION_SOURCE_FILES).sort(), 'all four custody PDFs remain statically read and no other source is admitted');
const includes = createRuntimeAuthorityTracingIncludes()[tracingIncludeKey(appPath)];
assert(includes);
for (const file of reads) assert(includes.includes(file), `required PDF still included: ${file}`);
assert(!includes.includes('private/**') && !includes.includes('**/*'));
console.log(JSON.stringify({ status: 'PASS', staticPdfPaths: reads, exactIncludesPreserved: true, limits: 'Source-level bounded trace contract; not a generated Turbopack package-size or hosted build claim.' }));
