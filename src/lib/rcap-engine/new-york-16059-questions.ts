import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const NY_16059_QUESTIONS: PublicQuestion[] = [
{
  "id": "ny_16059_16058_treatment_count",
  "stage": "timing_and_completion",
  "prompt": "How many treatment-related convictions did the entered CPL 160.58 order seal?",
  "helperText": "Use the actual records. If the facts are unclear, choose I am not sure. These answers do not replace legal review.",
  "type": "number_or_range",
  "required": false,
  "contextOnly": false,
  "doesNotSelectPathway": true,
  "options": null,
  "lifecyclePhase": "prepay_timing_gate",
  "translations": {
    "es": {
      "prompt": "¿Cuántas condenas relacionadas con el tratamiento selló la orden concedida bajo CPL 160.58?",
      "helperText": "Use los registros reales. Si los hechos no están claros, elija No estoy seguro. Estas respuestas no reemplazan la revisión legal."
    }
  }
},
{
  "id": "ny_16059_16058_additional_count",
  "stage": "timing_and_completion",
  "prompt": "How many additional earlier eligible misdemeanors did that order seal, apart from the treatment convictions?",
  "helperText": "Use the actual records. If the facts are unclear, choose I am not sure. These answers do not replace legal review.",
  "type": "number_or_range",
  "required": false,
  "contextOnly": false,
  "doesNotSelectPathway": true,
  "options": null,
  "lifecyclePhase": "prepay_timing_gate",
  "translations": {
    "es": {
      "prompt": "¿Cuántos delitos menores elegibles anteriores adicionales selló esa orden, aparte de las condenas del tratamiento?",
      "helperText": "Use los registros reales. Si los hechos no están claros, elija No estoy seguro. Estas respuestas no reemplazan la revisión legal."
    }
  }
},
{
  "id": "ny_16059_transaction_time_circumstance",
  "stage": "timing_and_completion",
  "prompt": "Were the acts closely connected in both time and circumstances as one criminal incident?",
  "helperText": "Use the actual records. If the facts are unclear, choose I am not sure. These answers do not replace legal review.",
  "type": "yes_no_unsure",
  "required": false,
  "contextOnly": false,
  "doesNotSelectPathway": true,
  "options": null,
  "lifecyclePhase": "prepay_timing_gate",
  "translations": {
    "es": {
      "prompt": "¿Estuvieron los actos estrechamente relacionados en tiempo y circunstancias como un solo incidente delictivo?",
      "helperText": "Use los registros reales. Si los hechos no están claros, elija No estoy seguro. Estas respuestas no reemplazan la revisión legal."
    }
  }
},
{
  "id": "ny_16059_transaction_integral_purpose",
  "stage": "timing_and_completion",
  "prompt": "Were the acts integral parts of one criminal venture with a closely connected purpose or objective?",
  "helperText": "Use the actual records. If the facts are unclear, choose I am not sure. These answers do not replace legal review.",
  "type": "yes_no_unsure",
  "required": false,
  "contextOnly": false,
  "doesNotSelectPathway": true,
  "options": null,
  "lifecyclePhase": "prepay_timing_gate",
  "translations": {
    "es": {
      "prompt": "¿Fueron los actos partes integrales de una sola actividad delictiva con un propósito u objetivo estrechamente relacionado?",
      "helperText": "Use los registros reales. Si los hechos no están claros, elija No estoy seguro. Estas respuestas no reemplazan la revisión legal."
    }
  }
},
{
  "id": "ny_16059_transaction_shared_docket_only",
  "stage": "timing_and_completion",
  "prompt": "Is the only connection a shared case number, date, court or sentence, rather than the acts themselves?",
  "helperText": "Use the actual records. If the facts are unclear, choose I am not sure. These answers do not replace legal review.",
  "type": "yes_no_unsure",
  "required": false,
  "contextOnly": false,
  "doesNotSelectPathway": true,
  "options": null,
  "lifecyclePhase": "prepay_timing_gate",
  "translations": {
    "es": {
      "prompt": "¿Es la única conexión un número de caso, fecha, tribunal o sentencia compartidos, en lugar de los actos mismos?",
      "helperText": "Use los registros reales. Si los hechos no están claros, elija No estoy seguro. Estas respuestas no reemplazan la revisión legal."
    }
  }
},
{
  "id": "ny_16059_transaction_multiple_victims",
  "stage": "timing_and_completion",
  "prompt": "Did the acts cause death, injury, loss or other consequences to more than one victim?",
  "helperText": "Use the actual records. If the facts are unclear, choose I am not sure. These answers do not replace legal review.",
  "type": "yes_no_unsure",
  "required": false,
  "contextOnly": false,
  "doesNotSelectPathway": true,
  "options": null,
  "lifecyclePhase": "prepay_timing_gate",
  "translations": {
    "es": {
      "prompt": "¿Causaron los actos muerte, lesiones, pérdidas u otras consecuencias a más de una víctima?",
      "helperText": "Use los registros reales. Si los hechos no están claros, elija No estoy seguro. Estas respuestas no reemplazan la revisión legal."
    }
  }
},
  {
    "id": "ny_16059_request",
    "stage": "timing_and_completion",
    "prompt": "Which procedure do you want checked for this conviction?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": [
      "petition",
      "other",
      "unknown"
    ],
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Qué procedimiento quiere que se revise para esta condena?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    },
    "optionDisplay": {
      "petition": {
        "label": "Petition to seal under CPL 160.59",
        "translations": {
          "es": {
            "label": "Solicitud de sellado bajo CPL 160.59"
          }
        }
      },
      "other": {
        "label": "Another procedure",
        "translations": {
          "es": {
            "label": "Otro procedimiento"
          }
        }
      },
      "unknown": {
        "label": "I am not sure",
        "translations": {
          "es": {
            "label": "No estoy seguro"
          }
        }
      }
    }
  },
  {
    "id": "ny_16059_history_total",
    "stage": "timing_and_completion",
    "prompt": "How many criminal convictions remain on your complete record?",
    "helperText": "Use the complete record, including sealed convictions and crimes not included in this request. Count individual convictions, not cases. Do not count violations, acquittals or a conviction actually vacated or expunged. If its status is unclear, choose I am not sure.",
    "type": "number_or_range",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuántas condenas penales permanecen en todos sus antecedentes?",
        "helperText": "Use todos los antecedentes, incluidas las condenas selladas y los delitos fuera de esta solicitud. Cuente condenas individuales, no casos. No cuente infracciones, absoluciones ni condenas realmente anuladas o expurgadas. Si el estado no está claro, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_history_felonies",
    "stage": "timing_and_completion",
    "prompt": "How many convictions on your complete record are felonies?",
    "helperText": "Use the complete record, including sealed convictions and crimes not included in this request. Count individual convictions, not cases. Do not count violations, acquittals or a conviction actually vacated or expunged. If its status is unclear, choose I am not sure.",
    "type": "number_or_range",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuántas condenas de todos sus antecedentes son por delitos graves?",
        "helperText": "Use todos los antecedentes, incluidas las condenas selladas y los delitos fuera de esta solicitud. Cuente condenas individuales, no casos. No cuente infracciones, absoluciones ni condenas realmente anuladas o expurgadas. Si el estado no está claro, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_requested_total",
    "stage": "timing_and_completion",
    "prompt": "How many individual convictions do you want included in this sealing request?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "number_or_range",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuántas condenas individuales quiere incluir en esta solicitud de sellado?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_requested_felonies",
    "stage": "timing_and_completion",
    "prompt": "How many of the convictions in this request are felonies?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "number_or_range",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuántas condenas de esta solicitud son por delitos graves?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_grouping",
    "stage": "timing_and_completion",
    "prompt": "How are the acts underlying these convictions related?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": [
      "separate",
      "single_act",
      "connected",
      "other_groups",
      "unknown"
    ],
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cómo se relacionan los actos que dieron lugar a estas condenas?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    },
    "optionDisplay": {
      "separate": {
        "label": "Separate incidents (or only one conviction)",
        "translations": {
          "es": {
            "label": "Incidentes separados (o solo una condena)"
          }
        }
      },
      "single_act": {
        "label": "All requested convictions arose from one act; other convictions were separate",
        "translations": {
          "es": {
            "label": "Todas las condenas solicitadas surgieron de un solo acto; las demás fueron separadas"
          }
        }
      },
      "connected": {
        "label": "Connected acts in one incident or venture",
        "translations": {
          "es": {
            "label": "Actos relacionados en un incidente o actividad"
          }
        }
      },
      "other_groups": {
        "label": "Other convictions also involve related acts",
        "translations": {
          "es": {
            "label": "Otras condenas también incluyen actos relacionados"
          }
        }
      },
      "unknown": {
        "label": "I am not sure",
        "translations": {
          "es": {
            "label": "No estoy seguro"
          }
        }
      }
    }
  },
  {
    "id": "ny_16059_application_status",
    "stage": "timing_and_completion",
    "prompt": "What happened to any earlier CPL 160.59 applications?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": [
      "none",
      "denied",
      "pending",
      "granted",
      "mixed",
      "unknown"
    ],
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Qué ocurrió con las solicitudes anteriores bajo CPL 160.59?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    },
    "optionDisplay": {
      "none": {
        "label": "None filed",
        "translations": {
          "es": {
            "label": "No se presentó ninguna"
          }
        }
      },
      "denied": {
        "label": "Denied or withdrawn; none granted",
        "translations": {
          "es": {
            "label": "Denegadas o retiradas; ninguna concedida"
          }
        }
      },
      "pending": {
        "label": "Pending; none granted",
        "translations": {
          "es": {
            "label": "Pendientes; ninguna concedida"
          }
        }
      },
      "granted": {
        "label": "Granted",
        "translations": {
          "es": {
            "label": "Concedidas"
          }
        }
      },
      "mixed": {
        "label": "More than one status",
        "translations": {
          "es": {
            "label": "Más de un estado"
          }
        }
      },
      "unknown": {
        "label": "I am not sure",
        "translations": {
          "es": {
            "label": "No estoy seguro"
          }
        }
      }
    }
  },
  {
    "id": "ny_16059_granted_total",
    "stage": "timing_and_completion",
    "prompt": "How many convictions have already been sealed by a CPL 160.59 order?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "number_or_range",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuántas condenas ya se sellaron mediante una orden bajo CPL 160.59?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_granted_felonies",
    "stage": "timing_and_completion",
    "prompt": "How many convictions already sealed under CPL 160.59 are felonies?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "number_or_range",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuántas condenas ya selladas bajo CPL 160.59 son por delitos graves?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_16058_grants",
    "stage": "timing_and_completion",
    "prompt": "Do the records show a granted sealing order under CPL 160.58?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": [
      "none",
      "denied",
      "pending",
      "granted",
      "unknown"
    ],
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Los registros muestran una orden de sellado concedida bajo CPL 160.58?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    },
    "optionDisplay": {
      "denied": { "label": "Denied or withdrawn; no entered order", "translations": { "es": { "label": "Denegada o retirada; no hay orden concedida" } } },
      "pending": { "label": "Pending; no entered order", "translations": { "es": { "label": "Pendiente; no hay orden concedida" } } },
      "none": {
        "label": "No granted order (including denied or pending applications)",
        "translations": {
          "es": {
            "label": "No hay orden concedida (incluidas solicitudes denegadas o pendientes)"
          }
        }
      },
      "granted": {
        "label": "Granted order",
        "translations": {
          "es": {
            "label": "Orden concedida"
          }
        }
      },
      "unknown": {
        "label": "I am not sure",
        "translations": {
          "es": {
            "label": "No estoy seguro"
          }
        }
      }
    }
  },
  {
    "id": "ny_16059_sentence_incarceration",
    "stage": "timing_and_completion",
    "prompt": "Did the latest criminal sentence include incarceration, including incarceration with probation?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "yes_no_unsure",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿La sentencia penal más reciente incluyó encarcelamiento, incluso junto con libertad condicional?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_incarceration_history",
    "stage": "timing_and_completion",
    "prompt": "Since the earliest conviction in this request, what incarceration has occurred?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": [
      "none",
      "released",
      "current",
      "unknown"
    ],
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Qué encarcelamiento ha ocurrido desde la primera condena de esta solicitud?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    },
    "optionDisplay": {
      "none": {
        "label": "None",
        "translations": {
          "es": {
            "label": "Ninguno"
          }
        }
      },
      "released": {
        "label": "All periods ended in release",
        "translations": {
          "es": {
            "label": "Todos los períodos terminaron con la liberación"
          }
        }
      },
      "current": {
        "label": "Still incarcerated",
        "translations": {
          "es": {
            "label": "Aún encarcelado"
          }
        }
      },
      "unknown": {
        "label": "I am not sure",
        "translations": {
          "es": {
            "label": "No estoy seguro"
          }
        }
      }
    }
  },
  {
    "id": "ny_16059_earliest_conviction_date",
    "stage": "timing_and_completion",
    "prompt": "What is the date of the earliest conviction included in this request?",
    "helperText": "Use the actual records. An application is not a granted order. Keep convictions already sealed separate from convictions now requested. If unsure, choose I am not sure.",
    "type": "date_or_unknown",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuál es la fecha de la primera condena incluida en esta solicitud?",
        "helperText": "Use los registros reales. Una solicitud no es una orden concedida. Separe las condenas ya selladas de las que solicita ahora. Si tiene dudas, elija No estoy seguro."
      }
    }
  },
  {
    "id": "ny_16059_incarceration_periods",
    "stage": "timing_and_completion",
    "prompt": "What were all admission and release dates for incarceration since that conviction?",
    "helperText": "Keep each incarceration period on a separate line: YYYY-MM-DD/YYYY-MM-DD. Include overlapping periods and any period already reflected in the release date. Do not estimate missing dates.",
    "type": "text_or_unknown",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Cuáles fueron todas las fechas de ingreso y liberación de encarcelamientos desde esa condena?",
        "helperText": "Escriba cada período en una línea separada: AAAA-MM-DD/AAAA-MM-DD. Incluya períodos superpuestos y cualquier período ya reflejado en la fecha de liberación. No estime fechas faltantes."
      }
    }
  },
  {
    "id": "ny_16059_requested_excluded",
    "stage": "timing_and_completion",
    "type": "yes_no_unsure",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_hard_disqualifier",
    "prompt": "Does a conviction requested for sealing fall in the CPL 160.59 excluded-offense categories?",
    "helperText": "Check only convictions in this request against the existing offense list: sex offenses, Article 263, felony Article 125, violent felonies, Class A felonies and excluded felony attempts or conspiracies. Other criminal convictions still count in complete history. If unsure, choose I am not sure.",
    "options": null,
    "translations": {
      "es": {
        "prompt": "¿Alguna condena que solicita sellar pertenece a las categorías de delitos excluidos de CPL 160.59?",
        "helperText": "Revise solo las condenas de esta solicitud según la lista de delitos excluidos. Las otras condenas penales aún cuentan en todos los antecedentes. Si tiene dudas, elija No estoy seguro."
      }
    }
  },
  {
    "id": "sentencing_date",
    "stage": "timing_and_completion",
    "type": "date_or_unknown",
    "prompt": "When was the sentence imposed on your latest criminal conviction?",
    "helperText": "Use the actual record date. If unavailable, choose I am not sure; a broad elapsed-time estimate cannot establish this clock.",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_timing_gate",
    "options": null,
    "translations": {
      "es": {
        "prompt": "¿Cuándo se impuso la sentencia de su condena penal más reciente?",
        "helperText": "Use la fecha real del registro. Si no está disponible, elija No estoy seguro; una estimación general no establece este plazo."
      }
    }
  },
  {
    "id": "release_date",
    "stage": "timing_and_completion",
    "type": "date_or_unknown",
    "prompt": "What was your latest release date from incarceration?",
    "helperText": "Use the actual record date. If unavailable, choose I am not sure; a broad elapsed-time estimate cannot establish this clock.",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_timing_gate",
    "options": null,
    "translations": {
      "es": {
        "prompt": "¿Cuál fue su fecha más reciente de liberación del encarcelamiento?",
        "helperText": "Use la fecha real del registro. Si no está disponible, elija No estoy seguro; una estimación general no establece este plazo."
      }
    }
  }
];
export const NY_16059_FACT_IDS = NY_16059_QUESTIONS.map(q => q.id);
export const NY_16059_LEGACY_IDS = ["ny_16059_total_eligible_convictions", "ny_16059_felony_convictions", "ny_16059_prior_sealing", "ny_16059_post_last_conviction_crime", "ny_16059_ineligible_offense"];


export const NY_16059_TIMING_IDS = ["sentencing_date", "release_date", "ny_16059_earliest_conviction_date"];
