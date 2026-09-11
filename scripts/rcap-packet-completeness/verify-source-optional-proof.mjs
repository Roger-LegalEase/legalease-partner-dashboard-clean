#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const req = createRequire(import.meta.url);
const { PDFDocument } = req("pdf-lib");
const proof = JSON.parse(process.argv[2] ?? "{}");
const fail = (basis) => { process.stdout.write(JSON.stringify({ basis })); process.exit(1); };
if (!fs.existsSync(proof.sourcePath)) fail("sourceOptional source bytes are unavailable");
const bytes = fs.readFileSync(proof.sourcePath);
if (crypto.createHash("sha256").update(bytes).digest("hex") !== proof.sourceSha256.toLowerCase()) fail("sourceOptional source SHA-256 does not match current bytes");
const doc = await PDFDocument.load(bytes);
const pages = doc.getPages();
if (proof.page > pages.length) fail("sourceOptional page is outside the source document");
const pageRef = String(pages[proof.page - 1].ref);
const field = doc.getForm().getFields().find((f) => f.getName() === proof.field);
if (!field) fail("sourceOptional field name is absent from the pinned source");
const widgets = field.acroField.getWidgets();
const widget = widgets.find((w) => String(w.P()) === pageRef);
if (!widget) fail("sourceOptional field has no widget on the declared source page");
const actual = widget.getRectangle();
for (const key of ["x", "y", "width", "height"]) if (typeof proof.rect?.[key] !== "number" || Math.abs(actual[key] - proof.rect[key]) > 0.01) fail("sourceOptional geometry does not match the source field widget");
const extracted = spawnSync("pdftotext", ["-f", String(proof.page), "-l", String(proof.page), proof.sourcePath, "-"], { encoding: "utf8" });
if (extracted.status !== 0) fail("sourceOptional source page text could not be extracted");
const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();
if (!norm(extracted.stdout).includes(norm(proof.sourceText))) fail("sourceOptional source wording is absent from the pinned source page");
process.stdout.write(JSON.stringify({ ok: true }));
