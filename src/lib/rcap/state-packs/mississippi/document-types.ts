export type MississippiDocumentType =
  | "mississippi_non_conviction_petition"
  | "mississippi_misdemeanor_conviction_petition"
  | "mississippi_felony_conviction_petition"
  | "mississippi_certificate_of_service"
  | "mississippi_proposed_order_placeholder";

export const mississippiDocumentTypes = {
  non_conviction: {
    type: "mississippi_non_conviction_petition" as const,
    title: "Petition for Dismissal and Expungement of Criminal Record"
  },
  misdemeanor_conviction: {
    type: "mississippi_misdemeanor_conviction_petition" as const,
    title: "Petition for Expungement of Criminal Record"
  },
  felony_conviction: {
    type: "mississippi_felony_conviction_petition" as const,
    title: "Petition for Expungement of Criminal Record of Criminal Conviction"
  }
};
