export type LegalSection = {
  id: string;
  title: string;
  body: string[];
  subsections?: { title: string; body: string[] }[];
  list?: string[];
};

export const legaleaseAddress = ["LegalEase Incorporated", "907 Peace Street", "Canton, MS 39046", "Email: info@legalease.law"];

export const termsSections: LegalSection[] = [
  {
    id: "relationship-to-product-specific-terms",
    title: "Relationship to Product-Specific Terms",
    body: [
      "LegalEase operates and supports multiple products, workflows, partner programs, and websites. Some products, order forms, partner agreements, subscriptions, pilots, or services may have additional terms, product-specific terms, service descriptions, statements of work, or written agreements.",
      "If product-specific terms conflict with these Terms, the product-specific terms control for that product or service. All other provisions of these Terms remain in effect."
    ]
  },
  {
    id: "important-legal-disclaimers",
    title: "Important Legal Disclaimers",
    body: ["Please read this section carefully."],
    subsections: [
      {
        title: "A. LegalEase Is Not a Law Firm",
        body: [
          "Unless expressly stated in a separate written agreement with a licensed attorney or law firm, LegalEase is not a law firm, does not provide legal representation, does not act as your attorney, and does not create an attorney-client relationship with you.",
          "Using the Services, submitting information, receiving automated outputs, using AI-assisted features, downloading documents, communicating with support, or interacting with a LegalEase product does not create an attorney-client relationship."
        ]
      },
      {
        title: "B. No Legal Advice",
        body: [
          "The Services may provide general information, self-help tools, document automation, guided workflows, educational content, checklists, AI-assisted explanations, and operational support. The Services do not provide legal advice, legal opinions, legal strategy, attorney judgment, or a substitute for advice from a licensed attorney.",
          "You should consult a licensed attorney if you need legal advice, have questions about your rights, face deadlines, have a complex matter, have immigration consequences, have pending court proceedings, are unsure what to file, need representation, or need someone to evaluate your specific situation."
        ]
      },
      {
        title: "C. No Government Affiliation",
        body: ["LegalEase is not a court, government agency, law enforcement agency, prosecutor's office, public defender's office, clerk's office, legal aid organization, or official government website unless expressly stated in writing for a specific program."]
      },
      {
        title: "D. No Guarantee",
        body: ["LegalEase does not guarantee any legal outcome, filing outcome, court outcome, agency outcome, application outcome, approval, eligibility result, record clearing, claim result, settlement, refund, benefit, or other result."]
      },
      {
        title: "E. You Are Responsible for Review and Filing",
        body: ["You are responsible for reviewing all information, forms, documents, filings, deadlines, and instructions before use. You are responsible for deciding whether to file, where to file, and how to respond to any court, agency, or third party."]
      }
    ]
  },
  {
    id: "description-of-the-services",
    title: "Description of the Services",
    body: ["The Services may include websites, product pages, guided self-help workflows, document-preparation tools, AI-assisted explanations, partner dashboards, client portals, payment flows, support communications, and related operational tools."]
  },
  {
    id: "ai-assisted-features",
    title: "AI-Assisted Features",
    body: [
      "The Services may include AI-assisted features, including assistants, chat tools, intake guides, document helpers, summarizers, support tools, and automated workflow features.",
      "AI-assisted features are not lawyers, do not provide legal advice, do not create an attorney-client relationship, and do not guarantee outcomes."
    ]
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    body: ["You agree to provide accurate information, use the Services lawfully, review outputs before using them, protect account credentials, and seek legal advice when your situation requires attorney judgment."]
  },
  {
    id: "accounts",
    title: "Accounts",
    body: ["You may need an account to use certain Services. You agree to provide accurate account information and keep it updated. We may suspend, restrict, or terminate your account if we believe you violated these Terms, misused the Services, created risk, failed to pay, provided false information, attempted unauthorized access, or used the Services unlawfully."]
  },
  {
    id: "partner-and-co-branded-services",
    title: "Partner and Co-Branded Services",
    body: ["Some Services may be offered through or with partner organizations, including nonprofits, legal aid organizations, community organizations, workforce programs, schools, employers, clinics, government programs, funders, or other partners. If you use a partner-supported Service, certain information may be shared with the partner as described in our Privacy Policy or at the time of collection."]
  },
  {
    id: "attorney-referrals-and-legal-services",
    title: "Attorney Referrals and Legal Services",
    body: ["The Services may provide information about attorneys, legal aid organizations, clinics, law firms, or other legal service providers. Unless expressly stated in a separate written attorney engagement agreement, LegalEase does not provide legal representation. Any attorney-client relationship is between you and the attorney, law firm, or legal service provider that separately agrees to represent you."]
  },
  {
    id: "payments-billing-and-refunds",
    title: "Payments, Billing, and Refunds",
    body: ["Prices, products, packages, subscriptions, and features are displayed at checkout, in the applicable order form, or in the applicable written agreement. By purchasing a Service, you authorize LegalEase and our payment processor to charge the payment method you provide. Refund eligibility, if any, is described at checkout, in the applicable order form, or in product-specific terms."]
  },
  {
    id: "subscriptions-and-automatic-renewals",
    title: "Subscriptions and Automatic Renewals",
    body: ["If we offer subscriptions, memberships, recurring billing, or automatically renewing services, the applicable price, billing interval, renewal terms, cancellation process, and any trial terms will be disclosed at or before checkout."]
  },
  {
    id: "communications-consent",
    title: "Communications Consent",
    body: ["You agree that we may contact you by email, phone, text message, mail, in-app message, or other communication method you provide for account, service, transactional, security, support, legal, or administrative purposes."]
  },
  {
    id: "electronic-signatures-and-records",
    title: "Electronic Signatures and Records",
    body: ["You consent to receive notices, disclosures, agreements, receipts, policies, and other records electronically. You agree that electronic signatures, clicks, checkboxes, account actions, and similar indications may satisfy legal signature and record requirements."]
  },
  {
    id: "privacy",
    title: "Privacy",
    body: ["Our Privacy Policy explains how we collect, use, disclose, retain, and protect information. By using the Services, you acknowledge our Privacy Policy."]
  },
  {
    id: "prohibited-uses",
    title: "Prohibited Uses",
    body: ["You agree not to misuse the Services, submit false information, interfere with security, attempt unauthorized access, use outputs unlawfully, submit another person's information without authorization, or use the Services for any purpose prohibited by law or these Terms."]
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    body: ["The Services, including software, workflows, templates, content, designs, branding, logos, text, graphics, forms, document logic, databases, code, and other materials, are owned by LegalEase or its licensors and are protected by intellectual property and other laws. Subject to these Terms, we grant you a limited, revocable, non-exclusive, non-transferable, non-sublicensable license to access and use the Services for your personal, internal, or authorized partner use."]
  },
  {
    id: "user-content",
    title: "User Content",
    body: ["User Content means information, documents, answers, files, messages, feedback, and materials you submit to the Services. You retain ownership of your User Content. You grant us a limited license to host, process, store, reproduce, display, modify, transmit, use, and create derivative materials from User Content as reasonably necessary to provide, operate, secure, improve, and support the Services, comply with law, and enforce these Terms."]
  },
  {
    id: "feedback-reviews-and-testimonials",
    title: "Feedback, Reviews, and Testimonials",
    body: ["If you provide suggestions, ideas, comments, bug reports, testimonials, or feedback, we may use them without restriction or compensation unless otherwise agreed in writing. Nothing in these Terms prohibits you from making honest reviews or statements about our products, services, or conduct."]
  },
  {
    id: "third-party-services-and-links",
    title: "Third-Party Services and Links",
    body: ["The Services may integrate with or link to third-party services, including courts, government websites, payment processors, authentication providers, cloud providers, analytics providers, partner organizations, attorneys, legal service providers, social media platforms, and other websites. LegalEase is not responsible for third-party content, accuracy, policies, security, availability, fees, services, acts, or omissions."]
  },
  {
    id: "service-availability-and-changes",
    title: "Service Availability and Changes",
    body: ["We may modify, suspend, discontinue, restrict, or update the Services at any time. We may change workflows, products, features, prices, forms, templates, content, availability, or eligibility for access."]
  },
  {
    id: "disclaimers-of-warranties",
    title: "Disclaimers of Warranties",
    body: ["To the maximum extent permitted by law, the Services are provided as is, as available, and with all faults. LegalEase disclaims all warranties, express or implied, including warranties of accuracy, completeness, merchantability, fitness for a particular purpose, title, non-infringement, availability, security, and that outputs will be accepted by a court, agency, employer, landlord, creditor, insurer, or other third party."]
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    body: ["To the maximum extent permitted by law, LegalEase and our officers, directors, employees, contractors, agents, affiliates, partners, licensors, and service providers will not be liable for indirect, incidental, consequential, special, exemplary, punitive, or enhanced damages, including lost profits, lost opportunities, lost data, reputational harm, emotional distress, legal consequences, missed deadlines, rejected filings, denied petitions, court fees, attorney fees, third-party database issues, or other losses, even if we were advised of the possibility of such damages. To the maximum extent permitted by law, our total liability for any claim arising out of or relating to the Services or these Terms will not exceed the greater of the amount you paid LegalEase for the specific Service giving rise to the claim during the six months before the claim arose, or one hundred dollars ($100)."]
  },
  {
    id: "indemnification",
    title: "Indemnification",
    body: ["To the maximum extent permitted by law, you agree to defend, indemnify, and hold harmless LegalEase and our officers, directors, employees, contractors, agents, affiliates, partners, licensors, and service providers from and against claims, damages, liabilities, losses, costs, and expenses, including reasonable attorneys' fees, arising out of or relating to your use or misuse of the Services, User Content, violation of these Terms, violation of law or third-party rights, unauthorized submission of another person's information, filing or non-filing decisions, or fraud, misrepresentation, negligence, or misconduct."]
  },
  {
    id: "dispute-resolution-informal-process",
    title: "Dispute Resolution; Informal Process",
    body: ["Before filing a claim, you and LegalEase agree to try to resolve disputes informally. Notices to LegalEase must be sent to LegalEase Incorporated, 907 Peace Street, Canton, MS 39046, with a copy by email to info@legalease.law."]
  },
  {
    id: "binding-arbitration",
    title: "Binding Arbitration",
    body: ["Please read this section carefully. It affects your legal rights. Except for disputes that qualify for small claims court, requests for emergency injunctive relief, or claims that cannot be arbitrated as a matter of law, you and LegalEase agree that any dispute, claim, or controversy arising out of or relating to these Terms, the Services, your account, your purchase, your documents, your communications with us, or your relationship with us will be resolved by binding individual arbitration."]
  },
  {
    id: "class-action-waiver",
    title: "Class Action Waiver",
    body: ["You and LegalEase agree to bring claims only in an individual capacity and not as a plaintiff, class member, representative, or private attorney general in any class action, collective action, consolidated action, representative action, or mass action."]
  },
  {
    id: "small-claims-court",
    title: "Small Claims Court",
    body: ["Either party may bring an individual claim in small claims court if the claim qualifies and remains in small claims court."]
  },
  {
    id: "arbitration-opt-out",
    title: "Arbitration Opt-Out",
    body: ["You may opt out of the arbitration agreement by sending written notice within 30 days after you first accept these Terms. Your opt-out notice must include your name, email address, mailing address, and a clear statement that you opt out of the arbitration agreement in the LegalEase Terms and Conditions."]
  },
  {
    id: "governing-law-and-venue",
    title: "Governing Law and Venue",
    body: ["These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law rules, except that the Federal Arbitration Act governs the arbitration agreement."]
  },
  {
    id: "termination",
    title: "Termination",
    body: ["You may stop using the Services at any time. We may suspend, restrict, or terminate your access to the Services at any time if we believe you violated these Terms, created risk, failed to pay, misused the Services, submitted false information, violated law, infringed rights, attempted unauthorized access, or harmed platform integrity."]
  },
  {
    id: "changes-to-these-terms",
    title: "Changes to These Terms",
    body: ["We may update these Terms from time to time. If we make material changes, we will update the Last Updated date and may provide notice by email, website notice, account notice, or other reasonable means. Your continued use of the Services after updated Terms become effective means you accept the updated Terms. If you do not agree to updated Terms, stop using the Services."]
  },
  {
    id: "miscellaneous",
    title: "Miscellaneous",
    body: ["These Terms, together with the Privacy Policy and any applicable order form, product-specific terms, or written agreement, are the entire agreement between you and LegalEase regarding the Services. You may not assign these Terms without our written consent. We may assign these Terms in connection with a merger, acquisition, reorganization, asset sale, financing, or by operation of law."]
  },
  {
    id: "contact",
    title: "Contact",
    body: ["Questions about these Terms should be sent to LegalEase Incorporated, 907 Peace Street, Canton, MS 39046, or info@legalease.law."]
  }
];

