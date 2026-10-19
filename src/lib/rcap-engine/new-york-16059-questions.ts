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
  },
  {
    "id": "ny_16059_physical_custody_days_confirmed",
    "stage": "timing_and_completion",
    "prompt": "Do the listed periods establish actual physical custody on the days counted after conviction, including admission and release days?",
    "helperText": "Do not count administrative sentence credits as physical custody. Include each actual day only once. If the conviction-day portion or either endpoint is unclear, choose I am not sure. Keep the original dates.",
    "type": "yes_no_unsure",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Los períodos indicados acreditan reclusión física real en los días contados después de la condena, incluidos los días de ingreso y liberación?",
        "helperText": "No cuente créditos administrativos de la sentencia como reclusión física. Cuente cada día real una sola vez. Si no está clara la parte del día de la condena o alguna fecha inicial o final, elija No estoy seguro. Conserve las fechas originales."
      }
    }
  },
  {
    "id": "ny_16059_release_sentence_relationship_confirmed",
    "stage": "timing_and_completion",
    "prompt": "Does this release date belong to the latest criminal sentence that included incarceration?",
    "helperText": "Identify which sentence the release belongs to. A later probation or parole end date is not a substitute. If the relationship is unclear, choose I am not sure.",
    "type": "yes_no_unsure",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "options": null,
    "lifecyclePhase": "prepay_timing_gate",
    "translations": {
      "es": {
        "prompt": "¿Esta fecha de liberación corresponde a la última sentencia penal que incluyó encarcelamiento?",
        "helperText": "Identifique a qué sentencia corresponde la liberación. Una fecha posterior de finalización de la libertad condicional o supervisada no la sustituye. Si la relación no está clara, elija No estoy seguro."
      }
    }
  }
];
export const NY_16059_FACT_IDS = NY_16059_QUESTIONS.map(q => q.id);
export const NY_16059_LEGACY_IDS = ["ny_16059_total_eligible_convictions", "ny_16059_felony_convictions", "ny_16059_prior_sealing", "ny_16059_post_last_conviction_crime", "ny_16059_ineligible_offense"];


export const NY_16059_TIMING_IDS = ["sentencing_date", "release_date", "ny_16059_earliest_conviction_date"];

// Shared source-owned question identity and copy are browser-safe; arithmetic stays server-side.
export const NY_16059_CUSTODY_CONFIRMATION_ID = "ny_16059_physical_custody_days_confirmed";
export const NY_16059_RELEASE_CONFIRMATION_ID = "ny_16059_release_sentence_relationship_confirmed";

