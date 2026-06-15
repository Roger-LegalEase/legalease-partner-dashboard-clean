# AGENTS.md - Build Discipline

Plan of record: docs/LegalEase-Master-Build-Plan-v2.md

Agents must follow the plan of record. Never push, deploy, apply migrations, use git add ., edit live RCAP routes, edit legacy RCAP generators, or touch billing/auth/admin/Stripe/Supabase RLS unless explicitly authorized.

Research-source hierarchy: private/Nationwide Record Clearing/ is the counsel-researched, counsel-overseen source of truth for legal content: eligibility, workflows, forms, rules, citations, vocabulary, waiting periods, required fields, safety language, and filing instructions. src/lib/rcap/state-packs/<state>/ are the coded form of Nationwide research for states that already have state packs and should be imported directly where available. If a state pack and the Nationwide source conflict, Nationwide wins; the discrepancy is a state-pack fidelity bug to fix against Nationwide, not an open legal question. Official PDFs / HTML / statutes inside Nationwide are used to create or refresh state packs. Legacy generators are flow/output references only, never citation authority. If neither a state pack nor Wilma RTF exists, build a state pack from official source materials before wiring a renderer. Do not re-derive legal content from legacy generators when the Nationwide source, a structured state pack, Wilma RTF, official PDF, official HTML, or official statute source exists.

src/lib/rcap/state-packs/** are shared research assets consumed by both legacy generators and the new engine. They are read-only unless a task explicitly authorizes a fidelity correction against the Nationwide source. Neither agent may casually edit a state pack because a change can affect both consumers.

visual_review_required is a hard block, not a label. Agents may create and commit draft mapping files only if they remain blocked from final output.

Auto-generated state packs are draft research conversions. Agents may not wire a generated state pack into a renderer until the task includes a Nationwide fidelity check and the result is reported.

Codex: Nebraska CC 6:11 field mapping and official PDF overlay work only. Claude: Pennsylvania CustomPleadingRenderer and airtight pleading states only.

Mississippi legacy stays live. Nebraska set-aside is not expungement. No new-engine output goes live unless lifecycle is verified_replacement.
