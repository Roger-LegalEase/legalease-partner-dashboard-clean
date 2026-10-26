import "server-only";
import type { EngineProfile, ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { legalRouteContract } from "@/lib/legal-authority/index";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import memo from "../../../data/record-clearing/legal-design-intake/DC.memo.json";
import crosswalk from "../../../data/rcap-ledger/track-pathway-crosswalk.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

// Original GA42 22/24/28: a requested information topic is not qualification.
// Reuses retained adopted memo0/1 and approved historical automatic guidance;
// juvenile Family Division scope remains distinct, with no adult packet.
export const DC_INFORMATION_ROUTES = {
  "expungement": "dc_auto_expungement_16_802",
  "sealing": "dc_auto_sealing_16_805",
  "juvenile": "dc_juvenile_sealing_16_2335"
} as const;
export const DC_INFORMATION_COPY = {
  "expungement": {
    "general": "General information about D.C. Code § 16-802 automatic expungement. Nothing is filed by the participant for this automatic process. This result does not establish that your record qualifies or has been expunged.",
    "checks": [
      "Section 16-802 concerns offenses later decriminalized, legalized or held unconstitutional, or qualifying simple marijuana possession before February 15, 2015. The actual offense, final disposition and any successful prosecutor contest must be checked; a topic or broad conviction label does not establish them.",
      "The retained source gives the Court a deadline of October 1, 2027, or 90 days after termination or final disposition, whichever is later. That is not a sentence-completion waiting period or a promise about your case."
    ],
    "limits": [
      "The retained reviewed guidance reports that automatic sealing and expungement were not operating. Verify the current status with D.C. Courts; this result does not establish that relief has occurred.",
      "Check what the Court and relevant agencies show for your record. An available motion-based alternative has separate requirements; get help for uncertainty or immigration, firearm, licensing or sensitive-employment consequences."
    ]
  },
  "sealing": {
    "general": "General information about D.C. Code § 16-805 automatic sealing. Nothing is filed by the participant for this automatic process. This result does not establish that your record qualifies or has been sealed.",
    "checks": [
      "The source distinguishes cases ending without conviction from qualifying misdemeanor convictions. The misdemeanor branch uses ten years since sentence completion; the actual disposition, offense and applicable automatic-sealing exclusions must be checked. No personal clock is calculated here.",
      "The retained source gives the Court a deadline of October 1, 2027, or 90 days after the applicable triggering event, whichever is later. A Court deadline is not a promise that your record has changed."
    ],
    "limits": [
      "The retained reviewed guidance reports that automatic sealing and expungement were not operating. Verify the current status with D.C. Courts; this result does not establish that relief has occurred.",
      "The § 16-805(b) exclusions concern automatic sealing and are not a universal bar on motion sealing. Motion-based alternatives have separate requirements. Get help for uncertainty or immigration, firearm, licensing or sensitive-employment consequences."
    ]
  },
  "juvenile": {
    "general": "General information about juvenile-record sealing under D.C. Code § 16-2335 in the Family Division. This adult screening flow does not prepare an adult Criminal Division packet for juvenile sealing or establish that your juvenile record qualifies or has been sealed.",
    "checks": [
      "The retained source describes a motion by the person or the Family Division’s own motion. It distinguishes reaching majority in a neglect case from two years after the relevant discharge or order, and requires checks for later convictions or adjudications and pending proceedings. Those facts remain unestablished here.",
      "Check the juvenile case and relevant Family Division orders rather than applying an adult conviction-sealing clock. A later delinquency or need-of-supervision adjudication or felony conviction can nullify a sealing order under the retained source."
    ],
    "limits": [
      "This is conditional information about a separate juvenile process, not an adult petition, a personal eligibility decision or a finding that a court order exists. Keep unknown case facts unknown and get appropriate help with the Family Division process."
    ]
  }
};
export const DC_INFORMATION_SOURCE = "DC.memo:dc_auto_expungement/dc_auto_sealing;DC-source:16-2335;conditional-general-information";
const expected = {
  "dc_auto_expungement_16_802": {
    "pathway": "74e40f6a7c84f68c0f59f144836eaa12d6b673517073b673c564179b4e804ea9",
    "plan": "50c5408947ea95e9f6c02e82fcc1908fa83985ab95168566743bc29e2734aa25",
    "rules": "5fd1173b98e9272ed099ad71a9941c8fa420b7970da88140439b98a50678f89d",
    "crosswalk": "a6e7c11cac1e4fcdc5fc7ef419f75d776686ed1ecfe080063834311dd1c08b2b"
  },
  "dc_auto_sealing_16_805": {
    "pathway": "917133a13efbf99276df358dad1513bbca3b83cb1fb6ad5b33e6121ebbf13297",
    "plan": "37c989e7070d26fa195e07689313ec7a2988ca133aaaa1bd8dd561a0ffff3e58",
    "rules": "dfe16b95715f591c5cbc83db91f5ba93bf0eb1c0689d47df868d331eda35c675",
    "crosswalk": "3eb2f6e42dec8996b1e5a626f72d09e949fcb0b0cab24e7667aab8704bfe8d25"
  },
  "dc_juvenile_sealing_16_2335": {
    "pathway": "883a7f25cbd647ab366a21c7f52a5b8c9221d52f1fcbee3a1a93216d67c3df5a",
    "plan": "a0d1bc8c70870f899b91d986ed75490cd45738271f55c1077a862e29e2c79579",
    "rules": "8a4dbe041bfb92c8539f64a482217874c2d981ea704f8173ee9bd98cb25edcd7",
    "crosswalk": "81e8b9e94c2d9a95fff8b1963a520d561090a721b694edc5ef3fb7656d7a3221"
  }
};
const expectedMemo = ["e275eebd286ec8376a8885d8377b132c42b4ef5cd0c4ec7da34019bc25fea842", "6f39d0537971811c3c0fdb2d135569e34ab1da1b35c03f347c473470c6e8443b"];
const expectedAsset = "c7b32004aef5991c27856fd3f6ed4cb40c221b85369243ddaf170afc271fef4c";
const genericIds = ["sentence_completion_date", "resolved_timing_bucket", "court_requirements_completed"];
type Current = { memoTracks?: unknown[]; crosswalk?: unknown; approvedAsset?: unknown; contract?: unknown; specification?: unknown };
export function dcGeneralInformationSourceIsCurrent(profile: EngineProfile, pathwayId: string | undefined, current: Current = {}): boolean {
  const route = Object.values(DC_INFORMATION_ROUTES).find(id => id === pathwayId);
  if (!route) return false;
  const pinned = expected[route];
  const rules = profile.orderedDecisionRules.filter(row => row.candidatePathwayIds?.includes(route) || row.when.backendPathwayId === route);
  const tracks = current.memoTracks === undefined ? memo.tracks.slice(0, 2) : current.memoTracks;
  const approved = current.approvedAsset === undefined ? manifest.families.find(row => row.familyId === "rcap-dc-guidance-implementation") : current.approvedAsset;
  return profile.jurisdiction.code === "DC" && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "988b68029434ace064151c98bf5ab564c4b90673167cbeb305f8ec92213b8c65"
    && hash(profile.pathways.find(row => row.id === route) ?? null) === pinned.pathway
    && hash(profile.packetGenerator.pathways.find(row => row.pathwayId === route) ?? null) === pinned.plan
    && hash(rules) === pinned.rules
    && hash((current.crosswalk === undefined ? crosswalk.compiledPathways.find(row => row.compiledPathwayId === route) : current.crosswalk) ?? null) === pinned.crosswalk
    && (route === DC_INFORMATION_ROUTES.juvenile || (tracks.length === 2 && tracks.every((track, index) => hash(track) === expectedMemo[index]) && hash(approved ?? null) === expectedAsset))
    && (current.contract === undefined ? legalRouteContract("DC", route) : current.contract) == null
    && (current.specification === undefined ? packetSpecificationFor(`DC:${route}`) : current.specification) == null;
}
export function dcGeneralInformationContext(profile: EngineProfile, pathwayId: string | undefined, answers: Record<string, ScreeningAnswerValue>): keyof typeof DC_INFORMATION_ROUTES | null {
  if (!dcGeneralInformationSourceIsCurrent(profile, pathwayId)
    || !["Yes", "I am helping someone complete their own check"].includes(String(answers.ownership_scope))
    || answers.jurisdiction_scope !== "State or local") return null;
  // The existing selector has already checked compatibility. Require actual
  // public factual context as well; never infer a conviction or juvenile case.
  if (pathwayId === DC_INFORMATION_ROUTES.juvenile) return answers.case_outcome === "Juvenile adjudication or offense committed as a minor" ? "juvenile" : null;
  if (!["Misdemeanor conviction", "Dismissed, no-billed, nolle prosequi, or not prosecuted", "Acquitted or found not guilty"].includes(String(answers.case_outcome))
    || !["Misdemeanor", "Felony"].includes(String(answers.offense_level))) return null;
  return pathwayId === DC_INFORMATION_ROUTES.expungement ? "expungement" : pathwayId === DC_INFORMATION_ROUTES.sealing ? "sealing" : null;
}
export function dcGeneralInformationQuestionApplies(profile: EngineProfile, pathwayId: string | undefined, answers: Record<string, ScreeningAnswerValue>, id: string): boolean {
  return !genericIds.includes(id) || dcGeneralInformationContext(profile, pathwayId, answers) === null;
}