export const disclaimerSections: LegalSection[] = [
  {
    id: "general-information-only",
    title: "General Information Only",
    body: [
      "The information provided by LegalEase is for general informational, educational, self-help, operational, and document-preparation purposes only.",
      "Information on the LegalEase website may not apply to your specific situation. Laws, court rules, agency rules, procedures, forms, deadlines, fees, and local practices vary by jurisdiction and may change without notice.",
      "LegalEase does not guarantee that website content is complete, current, accurate, or suitable for your matter."
    ]
  },
  {
    id: "not-legal-advice",
    title: "Not Legal Advice",
    body: [
      "LegalEase does not provide legal advice through the website or Services unless expressly stated in a separate written agreement with a licensed attorney or law firm.",
      "Nothing on the website should be treated as legal advice, legal opinion, legal strategy, attorney judgment, or a recommendation about what you should do in your specific situation.",
      "You should consult a licensed attorney if you need legal advice, representation, strategy, deadline review, document review, court appearance, or an evaluation of your specific facts."
    ]
  },
  {
    id: "no-attorney-client-relationship",
    title: "No Attorney-Client Relationship",
    body: [
      "Using the LegalEase website, reading content, submitting forms, answering intake questions, using AI-assisted features, downloading documents, purchasing a product, contacting support, or communicating with LegalEase does not create an attorney-client relationship.",
      "An attorney-client relationship exists only if you separately enter into a written engagement agreement with a licensed attorney or law firm.",
      "Information you submit to LegalEase is handled under our Privacy Policy, but it is not automatically protected by attorney-client privilege unless a separate attorney-client relationship applies."
    ]
  },
  {
    id: "legalease-is-not-a-government-agency",
    title: "LegalEase Is Not a Government Agency",
    body: ["LegalEase is not a court, government agency, clerk's office, law enforcement agency, prosecutor's office, public defender's office, legal aid organization, or official government website unless expressly stated in writing for a specific program.", "LegalEase cannot grant, deny, approve, reject, seal, expunge, dismiss, file, adjudicate, or decide any legal matter."]
  },
  {
    id: "no-guaranteed-outcome",
    title: "No Guaranteed Outcome",
    body: ["LegalEase does not guarantee any legal outcome, filing outcome, court outcome, agency outcome, application outcome, approval, eligibility result, record clearing, claim result, settlement, refund, benefit, or other result."]
  },
  {
    id: "self-help-and-user-responsibility",
    title: "Self-Help and User Responsibility",
    body: ["Unless a separate written agreement expressly says otherwise, LegalEase provides self-help tools and document-preparation support. You are responsible for reviewing information, deciding whether and how to use it, complying with deadlines, and seeking legal advice when needed."]
  },
  {
    id: "ai-assisted-tools",
    title: "AI-Assisted Tools",
    body: ["LegalEase may offer AI-assisted tools, including assistants, guides, summarizers, intake helpers, document helpers, and support tools. AI-assisted tools are not lawyers, do not provide legal advice, do not create an attorney-client relationship, and do not guarantee outcomes."]
  },
  {
    id: "attorney-built-or-attorney-reviewed-language",
    title: "Attorney-Built or Attorney-Reviewed Language",
    body: ["References to attorney-built, attorney-reviewed, lawyer-built, legal-reviewed, or similar language mean that certain templates, workflows, educational materials, document logic, or product features may have been developed or reviewed by legal professionals. Those references do not mean that an attorney has reviewed your individual facts, represents you, has formed an attorney-client relationship with you, or guarantees that your filing, application, document, or request will be accepted or granted."]
  },
  {
    id: "product-specific-disclaimers",
    title: "Product-Specific Disclaimers",
    body: ["Some LegalEase products, partner programs, or workflows may include additional disclaimers, terms, privacy notices, eligibility rules, service descriptions, or order forms. If a product-specific disclaimer conflicts with this Website Disclaimer, the product-specific disclaimer controls for that product."]
  },
  {
    id: "third-party-links-and-referrals",
    title: "Third-Party Links and Referrals",
    body: ["The LegalEase website may link to third-party websites, courts, agencies, clerks, legal aid organizations, attorneys, law firms, nonprofits, payment processors, social media platforms, or other resources. LegalEase is not responsible for third-party content, accuracy, policies, security, availability, fees, services, acts, or omissions. A link or referral does not mean LegalEase endorses, controls, guarantees, or is responsible for the third party."]
  },
  {
    id: "testimonials-and-examples",
    title: "Testimonials and Examples",
    body: ["Testimonials, case studies, examples, reviews, quotes, stories, or illustrations on the LegalEase website describe individual experiences or hypothetical scenarios. They do not guarantee that you will have the same experience or outcome."]
  },
  {
    id: "no-consumer-reporting-use",
    title: "No Consumer Reporting Use",
    body: ["LegalEase is not a consumer reporting agency. The Services may not be used to determine another person's eligibility for credit, employment, housing, insurance, benefits, licensing, criminal justice decisions, or any other purpose regulated by the Fair Credit Reporting Act or similar laws."]
  },
  {
    id: "no-emergency-or-deadline-service",
    title: "No Emergency or Deadline Service",
    body: ["The LegalEase website is not an emergency service. Do not rely on the website for urgent legal deadlines, court appearances, hearing dates, warrants, protective orders, eviction deadlines, custody emergencies, immigration deadlines, benefit cutoffs, or other urgent matters."]
  },
  {
    id: "changes-and-availability",
    title: "Changes and Availability",
    body: ["LegalEase may update, modify, suspend, or remove website content, product features, forms, workflows, prices, availability, or Services at any time."]
  },
  {
    id: "contact",
    title: "Contact",
    body: ["Questions about this Disclaimer should be sent to LegalEase Incorporated, 907 Peace Street, Canton, MS 39046, or info@legalease.law."]
  }
];
