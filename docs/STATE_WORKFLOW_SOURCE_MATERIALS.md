# State Workflow Source Materials

Every LegalEase RCAP state workflow must preserve its jurisdiction-specific source materials in the repo.

Required source standard for each state:

- The uploaded legal reference PDF.
- The uploaded form/template HTML packet or official template material.
- A `docs/reference/<state>/README.md` file that points to the actual committed source-file paths.

Future state workflows cannot be implemented from generic summaries. Each workflow must be adapted to that jurisdiction's terminology, relief types, eligibility rules, waiting periods, exclusions, packet structure, filing instructions, service requirements, and court or county process.

If a required jurisdiction-specific rule is unclear from the source materials, flag it as a workflow gap instead of guessing.
