// Captured from c2246711d before item12(c); synthetic facts, never owner authority.
const fixtures = {
  "base": "c2246711d82982cc41304c07be54a7d4b5583ce6",
  "evaluatorSha256": "fa9c65d573161f0acad08515fcede30fd8c83963d703dd5f2c3cb5e1dcb7ba94",
  "rows": [
    {
      "route": "regime-1-expungement-available-now",
      "answers": {
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "court_requirements_completed": "yes",
        "financial_obligations": "Yes",
        "identity_error": "Yes",
        "jurisdiction_scope": "State or local",
        "new_convictions_during_waiting_period": "No",
        "offense_level": "Misdemeanor",
        "ownership_scope": "Yes",
        "pardon_status": "No",
        "pending_cases": "No",
        "possible_pathway_context": "Regime 1 — Expungement (§ 19.2-392.2), available now",
        "record_documents": "Yes",
        "resolved_timing_bucket": "gt_10_years",
        "sentence_completion_date": "Yes",
        "special_preconditions_confirmed": "Yes",
        "state_exclusion_categories": [
          "None of these"
        ],
        "trafficking_status": "No"
      },
      "record": {
        "status": "unverified",
        "reason": "synthetic-parent-va-origin",
        "revision": 0,
        "draftHash": "1fa7ace9ab1b2a912a719f457ac3cde30ce68c23ff2ab8e3c84b85d1669a4520",
        "draftSnapshot": {
          "capturedAt": "2026-10-19T00:00:00Z",
          "deferralComponentIds": [],
          "dependencies": {
            "commercialFlowVersion": 1
          },
          "jurisdiction": "VA",
          "packetAnswers": {
            "county_or_filing_location": {
              "unknown": false,
              "value": "Richmond"
            },
            "court": "Synthetic Virginia Circuit Court",
            "residency_or_location": {
              "unknown": false,
              "value": "Richmond, Virginia"
            }
          },
          "packetFamilyIdentifiers": {
            "mode": "state_specific_custom_packet_from_source_rules",
            "sourceFormIds": []
          },
          "packetPlan": {
            "formMappingStatus": "custom_or_manual_mapping_required",
            "mode": "state_specific_custom_packet_from_source_rules",
            "packetReadyWhen": [
              "backend result is packet_ready or packet_ready_with_caution",
              "every source-defined pathway fact is answered",
              "all waiting and completion conditions are satisfied",
              "no exclusion, ambiguity, or required-review flag remains",
              "the selected form revision and filing location pass source-freshness checks"
            ],
            "pathwayId": "regime-1-expungement-available-now",
            "requiredInputIds": [
              "case_outcome",
              "charge",
              "contact_information",
              "court",
              "disposition_date",
              "identity_error",
              "jurisdiction",
              "offense_category",
              "offense_level",
              "pardon_status",
              "participant_full_legal_name",
              "pathway_id",
              "record_type",
              "residency_or_location",
              "trafficking_status"
            ],
            "sourceFormIds": [],
            "sourceRuleRefs": [
              "pathways:73-114"
            ]
          },
          "packetType": "custom_pleading",
          "pathwayId": "regime-1-expungement-available-now",
          "paymentAllowed": true,
          "prefilledAnswers": {
            "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
            "identity_error": "Yes",
            "offense_level": "Misdemeanor",
            "pardon_status": "No"
          },
          "profileAuthorityFingerprint": "d32bd697314374131d568ea8ddd35cafd01e1d431127589db4d325e3e0cdf60a",
          "profileSourceFingerprint": "4cce42f8cc75df591b733566250beeaad7bce3b7e54b6d1a6d5f0c917e515647",
          "profileVersion": "2026-06-19-source-conversion-1",
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "identity_error",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "pardon_status",
            "participant_full_legal_name",
            "pathway_id",
            "record_type",
            "residency_or_location",
            "trafficking_status"
          ],
          "resultCode": "packet_ready_with_caution",
          "schemaVersion": "expungement-ai/protected-packet-draft/v1",
          "screeningAnswers": {
            "court_requirements_completed": "yes",
            "financial_obligations": "Yes",
            "jurisdiction_scope": "State or local",
            "new_convictions_during_waiting_period": "No",
            "ownership_scope": "Yes",
            "pending_cases": "No",
            "possible_pathway_context": "Regime 1 — Expungement (§ 19.2-392.2), available now",
            "record_documents": "Yes",
            "resolved_timing_bucket": "gt_10_years",
            "sentence_completion_date": "Yes",
            "special_preconditions_confirmed": "Yes",
            "state_exclusion_categories": [
              "None of these"
            ],
            "trafficking_status": "No"
          },
          "selectedTrackId": null,
          "serverFacts": {
            "jurisdiction": "VA",
            "pathway_id": "regime-1-expungement-available-now"
          },
          "treatmentClassification": null
        },
        "hash": null,
        "snapshot": null
      },
      "evaluation": {
        "jurisdiction": "VA",
        "profileVersion": "2026-06-19-source-conversion-1",
        "matterId": "synthetic-va-origin",
        "resultCode": "packet_ready_with_caution",
        "userLabel": "A source-defined packet pathway may be available with cautions.",
        "reasons": [
          {
            "code": "va.compiled_rule_match.rule-01-regime-1-expungement-19-2-392-2-available-now",
            "text": "Compiled source rule rule-01-regime-1-expungement-19-2-392-2-available-now matches Regime 1 — Expungement (§ 19.2-392.2), available now.",
            "sourceRef": "pathways:73-114"
          }
        ],
        "missingQuestionIds": [],
        "cautions": [],
        "nextSteps": [
          "Your packet has been started. A few details may still be needed before it is ready to file.",
          "Review the cautions and complete the required packet facts in Briefcase before verification or payment.",
          "Before filing, follow the filing instructions and complete any required documents, fees or fingerprint steps."
        ],
        "paymentAllowed": true,
        "pathwayId": "regime-1-expungement-available-now",
        "packetPlan": {
          "pathwayId": "regime-1-expungement-available-now",
          "mode": "state_specific_custom_packet_from_source_rules",
          "formMappingStatus": "custom_or_manual_mapping_required",
          "sourceFormIds": [],
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "identity_error",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "pardon_status",
            "participant_full_legal_name",
            "pathway_id",
            "record_type",
            "residency_or_location",
            "trafficking_status"
          ],
          "sourceRuleRefs": [
            "pathways:73-114"
          ],
          "packetReadyWhen": [
            "backend result is packet_ready or packet_ready_with_caution",
            "every source-defined pathway fact is answered",
            "all waiting and completion conditions are satisfied",
            "no exclusion, ambiguity, or required-review flag remains",
            "the selected form revision and filing location pass source-freshness checks"
          ]
        },
        "pathwayLabel": "Regime 1 — Expungement (§ 19.2-392.2), available now"
      }
    },
    {
      "route": "automatic-sealing-no-filing",
      "answers": {
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "court_requirements_completed": "yes",
        "financial_obligations": "Yes",
        "identity_error": "Yes",
        "jurisdiction_scope": "State or local",
        "new_convictions_during_waiting_period": "No",
        "offense_level": "Misdemeanor",
        "ownership_scope": "Yes",
        "pardon_status": "No",
        "pending_cases": "No",
        "possible_pathway_context": "Automatic sealing (§ 19.2-392.7) — no filing",
        "record_documents": "Yes",
        "resolved_timing_bucket": "gt_10_years",
        "sentence_completion_date": "Yes",
        "special_preconditions_confirmed": "Yes",
        "state_exclusion_categories": [
          "None of these"
        ],
        "trafficking_status": "No"
      },
      "record": {
        "status": "unverified",
        "reason": "synthetic-parent-va-origin",
        "revision": 0,
        "draftHash": "59598495ca5c3bdc6d514a886664ca327166d9e93b302d768bdc4ff0f2ead7fa",
        "draftSnapshot": {
          "capturedAt": "2026-10-19T00:00:00Z",
          "deferralComponentIds": [],
          "dependencies": {
            "commercialFlowVersion": 1
          },
          "jurisdiction": "VA",
          "packetAnswers": {
            "county_or_filing_location": {
              "unknown": false,
              "value": "Richmond"
            },
            "court": "Synthetic Virginia Circuit Court",
            "residency_or_location": {
              "unknown": false,
              "value": "Richmond, Virginia"
            }
          },
          "packetFamilyIdentifiers": {
            "mode": "automatic_relief_verification_and_guidance",
            "sourceFormIds": []
          },
          "packetPlan": {
            "formMappingStatus": "not_required",
            "mode": "automatic_relief_verification_and_guidance",
            "packetReadyWhen": [
              "backend result is packet_ready or packet_ready_with_caution",
              "every source-defined pathway fact is answered",
              "all waiting and completion conditions are satisfied",
              "no exclusion, ambiguity, or required-review flag remains",
              "the selected form revision and filing location pass source-freshness checks"
            ],
            "pathwayId": "automatic-sealing-no-filing",
            "requiredInputIds": [
              "case_outcome",
              "charge",
              "contact_information",
              "court",
              "disposition_date",
              "identity_error",
              "jurisdiction",
              "offense_category",
              "offense_level",
              "pardon_status",
              "participant_full_legal_name",
              "pathway_id",
              "record_type",
              "residency_or_location",
              "trafficking_status"
            ],
            "sourceFormIds": [],
            "sourceRuleRefs": [
              "pathways:73-114"
            ]
          },
          "packetType": "guidance_packet",
          "pathwayId": "automatic-sealing-no-filing",
          "paymentAllowed": false,
          "prefilledAnswers": {
            "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
            "identity_error": "Yes",
            "offense_level": "Misdemeanor",
            "pardon_status": "No"
          },
          "profileAuthorityFingerprint": "f943659d136a97e63d6c9959b74219154379afa3b80a2f8cda5aa4962a71544a",
          "profileSourceFingerprint": "4cce42f8cc75df591b733566250beeaad7bce3b7e54b6d1a6d5f0c917e515647",
          "profileVersion": "2026-06-19-source-conversion-1",
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "identity_error",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "pardon_status",
            "participant_full_legal_name",
            "pathway_id",
            "record_type",
            "residency_or_location",
            "trafficking_status"
          ],
          "resultCode": "guidance_only",
          "schemaVersion": "expungement-ai/protected-packet-draft/v1",
          "screeningAnswers": {
            "court_requirements_completed": "yes",
            "financial_obligations": "Yes",
            "jurisdiction_scope": "State or local",
            "new_convictions_during_waiting_period": "No",
            "ownership_scope": "Yes",
            "pending_cases": "No",
            "possible_pathway_context": "Automatic sealing (§ 19.2-392.7) — no filing",
            "record_documents": "Yes",
            "resolved_timing_bucket": "gt_10_years",
            "sentence_completion_date": "Yes",
            "special_preconditions_confirmed": "Yes",
            "state_exclusion_categories": [
              "None of these"
            ],
            "trafficking_status": "No"
          },
          "selectedTrackId": null,
          "serverFacts": {
            "jurisdiction": "VA",
            "pathway_id": "automatic-sealing-no-filing"
          },
          "treatmentClassification": null
        },
        "hash": null,
        "snapshot": null
      },
      "evaluation": {
        "jurisdiction": "VA",
        "profileVersion": "2026-06-19-source-conversion-1",
        "matterId": "synthetic-va-origin",
        "resultCode": "guidance_only",
        "userLabel": "This route is guidance-only or automatic relief verification.",
        "reasons": [
          {
            "code": "va.guidance_only_no_user_filed_court_petition",
            "text": "This route is guidance-only because it is automatic, board/portal-based, prosecutor/agency-only, or otherwise not a user-filed court petition/motion/pleading.",
            "sourceRef": "pathways:73-114"
          }
        ],
        "missingQuestionIds": [],
        "cautions": [],
        "nextSteps": [
          "Review the state-specific guidance.",
          "Verify the record status with the listed source.",
          "Do not pay for a filing packet for this route."
        ],
        "paymentAllowed": false,
        "pathwayId": "automatic-sealing-no-filing",
        "packetPlan": {
          "pathwayId": "automatic-sealing-no-filing",
          "mode": "automatic_relief_verification_and_guidance",
          "formMappingStatus": "not_required",
          "sourceFormIds": [],
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "identity_error",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "pardon_status",
            "participant_full_legal_name",
            "pathway_id",
            "record_type",
            "residency_or_location",
            "trafficking_status"
          ],
          "sourceRuleRefs": [
            "pathways:73-114"
          ],
          "packetReadyWhen": [
            "backend result is packet_ready or packet_ready_with_caution",
            "every source-defined pathway fact is answered",
            "all waiting and completion conditions are satisfied",
            "no exclusion, ambiguity, or required-review flag remains",
            "the selected form revision and filing location pass source-freshness checks"
          ]
        },
        "pathwayLabel": "Automatic sealing (§ 19.2-392.7) — no filing"
      }
    },
    {
      "route": "petition-based-sealing",
      "answers": {
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "court_requirements_completed": "yes",
        "financial_obligations": "Yes",
        "identity_error": "Yes",
        "jurisdiction_scope": "State or local",
        "new_convictions_during_waiting_period": "No",
        "offense_level": "Misdemeanor",
        "ownership_scope": "Yes",
        "pardon_status": "No",
        "pending_cases": "No",
        "possible_pathway_context": "Petition-based sealing (§ 19.2-392.12 / .12:1)",
        "record_documents": "Yes",
        "resolved_timing_bucket": "gt_10_years",
        "sentence_completion_date": "Yes",
        "special_preconditions_confirmed": "Yes",
        "state_exclusion_categories": [
          "None of these"
        ],
        "trafficking_status": "No"
      },
      "record": {
        "status": "unverified",
        "reason": "synthetic-parent-va-origin",
        "revision": 0,
        "draftHash": "938cf014a770870993cf99e07351f69e3e3f2d99d25dcb340d5af888da6fddab",
        "draftSnapshot": {
          "capturedAt": "2026-10-19T00:00:00Z",
          "deferralComponentIds": [],
          "dependencies": {
            "commercialFlowVersion": 1
          },
          "jurisdiction": "VA",
          "packetAnswers": {
            "county_or_filing_location": {
              "unknown": false,
              "value": "Richmond"
            },
            "court": "Synthetic Virginia Circuit Court",
            "residency_or_location": {
              "unknown": false,
              "value": "Richmond, Virginia"
            }
          },
          "packetFamilyIdentifiers": {
            "mode": "state_specific_custom_packet_from_source_rules",
            "sourceFormIds": []
          },
          "packetPlan": {
            "formMappingStatus": "custom_or_manual_mapping_required",
            "mode": "state_specific_custom_packet_from_source_rules",
            "packetReadyWhen": [
              "backend result is packet_ready or packet_ready_with_caution",
              "every source-defined pathway fact is answered",
              "all waiting and completion conditions are satisfied",
              "no exclusion, ambiguity, or required-review flag remains",
              "the selected form revision and filing location pass source-freshness checks"
            ],
            "pathwayId": "petition-based-sealing",
            "requiredInputIds": [
              "case_outcome",
              "charge",
              "contact_information",
              "court",
              "disposition_date",
              "identity_error",
              "jurisdiction",
              "offense_category",
              "offense_level",
              "pardon_status",
              "participant_full_legal_name",
              "pathway_id",
              "record_type",
              "residency_or_location",
              "trafficking_status"
            ],
            "sourceFormIds": [],
            "sourceRuleRefs": [
              "pathways:73-114"
            ]
          },
          "packetType": "custom_pleading",
          "pathwayId": "petition-based-sealing",
          "paymentAllowed": true,
          "prefilledAnswers": {
            "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
            "identity_error": "Yes",
            "offense_level": "Misdemeanor",
            "pardon_status": "No"
          },
          "profileAuthorityFingerprint": "e94eb6a99011fdcddd0ae70285919924be2677dc7e289b073877519a3c9637af",
          "profileSourceFingerprint": "4cce42f8cc75df591b733566250beeaad7bce3b7e54b6d1a6d5f0c917e515647",
          "profileVersion": "2026-06-19-source-conversion-1",
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "identity_error",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "pardon_status",
            "participant_full_legal_name",
            "pathway_id",
            "record_type",
            "residency_or_location",
            "trafficking_status"
          ],
          "resultCode": "packet_ready_with_caution",
          "schemaVersion": "expungement-ai/protected-packet-draft/v1",
          "screeningAnswers": {
            "court_requirements_completed": "yes",
            "financial_obligations": "Yes",
            "jurisdiction_scope": "State or local",
            "new_convictions_during_waiting_period": "No",
            "ownership_scope": "Yes",
            "pending_cases": "No",
            "possible_pathway_context": "Petition-based sealing (§ 19.2-392.12 / .12:1)",
            "record_documents": "Yes",
            "resolved_timing_bucket": "gt_10_years",
            "sentence_completion_date": "Yes",
            "special_preconditions_confirmed": "Yes",
            "state_exclusion_categories": [
              "None of these"
            ],
            "trafficking_status": "No"
          },
          "selectedTrackId": null,
          "serverFacts": {
            "jurisdiction": "VA",
            "pathway_id": "petition-based-sealing"
          },
          "treatmentClassification": null
        },
        "hash": null,
        "snapshot": null
      },
      "evaluation": {
        "jurisdiction": "VA",
        "profileVersion": "2026-06-19-source-conversion-1",
        "matterId": "synthetic-va-origin",
        "resultCode": "packet_ready_with_caution",
        "userLabel": "A source-defined packet pathway may be available with cautions.",
        "reasons": [
          {
            "code": "va.compiled_rule_match.rule-13-petition-based-sealing-19-2-392-12-12-1",
            "text": "Compiled source rule rule-13-petition-based-sealing-19-2-392-12-12-1 matches Petition-based sealing (§ 19.2-392.12 / .12:1).",
            "sourceRef": "pathways:73-114"
          }
        ],
        "missingQuestionIds": [],
        "cautions": [],
        "nextSteps": [
          "Your packet has been started. A few details may still be needed before it is ready to file.",
          "Review the cautions and complete the required packet facts in Briefcase before verification or payment.",
          "Before filing, follow the filing instructions and complete any required documents, fees or fingerprint steps."
        ],
        "paymentAllowed": true,
        "pathwayId": "petition-based-sealing",
        "packetPlan": {
          "pathwayId": "petition-based-sealing",
          "mode": "state_specific_custom_packet_from_source_rules",
          "formMappingStatus": "custom_or_manual_mapping_required",
          "sourceFormIds": [],
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "identity_error",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "pardon_status",
            "participant_full_legal_name",
            "pathway_id",
            "record_type",
            "residency_or_location",
            "trafficking_status"
          ],
          "sourceRuleRefs": [
            "pathways:73-114"
          ],
          "packetReadyWhen": [
            "backend result is packet_ready or packet_ready_with_caution",
            "every source-defined pathway fact is answered",
            "all waiting and completion conditions are satisfied",
            "no exclusion, ambiguity, or required-review flag remains",
            "the selected form revision and filing location pass source-freshness checks"
          ]
        },
        "pathwayLabel": "Petition-based sealing (§ 19.2-392.12 / .12:1)"
      }
    }
  ]
};
export default fixtures;
