// Genuine synthetic held tuples captured before the record-origin gate. No participant data.
const predecessors = {
  "base": "bec90a7fb8128360a05da9a26de69da2154a1fa2",
  "scope": "Actual evaluator and protected draft seed, synthetic pure-function record, not authenticated acceptance",
  "rows": [
    {
      "route": "AR:situation-a-non-convictions",
      "record": {
        "status": "unverified",
        "reason": "synthetic-ar-origin-predecessor",
        "revision": 0,
        "draftHash": "c76a62c9d56a5e133c9e29585b87cf1f803a91edce5754b70e4b219d51300ad6",
        "draftSnapshot": {
          "capturedAt": "2026-10-13T22:30:00Z",
          "deferralComponentIds": [],
          "dependencies": {
            "commercialFlowVersion": 1
          },
          "jurisdiction": "AR",
          "packetAnswers": {
            "county_or_filing_location": {
              "unknown": false,
              "value": "Pulaski"
            },
            "court": "Synthetic Pulaski Circuit Court",
            "residency_or_location": {
              "unknown": false,
              "value": "Memphis"
            }
          },
          "packetFamilyIdentifiers": {
            "mode": "official_form_overlay_or_source_form_set",
            "sourceFormIds": [
              "AR:LegalEase Arkanasa/7_Nolle_Prosequi_Dismissed_Acquittal_Petition_2020_F.pdf:09f323174881934239734e3a418eb4fec0b4bd0f7e199e8698c3af95a659fa61"
            ]
          },
          "packetPlan": {
            "formMappingStatus": "source_candidate_identified",
            "mode": "official_form_overlay_or_source_form_set",
            "packetReadyWhen": [
              "backend result is packet_ready or packet_ready_with_caution",
              "every source-defined pathway fact is answered",
              "all waiting and completion conditions are satisfied",
              "no exclusion, ambiguity, or required-review flag remains",
              "the selected form revision and filing location pass source-freshness checks"
            ],
            "pathwayId": "situation-a-non-convictions",
            "requiredInputIds": [
              "case_outcome",
              "charge",
              "contact_information",
              "court",
              "disposition_date",
              "financial_obligations",
              "jurisdiction",
              "offense_category",
              "offense_level",
              "participant_full_legal_name",
              "pathway_id",
              "pending_cases",
              "record_type",
              "residency_or_location",
              "sentence_completion_date"
            ],
            "sourceFormIds": [
              "AR:LegalEase Arkanasa/7_Nolle_Prosequi_Dismissed_Acquittal_Petition_2020_F.pdf:09f323174881934239734e3a418eb4fec0b4bd0f7e199e8698c3af95a659fa61"
            ],
            "sourceRuleRefs": [
              "pathways:73-106"
            ]
          },
          "packetType": "guidance_packet",
          "pathwayId": "situation-a-non-convictions",
          "paymentAllowed": false,
          "prefilledAnswers": {
            "case_outcome": "Arrest or citation with no charge filed",
            "financial_obligations": "Yes",
            "offense_level": "Misdemeanor",
            "pending_cases": "No",
            "sentence_completion_date": "Yes"
          },
          "profileAuthorityFingerprint": "0e51e82568fd085cfae246727ad607f43bba3c38922692c3b3818deb00b43884",
          "profileSourceFingerprint": "e4ce784e6114679c7512ff009c9cc8cb4da2e4d2f82f6b62373a59515b047e95",
          "profileVersion": "2026-06-19-source-conversion-1",
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "financial_obligations",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "participant_full_legal_name",
            "pathway_id",
            "pending_cases",
            "record_type",
            "residency_or_location",
            "sentence_completion_date"
          ],
          "resultCode": "not_covered_yet",
          "schemaVersion": "expungement-ai/protected-packet-draft/v1",
          "screeningAnswers": {
            "court_requirements_completed": "yes",
            "jurisdiction_scope": "State or local",
            "new_convictions_during_waiting_period": "No",
            "ownership_scope": "Yes",
            "possible_pathway_context": "Situation A \u2014 Non-convictions (\u00a7\u00a7 16-90-1409, 1410)",
            "record_documents": "Yes",
            "resolved_timing_bucket": "gt_10_years",
            "special_preconditions_confirmed": "Yes",
            "state_exclusion_categories": [
              "None of these"
            ]
          },
          "selectedTrackId": null,
          "serverFacts": {
            "jurisdiction": "AR",
            "pathway_id": "situation-a-non-convictions"
          },
          "treatmentClassification": null
        }
      }
    },
    {
      "route": "AR:situation-b-misdemeanor-convictions",
      "record": {
        "status": "unverified",
        "reason": "synthetic-ar-origin-predecessor",
        "revision": 0,
        "draftHash": "99c7be5435e1d7f77e10f07b1d282b6abfe6c44294acbd7288f81866daaa299e",
        "draftSnapshot": {
          "capturedAt": "2026-10-13T22:30:00Z",
          "deferralComponentIds": [],
          "dependencies": {
            "commercialFlowVersion": 1
          },
          "jurisdiction": "AR",
          "packetAnswers": {
            "county_or_filing_location": {
              "unknown": false,
              "value": "Pulaski"
            },
            "court": "Synthetic Pulaski Circuit Court",
            "residency_or_location": {
              "unknown": false,
              "value": "Memphis"
            }
          },
          "packetFamilyIdentifiers": {
            "mode": null,
            "sourceFormIds": []
          },
          "packetPlan": null,
          "packetType": "guidance_packet",
          "pathwayId": "situation-b-misdemeanor-convictions",
          "paymentAllowed": false,
          "prefilledAnswers": {
            "case_outcome": "Arrest or citation with no charge filed",
            "financial_obligations": "Yes",
            "offense_level": "Misdemeanor",
            "pending_cases": "No",
            "sentence_completion_date": "Yes"
          },
          "profileAuthorityFingerprint": "91b0712fb46208f56fe89514b00a65924cc29349c1bf25db9ce345cf6d304c9c",
          "profileSourceFingerprint": "e4ce784e6114679c7512ff009c9cc8cb4da2e4d2f82f6b62373a59515b047e95",
          "profileVersion": "2026-06-19-source-conversion-1",
          "requiredInputIds": [],
          "resultCode": "guidance_only",
          "schemaVersion": "expungement-ai/protected-packet-draft/v1",
          "screeningAnswers": {
            "court_requirements_completed": "yes",
            "jurisdiction_scope": "State or local",
            "new_convictions_during_waiting_period": "No",
            "ownership_scope": "Yes",
            "possible_pathway_context": "Situation B \u2014 Misdemeanor convictions (\u00a7 16-90-1405)",
            "record_documents": "Yes",
            "resolved_timing_bucket": "gt_10_years",
            "special_preconditions_confirmed": "Yes",
            "state_exclusion_categories": [
              "None of these"
            ]
          },
          "selectedTrackId": null,
          "serverFacts": {
            "jurisdiction": "AR",
            "pathway_id": "situation-b-misdemeanor-convictions"
          },
          "treatmentClassification": "exact_supported_deferral"
        }
      }
    },
    {
      "route": "AR:situation-c-felony-convictions",
      "record": {
        "status": "unverified",
        "reason": "synthetic-ar-origin-predecessor",
        "revision": 0,
        "draftHash": "fb56fc39335b6ea2ea7d6a1472333296a24d935749d3ee1127e40256fdea1395",
        "draftSnapshot": {
          "capturedAt": "2026-10-13T22:30:00Z",
          "deferralComponentIds": [],
          "dependencies": {
            "commercialFlowVersion": 1
          },
          "jurisdiction": "AR",
          "packetAnswers": {
            "county_or_filing_location": {
              "unknown": false,
              "value": "Pulaski"
            },
            "court": "Synthetic Pulaski Circuit Court",
            "residency_or_location": {
              "unknown": false,
              "value": "Memphis"
            }
          },
          "packetFamilyIdentifiers": {
            "mode": "official_form_overlay_or_source_form_set",
            "sourceFormIds": [
              "AR:LegalEase Arkanasa/Felony-Petition-Form-f.pdf:6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b"
            ]
          },
          "packetPlan": {
            "formMappingStatus": "source_candidate_identified",
            "mode": "official_form_overlay_or_source_form_set",
            "packetReadyWhen": [
              "backend result is packet_ready or packet_ready_with_caution",
              "every source-defined pathway fact is answered",
              "all waiting and completion conditions are satisfied",
              "no exclusion, ambiguity, or required-review flag remains",
              "the selected form revision and filing location pass source-freshness checks"
            ],
            "pathwayId": "situation-c-felony-convictions",
            "requiredInputIds": [
              "case_outcome",
              "charge",
              "contact_information",
              "court",
              "disposition_date",
              "financial_obligations",
              "jurisdiction",
              "offense_category",
              "offense_level",
              "participant_full_legal_name",
              "pathway_id",
              "pending_cases",
              "record_type",
              "residency_or_location",
              "sentence_completion_date"
            ],
            "sourceFormIds": [
              "AR:LegalEase Arkanasa/Felony-Petition-Form-f.pdf:6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b"
            ],
            "sourceRuleRefs": [
              "pathways:73-106"
            ]
          },
          "packetType": "official_pdf_overlay",
          "pathwayId": "situation-c-felony-convictions",
          "paymentAllowed": false,
          "prefilledAnswers": {
            "case_outcome": "Arrest or citation with no charge filed",
            "financial_obligations": "Yes",
            "offense_level": "Misdemeanor",
            "pending_cases": "No",
            "sentence_completion_date": "Yes"
          },
          "profileAuthorityFingerprint": "f349f7a9bebb29a5745420e88bd805303f903b015d98aaf67d013f29e8c344ba",
          "profileSourceFingerprint": "e4ce784e6114679c7512ff009c9cc8cb4da2e4d2f82f6b62373a59515b047e95",
          "profileVersion": "2026-06-19-source-conversion-1",
          "requiredInputIds": [
            "case_outcome",
            "charge",
            "contact_information",
            "court",
            "disposition_date",
            "financial_obligations",
            "jurisdiction",
            "offense_category",
            "offense_level",
            "participant_full_legal_name",
            "pathway_id",
            "pending_cases",
            "record_type",
            "residency_or_location",
            "sentence_completion_date"
          ],
          "resultCode": "needs_review",
          "schemaVersion": "expungement-ai/protected-packet-draft/v1",
          "screeningAnswers": {
            "court_requirements_completed": "yes",
            "jurisdiction_scope": "State or local",
            "new_convictions_during_waiting_period": "No",
            "ownership_scope": "Yes",
            "possible_pathway_context": "Situation C \u2014 Felony convictions (\u00a7\u00a7 16-90-1406, 1407)",
            "record_documents": "Yes",
            "resolved_timing_bucket": "gt_10_years",
            "special_preconditions_confirmed": "Yes",
            "state_exclusion_categories": [
              "None of these"
            ]
          },
          "selectedTrackId": null,
          "serverFacts": {
            "jurisdiction": "AR",
            "pathway_id": "situation-c-felony-convictions"
          },
          "treatmentClassification": null
        }
      }
    }
  ]
};

export default predecessors;
