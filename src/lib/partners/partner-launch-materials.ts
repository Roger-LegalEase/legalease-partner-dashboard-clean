import "server-only";

import QRCode from "qrcode";
import { getExpungementAiBaseUrl } from "@/lib/app-url";
import { partnerPublicPage } from "@/lib/partners/routes";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { getPartnerAccessMode } from "@/lib/partners/partner-access-codes";

// Deterministic launch kit for a partner. Generates the public link + a QR code
// and plain-English outreach copy. All legal disclaimers are preserved.

const DISCLAIMERS = [
  "This is not legal advice.",
  "Eligibility is not guaranteed; you may be eligible.",
  "There is no guaranteed expungement outcome.",
  "Whether a personalized packet can be generated depends on your information and the available route."
];

const PACKET_CREDITS_EXPLANATION =
  "Packet credits are only used when Expungement.ai successfully generates a personalized record-clearing packet. Screenings, account creation, ineligible results, and failed packet generations do not use packet credits.";

const AFTER_SCREENING_EXPLANATION =
  "After screening, participants see whether a record-clearing path may be available, get plain-language next steps, and — when a route is available — can continue to a personalized packet. Everything is saved in their private Briefcase.";

export type PartnerLaunchMaterials = {
  partnerSlug: string;
  partnerName: string;
  landingUrl: string;
  qrCodeSvg: string;
  qrCodeDataUrl: string;
  smsCopy: string;
  emailCopy: string;
  flyerCopy: string;
  accessCodeInstructions: string | null;
  packetCreditsExplanation: string;
  afterScreeningExplanation: string;
  disclaimers: string[];
};

export async function buildPartnerLaunchMaterials(partnerSlug: string): Promise<PartnerLaunchMaterials> {
  const slug = (partnerSlug ?? "").trim().toLowerCase();
  const partner = await getPartnerRecordBySlug(slug);
  const partnerName = partner?.organizationName ?? partner?.partnerName ?? slug;
  const accessMode = await getPartnerAccessMode(slug);
  const codesEnabled = accessMode !== "open";

  const landingUrl = `${getExpungementAiBaseUrl()}${partnerPublicPage(slug)}`;

  const [qrCodeSvg, qrCodeDataUrl] = await Promise.all([
    QRCode.toString(landingUrl, { type: "svg", margin: 1 }),
    QRCode.toDataURL(landingUrl, { margin: 1, width: 320 })
  ]);

  const codeSuffix = codesEnabled ? " If you received an access code from us, enter it when prompted." : "";

  const smsCopy = `Need help understanding whether record clearing may be available to you? Start here: ${landingUrl}.${codeSuffix}`;

  const emailCopy = [
    `Our organization is partnering with LegalEase / Expungement.ai to help community members take the first step toward understanding possible record-clearing options.`,
    ``,
    `Start here: ${landingUrl}.${codeSuffix}`,
    ``,
    DISCLAIMERS.join(" ")
  ].join("\n");

  const flyerCopy = [
    `${partnerName} + Expungement.ai`,
    `Take the first step toward understanding possible record-clearing options.`,
    ``,
    `Scan the code or visit: ${landingUrl}`,
    codesEnabled ? `Enter the access code you received from ${partnerName} when prompted.` : ``,
    ``,
    DISCLAIMERS.join(" ")
  ].filter(Boolean).join("\n");

  const accessCodeInstructions = codesEnabled
    ? `This partner uses access codes. Share the code(s) you created with your participants and ask them to enter the code on the partner page. ${accessMode === "invite_only" || accessMode === "required_code" ? "Participants without a valid code continue through the standard Expungement.ai experience." : "Participants without a code can still continue and are attributed to your program."}`
    : null;

  return {
    partnerSlug: slug,
    partnerName,
    landingUrl,
    qrCodeSvg,
    qrCodeDataUrl,
    smsCopy,
    emailCopy,
    flyerCopy,
    accessCodeInstructions,
    packetCreditsExplanation: PACKET_CREDITS_EXPLANATION,
    afterScreeningExplanation: AFTER_SCREENING_EXPLANATION,
    disclaimers: DISCLAIMERS
  };
}