export const NY_16059_REASON_COPY: Record<string, [string, string]> = {
 '16058_components_missing': ["Check the entered CPL 160.58 order: count treatment-related convictions separately from additional earlier misdemeanors. A pending or denied application is not an entered order.", "Revise la orden concedida bajo CPL 160.58: cuente por separado las condenas relacionadas con el tratamiento y los delitos menores anteriores adicionales. Una solicitud pendiente o denegada no es una orden concedida."],
 '16058_components_conflict': ["The order components do not agree with the CPL 160.58 treatment-conviction and additional-misdemeanor structure. Check the actual order with a legal reviewer.", "Los componentes de la orden no concuerdan con la estructura de condenas de tratamiento y delitos menores adicionales de CPL 160.58. Revise la orden dictada con un revisor legal."],
 grouping_record_facts_unresolved: ["Review the exact conviction members, acts, record references and any disputed or excluded facts in the saved groups. Their connection is not yet established.", "Revise las condenas exactas, los actos, las referencias del expediente y los datos controvertidos o excluidos de los grupos guardados. Su conexión aún no se ha establecido."],
 grouping_other_history_unresolved: ["The saved groups cover only the requested convictions. The related acts in the rest of the history still need their actual records and associations.", "Los grupos guardados abarcan solo las condenas solicitadas. Los actos relacionados del resto del historial aún necesitan sus registros y asociaciones reales."],
 grouping_facts_missing: ["Check how the acts were connected in time, circumstances and criminal purpose, whether the only connection is a shared docket or sentence, and whether multiple victims were involved.", "Revise cómo se relacionaron los actos en tiempo, circunstancias y propósito delictivo, si la única conexión es un expediente o sentencia compartidos y si hubo varias víctimas."],
 grouping_facts_conflict: ["The answers describe both a factual connection and only a shared docket or sentence. Check the underlying acts before asking for transaction review.", "Las respuestas describen tanto una conexión entre los hechos como únicamente un expediente o sentencia compartidos. Revise los actos antes de solicitar la revisión de la transacción."],
 history_missing: ["Check your complete criminal history, the convictions in this request, and any earlier sealing applications and orders. An old eligible-conviction count does not establish these separate facts.", "Revise todos sus antecedentes penales, las condenas de esta solicitud y las solicitudes y órdenes de sellado anteriores. El recuento anterior de condenas elegibles no establece estos hechos por separado."],
 history_conflict: ["The history, requested convictions, felony counts or earlier sealing orders do not agree. Check the records before continuing.", "Los antecedentes, las condenas solicitadas, los recuentos de delitos graves o las órdenes de sellado anteriores no concuerdan. Revise los expedientes antes de continuar."],
 history_limit: ["The complete criminal history exceeds this procedure's two-crime or one-felony limit. This includes convictions outside this sealing request.", "Los antecedentes penales completos superan el límite de dos delitos o un delito grave de este procedimiento. Esto incluye condenas fuera de esta solicitud de sellado."],
 request_limit: ["This request exceeds the limit of two eligible offenses and no more than one felony.", "Esta solicitud supera el límite de dos delitos elegibles y no más de un delito grave."],
 grouping_review: ["A shared case number or concurrent sentences do not establish a single criminal transaction. A legal reviewer must check the connected acts and which offenses can be grouped.", "Un número de caso compartido o penas simultáneas no establecen una sola transacción delictiva. Un revisor legal debe examinar los actos relacionados y qué delitos pueden agruparse."],
 sealing_capacity: ["The convictions already sealed under CPL 160.59 and those requested exceed the remaining statutory capacity.", "Las condenas ya selladas bajo CPL 160.59 y las solicitadas superan la capacidad restante permitida por la ley."],
 '16058_order_review': ["An order under CPL 160.58 is not automatically the maximum allowed. A legal reviewer must identify the treatment convictions and additional prior misdemeanors sealed before applying CPL 160.59(3)(b).", "Una orden bajo CPL 160.58 no significa automáticamente que se alcanzó el máximo permitido. Un revisor legal debe identificar las condenas del programa de tratamiento y los delitos menores anteriores adicionales sellados antes de aplicar CPL 160.59(3)(b)."],
 anchor_invalid: ["Check the sentencing and release dates. Each supplied date must be a real calendar date for an event that has already occurred.", "Revise las fechas de la sentencia y de la liberación. Cada fecha proporcionada debe ser una fecha real del calendario de un hecho que ya ocurrió."],
 clock_missing: ["Check the sentencing, conviction and incarceration records. A broad elapsed-time answer cannot replace the dates and periods needed for this ten-year calculation.", "Revise los registros de sentencia, condena y encarcelamiento. Una respuesta general sobre el tiempo transcurrido no reemplaza las fechas y los períodos necesarios para este cálculo de diez años."],
 clock_conflict: ["The conviction, sentence, release and incarceration-period answers conflict. Check the records; no release date or missing period can be assumed.", "Las respuestas sobre la condena, la sentencia, la liberación y los períodos de encarcelamiento no concuerdan. Revise los registros; no se puede suponer una fecha de liberación ni un período faltante."],
 period_invalid: ["Check every incarceration period. Use real admission and release dates, in that order, with no future dates. Keep each period on its own line as YYYY-MM-DD/YYYY-MM-DD.", "Revise cada período de encarcelamiento. Use fechas reales de ingreso y liberación, en ese orden, sin fechas futuras. Escriba cada período en una línea separada como AAAA-MM-DD/AAAA-MM-DD."],
 incarcerated: ["The incarceration record shows that release has not occurred. Do not estimate a future release date for this calculation.", "El registro de encarcelamiento indica que la liberación aún no ocurrió. No estime una fecha de liberación futura para este cálculo."],
 clock_not_yet: ["Ten years have not yet elapsed under this procedure after accounting for the applicable anchor and incarceration time.", "Aún no han transcurrido diez años bajo este procedimiento después de considerar la fecha inicial aplicable y el tiempo de encarcelamiento."],
 clock_custody_confirmation: ["The listed dates do not yet establish the qualifying days of actual physical custody. Keep the dates as recorded; clarify any conviction-day, admission-day or release-day ambiguity before this calculation.", "Las fechas indicadas aún no establecen los días de reclusión física que deben contarse. Conserve las fechas registradas y aclare cualquier duda sobre el día de la condena, del ingreso o de la liberación antes de este cálculo."],
 clock_release_relationship: ["The release used for this calculation must belong to the latest sentence that included incarceration. Keep the recorded date and clarify that relationship; a bare release date does not establish it.", "La liberación usada para este cálculo debe corresponder a la última sentencia que incluyó encarcelamiento. Conserve la fecha registrada y aclare esa relación; una fecha de liberación por sí sola no la establece."],
 // Historical text retained for old receipt/catalog identity; current adopted
 // clock no longer returns this superseded legal-interpretation hold.
 clock_interpretation: ["The result depends on how incarceration already covered by the sentencing or release anchor is treated under CPL 160.59(5). A qualified legal reviewer must resolve that calculation before this request can proceed.", "El resultado depende de cómo se trate el encarcelamiento ya comprendido en la fecha inicial de sentencia o liberación bajo CPL 160.59(5). Un revisor legal calificado debe resolver ese cálculo antes de que esta solicitud pueda continuar."]
};
