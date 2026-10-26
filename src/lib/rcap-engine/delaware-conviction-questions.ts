import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const DE_CONVICTION_QUESTIONS: PublicQuestion[] = [
  {
    "id": "de_request",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "What would you like to check for this adult conviction record?",
    "options": [
      "court",
      "sbi",
      "unknown"
    ],
    "optionDisplay": {
      "court": {
        "label": "Whether I can ask a court for discretionary expungement",
        "translations": {
          "es": {
            "label": "Si puedo solicitar al tribunal una eliminación discrecional"
          }
        }
      },
      "sbi": {
        "label": "Whether this record meets mandatory or automatic expungement requirements",
        "translations": {
          "es": {
            "label": "Si este registro cumple los requisitos de eliminación obligatoria o automática"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Qué desea consultar sobre este registro de condena de adulto?"
      }
    }
  },
  {
    "id": "de_case_scope",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Which convictions are included in this request?",
    "options": [
      "one_misdemeanors",
      "one_felony",
      "multiple_cases",
      "one_violations",
      "unknown"
    ],
    "optionDisplay": {
      "one_misdemeanors": {
        "label": "One case: misdemeanors, with or without violations",
        "translations": {
          "es": {
            "label": "Un caso: delitos menores, con o sin infracciones"
          }
        }
      },
      "one_felony": {
        "label": "One felony conviction in one case",
        "translations": {
          "es": {
            "label": "Una condena por delito grave en un caso"
          }
        }
      },
      "multiple_cases": {
        "label": "Multiple cases: violations or misdemeanors, with no felony",
        "translations": {
          "es": {
            "label": "Varios casos: infracciones o delitos menores, sin delito grave"
          }
        }
      },
      "one_violations": {
        "label": "One case: violations only",
        "translations": {
          "es": {
            "label": "Un caso: solo infracciones"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Qué condenas se incluyen en esta solicitud?"
      }
    }
  },
  {
    "id": "de_all_charges",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "What do the records show for every other charge in the case or cases requested?",
    "options": [
      "all_eligible",
      "old_unresolved",
      "other_ineligible",
      "unknown"
    ],
    "optionDisplay": {
      "all_eligible": {
        "label": "Every other charge was dismissed/acquitted, or is in the same conviction group with the offense facts reported here",
        "translations": {
          "es": {
            "label": "Todos los demás cargos fueron desestimados o resultaron en absolución, o pertenecen al mismo grupo de condenas con los hechos del delito indicados aquí"
          }
        }
      },
      "old_unresolved": {
        "label": "Only old charges with missing, unknown, unobtainable or pending dispositions remain",
        "translations": {
          "es": {
            "label": "Solo quedan cargos antiguos sin resolución, o con resolución desconocida, no disponible o pendiente"
          }
        }
      },
      "other_ineligible": {
        "label": "Another charge has a different outcome, offense or unconfirmed status",
        "translations": {
          "es": {
            "label": "Otro cargo tiene una resolución, un delito o un estado sin confirmar diferente"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Qué indican los registros sobre todos los demás cargos de los casos solicitados?"
      }
    }
  },
  {
    "id": "de_special_convictions",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Does the conviction record identify one of these exact statutory groups?",
    "options": [
      "ordinary",
      "16_4764",
      "16_4771",
      "marijuana_paraphernalia",
      "4_904ef",
      "16_4756",
      "16_4757",
      "16_4758",
      "16_4760",
      "11_828",
      "11_861b2",
      "11_903",
      "unknown"
    ],
    "optionDisplay": {
      "ordinary": {
        "label": "None of the following special conviction groups",
        "translations": {
          "es": {
            "label": "Ninguno de los siguientes grupos especiales de condenas"
          }
        }
      },
      "16_4764": {
        "label": "Only marijuana possession — 16 Del. C. §4764",
        "translations": {
          "es": {
            "label": "Solo posesión de marihuana — título 16, §4764"
          }
        }
      },
      "16_4771": {
        "label": "Only drug paraphernalia — 16 Del. C. §4771",
        "translations": {
          "es": {
            "label": "Solo parafernalia de drogas — título 16, §4771"
          }
        }
      },
      "marijuana_paraphernalia": {
        "label": "Only those marijuana and paraphernalia convictions in the same case",
        "translations": {
          "es": {
            "label": "Solo esas condenas por marihuana y parafernalia en el mismo caso"
          }
        }
      },
      "4_904ef": {
        "label": "Only underage alcohol possession/consumption — 4 Del. C. §904(e)/(f)",
        "translations": {
          "es": {
            "label": "Solo posesión o consumo de alcohol por menores — título 4, §904(e)/(f)"
          }
        }
      },
      "16_4756": {
        "label": "Drug possession — 16 Del. C. §4756",
        "translations": {
          "es": {
            "label": "Posesión de drogas — título 16, §4756"
          }
        }
      },
      "16_4757": {
        "label": "Miscellaneous drug crimes — 16 §4757",
        "translations": {
          "es": {
            "label": "Otros delitos de drogas — 16 §4757"
          }
        }
      },
      "16_4758": {
        "label": "Counterfeit controlled substance — 16 §4758",
        "translations": {
          "es": {
            "label": "Sustancia controlada falsificada — 16 §4758"
          }
        }
      },
      "16_4760": {
        "label": "Maintaining a drug property — 16 §4760",
        "translations": {
          "es": {
            "label": "Mantener un inmueble para drogas — 16 §4760"
          }
        }
      },
      "11_828": {
        "label": "Burglar tools — 11 §828",
        "translations": {
          "es": {
            "label": "Herramientas para robo — 11 §828"
          }
        }
      },
      "11_861b2": {
        "label": "Second-degree forgery — 11 §861b2",
        "translations": {
          "es": {
            "label": "Falsificación en segundo grado — 11 §861b2"
          }
        }
      },
      "11_903": {
        "label": "Unlawful use of payment card — 11 §903",
        "translations": {
          "es": {
            "label": "Uso ilícito de tarjeta de pago — 11 §903"
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
    },
    "translations": {
      "es": {
        "prompt": "¿El registro de condena identifica uno de estos grupos legales exactos?"
      }
    }
  },
  {
    "id": "de_common_exclusions",
    "stage": "pathway_routing",
    "type": "multi_select",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Does any conviction requested involve one of these offenses?",
    "options": [
      "none",
      "11_628A",
      "11_766",
      "11_767",
      "11_791",
      "11_1106",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "None of these",
        "translations": {
          "es": {
            "label": "Ninguno de estos"
          }
        }
      },
      "11_628A": {
        "label": "Vehicular assault, second degree (§628A)",
        "translations": {
          "es": {
            "label": "Agresión vehicular en segundo grado (§628A)"
          }
        }
      },
      "11_766": {
        "label": "Incest (§766)",
        "translations": {
          "es": {
            "label": "Incesto (§766)"
          }
        }
      },
      "11_767": {
        "label": "Unlawful sexual contact, third degree (§767)",
        "translations": {
          "es": {
            "label": "Contacto sexual ilícito en tercer grado (§767)"
          }
        }
      },
      "11_791": {
        "label": "Coercion (§791)",
        "translations": {
          "es": {
            "label": "Coacción (§791)"
          }
        }
      },
      "11_1106": {
        "label": "Unlawfully dealing with a child (§1106)",
        "translations": {
          "es": {
            "label": "Trato ilícito con un menor (§1106)"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Alguna condena solicitada corresponde a uno de estos delitos?"
      }
    },
    "exclusiveOptions": [
      "none",
      "unknown"
    ]
  },
  {
    "id": "de_mandatory_exclusions",
    "stage": "pathway_routing",
    "type": "multi_select",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Which of these facts or misdemeanor groups appear in the case record?",
    "options": [
      "none",
      "domestic",
      "child",
      "vulnerable",
      "subparts",
      "11_625_sexual_charge",
      "11_763",
      "11_764",
      "11_765",
      "11_820",
      "11_841B",
      "11_916",
      "11_917",
      "11_1211",
      "11_1250",
      "11_1256",
      "11_1257",
      "11_1257A",
      "11_1304",
      "11_1313",
      "11_1332",
      "11_1335",
      "11_1341",
      "11_1343",
      "11_1355",
      "11_1443",
      "11_1445",
      "11_1456",
      "11_1457",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "None of these",
        "translations": {
          "es": {
            "label": "Ninguno de estos"
          }
        }
      },
      "domestic": {
        "label": "A listed §4373(b)(1)(b) offense and the qualifying family, former-spouse, cohabitation, shared-child or dating relationship",
        "translations": {
          "es": {
            "label": "Un delito enumerado en §4373(b)(1)(b) y la relación familiar, de excónyuge, convivencia, hijo en común o noviazgo que exige la ley"
          }
        }
      },
      "child": {
        "label": "An offense with a child victim",
        "translations": {
          "es": {
            "label": "Un delito con una víctima menor de edad"
          }
        }
      },
      "vulnerable": {
        "label": "An offense with a vulnerable adult victim as defined in §1105",
        "translations": {
          "es": {
            "label": "Un delito con una víctima adulta vulnerable según §1105"
          }
        }
      },
      "subparts": {
        "label": "A misdemeanor in Chapter 5, subchapter VI, subpart A, B, C or F",
        "translations": {
          "es": {
            "label": "Un delito menor del capítulo 5, subcapítulo VI, apartado A, B, C o F"
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
      },
      "11_625_sexual_charge": {
        "label": "Administering drugs, charged with a sexual offense — §625",
        "translations": {
          "es": {
            "label": "Administración de drogas, con cargo por delito sexual — §625"
          }
        }
      },
      "11_763": {
        "label": "Sexual harassment — §763",
        "translations": {
          "es": {
            "label": "Acoso sexual — §763"
          }
        }
      },
      "11_764": {
        "label": "Indecent exposure, second degree — §764",
        "translations": {
          "es": {
            "label": "Exhibición indecente, segundo grado — §764"
          }
        }
      },
      "11_765": {
        "label": "Indecent exposure, first degree — §765",
        "translations": {
          "es": {
            "label": "Exhibición indecente, primer grado — §765"
          }
        }
      },
      "11_820": {
        "label": "Trespassing to peer into a window or door — §820",
        "translations": {
          "es": {
            "label": "Entrada ilícita para mirar por una ventana o puerta — §820"
          }
        }
      },
      "11_841B": {
        "label": "Organized retail crime — §841B",
        "translations": {
          "es": {
            "label": "Delito organizado contra comercios — §841B"
          }
        }
      },
      "11_916": {
        "label": "Home improvement fraud — §916",
        "translations": {
          "es": {
            "label": "Fraude en mejoras de vivienda — §916"
          }
        }
      },
      "11_917": {
        "label": "New home construction fraud — §917",
        "translations": {
          "es": {
            "label": "Fraude en construcción de vivienda nueva — §917"
          }
        }
      },
      "11_1211": {
        "label": "Official misconduct — §1211",
        "translations": {
          "es": {
            "label": "Conducta indebida de funcionario — §1211"
          }
        }
      },
      "11_1250": {
        "label": "Offenses against law-enforcement animals — §1250",
        "translations": {
          "es": {
            "label": "Delitos contra animales de las fuerzas del orden — §1250"
          }
        }
      },
      "11_1256": {
        "label": "Promoting prison contraband — §1256",
        "translations": {
          "es": {
            "label": "Promoción de contrabando penitenciario — §1256"
          }
        }
      },
      "11_1257": {
        "label": "Resisting arrest — §1257",
        "translations": {
          "es": {
            "label": "Resistencia al arresto — §1257"
          }
        }
      },
      "11_1257A": {
        "label": "Using an animal to avoid capture — §1257A",
        "translations": {
          "es": {
            "label": "Uso de un animal para evitar la captura — §1257A"
          }
        }
      },
      "11_1304": {
        "label": "Hate crime — §1304",
        "translations": {
          "es": {
            "label": "Delito de odio — §1304"
          }
        }
      },
      "11_1313": {
        "label": "Interfering with emergency communication — §1313",
        "translations": {
          "es": {
            "label": "Interferencia con comunicaciones de emergencia — §1313"
          }
        }
      },
      "11_1332": {
        "label": "Abusing a corpse — §1332",
        "translations": {
          "es": {
            "label": "Abuso de un cadáver — §1332"
          }
        }
      },
      "11_1335": {
        "label": "Violation of privacy — §1335",
        "translations": {
          "es": {
            "label": "Violación de la privacidad — §1335"
          }
        }
      },
      "11_1341": {
        "label": "Lewdness — §1341",
        "translations": {
          "es": {
            "label": "Actos obscenos — §1341"
          }
        }
      },
      "11_1343": {
        "label": "Patronizing a prostitute — §1343",
        "translations": {
          "es": {
            "label": "Contratación de servicios de prostitución — §1343"
          }
        }
      },
      "11_1355": {
        "label": "Permitting prostitution — §1355",
        "translations": {
          "es": {
            "label": "Permitir la prostitución — §1355"
          }
        }
      },
      "11_1443": {
        "label": "Carrying a concealed dangerous instrument — §1443",
        "translations": {
          "es": {
            "label": "Portación oculta de instrumento peligroso — §1443"
          }
        }
      },
      "11_1445": {
        "label": "Unlawfully dealing with a dangerous weapon — §1445",
        "translations": {
          "es": {
            "label": "Comercio ilícito con arma peligrosa — §1445"
          }
        }
      },
      "11_1456": {
        "label": "Unlawfully allowing a minor access to a firearm — §1456",
        "translations": {
          "es": {
            "label": "Permitir ilícitamente el acceso de un menor a un arma de fuego — §1456"
          }
        }
      },
      "11_1457": {
        "label": "Possession of a weapon in a Safe School and Recreation Zone — §1457",
        "translations": {
          "es": {
            "label": "Posesión de un arma en una zona escolar y recreativa protegida — §1457"
          }
        }
      }
    },
    "translations": {
      "es": {
        "prompt": "¿Cuáles de estos hechos o grupos de delitos menores aparecen en el expediente?",
        "helperText": "Compare el delito exacto con §4373(b). La violencia doméstica requiere un delito enumerado y la relación indicada; la convivencia o el noviazgo tiene el límite legal de tres años. §625 requiere un cargo por delito sexual. Una etiqueta general de violencia no basta. La lista de delitos con relación doméstica es §§601, 602, 603, 611, 614, 621, 625, 628A, 781, 785, 791, 804, 811, 821, 822, 823, 1271(3), 1271A, 1311 y 2113. Para los delitos individuales indicados a continuación, seleccione solo condenas por delitos menores."
      }
    },
    "helperText": "Check the exact offense against §4373(b). Domestic violence requires both a listed offense and the stated relationship; cohabitation/dating uses the statutory three-year limit. §625 requires a charged sexual offense. A broad violence label alone does not answer this question. The domestic-relationship offense list is §§601, 602, 603, 611, 614, 621, 625, 628A, 781, 785, 791, 804, 811, 821, 822, 823, 1271(3), 1271A, 1311 and 2113. Select only a misdemeanor conviction for the individually named offenses below.",
    "exclusiveOptions": [
      "none",
      "unknown"
    ]
  },
  {
    "id": "de_court_exclusions",
    "stage": "pathway_routing",
    "type": "multi_select",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Does the conviction record include any of these additional court-expungement exclusions?",
    "options": [
      "none",
      "violent_felony",
      "16_1136",
      "31_3913",
      "31_309",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "None of these",
        "translations": {
          "es": {
            "label": "Ninguna de estas"
          }
        }
      },
      "violent_felony": {
        "label": "A Title 11 felony listed in §4201(c)",
        "translations": {
          "es": {
            "label": "Un delito grave del título 11 enumerado en §4201(c)"
          }
        }
      },
      "16_1136": {
        "label": "16 Del. C. §1136",
        "translations": {
          "es": {
            "label": "Título 16, §1136"
          }
        }
      },
      "31_3913": {
        "label": "31 Del. C. §3913",
        "translations": {
          "es": {
            "label": "Título 31, §3913"
          }
        }
      },
      "31_309": {
        "label": "A felony involving physical or sexual assault as defined in 31 Del. C. §309",
        "translations": {
          "es": {
            "label": "Un delito grave de agresión física o sexual definido en el título 31, §309"
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
    },
    "translations": {
      "es": {
        "prompt": "¿El registro incluye alguna de estas exclusiones adicionales de eliminación judicial?"
      }
    },
    "exclusiveOptions": [
      "none",
      "unknown"
    ]
  },
  {
    "id": "de_motor_vehicle",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Does this request include a Title 21 offense or a county/municipal equivalent?",
    "options": [
      "none",
      "exceptions",
      "other",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "No",
        "translations": {
          "es": {
            "label": "No"
          }
        }
      },
      "exceptions": {
        "label": "Only driving after judgment prohibited (§2810), reckless driving (§4175), or operation causing death (§4176A)",
        "translations": {
          "es": {
            "label": "Solo conducción prohibida tras sentencia (§2810), conducción temeraria (§4175) o conducción que causa muerte (§4176A)"
          }
        }
      },
      "other": {
        "label": "Another Title 21 offense, including DUI (§4177)",
        "translations": {
          "es": {
            "label": "Otro delito del título 21, incluida la conducción bajo los efectos del alcohol o drogas (§4177)"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Esta solicitud incluye un delito del título 21 o un equivalente del condado o municipio?"
      }
    }
  },
  {
    "id": "de_other_convictions",
    "stage": "pathway_routing",
    "type": "multi_select",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Outside the requested cases, which prior or later convictions are on the record?",
    "options": [
      "none",
      "underage",
      "marijuana",
      "paraphernalia",
      "title21",
      "mandatory_standalone",
      "other",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "None",
        "translations": {
          "es": {
            "label": "Ninguna"
          }
        }
      },
      "underage": {
        "label": "Underage alcohol possession/consumption (§904(e)/(f))",
        "translations": {
          "es": {
            "label": "Posesión o consumo de alcohol por menores (§904(e)/(f))"
          }
        }
      },
      "marijuana": {
        "label": "Personal-use marijuana possession (§4764)",
        "translations": {
          "es": {
            "label": "Posesión de marihuana para uso personal (§4764)"
          }
        }
      },
      "paraphernalia": {
        "label": "Drug paraphernalia possession (§4771)",
        "translations": {
          "es": {
            "label": "Posesión de parafernalia de drogas (§4771)"
          }
        }
      },
      "title21": {
        "label": "Title 21 motor vehicle offenses",
        "translations": {
          "es": {
            "label": "Delitos de tránsito del título 21"
          }
        }
      },
      "mandatory_standalone": {
        "label": "Other cases each independently eligible for mandatory expungement",
        "translations": {
          "es": {
            "label": "Otros casos, cada uno de los cuales reúne por sí solo los requisitos para la eliminación obligatoria"
          }
        }
      },
      "other": {
        "label": "Another prior or later conviction",
        "translations": {
          "es": {
            "label": "Otra condena anterior o posterior"
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
    },
    "translations": {
      "es": {
        "prompt": "Fuera de los casos solicitados, ¿qué condenas anteriores o posteriores aparecen en el registro?"
      }
    },
    "exclusiveOptions": [
      "none",
      "unknown"
    ]
  },
  {
    "id": "de_other_cases_individually_eligible",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Has eligibility of every charge in each other case been established independently under §4373?",
    "options": [
      "yes",
      "no",
      "unknown"
    ],
    "optionDisplay": {
      "yes": {
        "label": "Yes",
        "translations": {
          "es": {
            "label": "Sí"
          }
        }
      },
      "no": {
        "label": "No",
        "translations": {
          "es": {
            "label": "No"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Se ha establecido por separado que todos los cargos de cada uno de los demás casos reúnen los requisitos según §4373?"
      }
    }
  },
  {
    "id": "de_pending_charges",
    "stage": "pathway_routing",
    "type": "multi_select",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Which criminal charges are currently pending?",
    "options": [
      "none",
      "underage",
      "marijuana",
      "title21",
      "other",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "None",
        "translations": {
          "es": {
            "label": "Ninguno"
          }
        }
      },
      "underage": {
        "label": "Only underage alcohol under §904(e)/(f)",
        "translations": {
          "es": {
            "label": "Alcohol por menores según §904(e)/(f)"
          }
        }
      },
      "marijuana": {
        "label": "Personal-use marijuana under §4764(c)",
        "translations": {
          "es": {
            "label": "Marihuana para uso personal según §4764(c)"
          }
        }
      },
      "title21": {
        "label": "Title 21 motor vehicle offenses",
        "translations": {
          "es": {
            "label": "Delitos de tránsito del título 21"
          }
        }
      },
      "other": {
        "label": "Any other criminal charge",
        "translations": {
          "es": {
            "label": "Cualquier otro cargo penal"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Qué cargos penales están pendientes actualmente?"
      }
    },
    "exclusiveOptions": [
      "none",
      "unknown"
    ]
  },
  {
    "id": "de_supervision",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Are you currently serving incarceration, parole or probation?",
    "options": [
      "none",
      "incarceration",
      "parole",
      "probation",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "None of these",
        "translations": {
          "es": {
            "label": "Ninguna de estas"
          }
        }
      },
      "incarceration": {
        "label": "Incarceration",
        "translations": {
          "es": {
            "label": "Encarcelamiento"
          }
        }
      },
      "parole": {
        "label": "Parole",
        "translations": {
          "es": {
            "label": "Libertad bajo palabra"
          }
        }
      },
      "probation": {
        "label": "Probation",
        "translations": {
          "es": {
            "label": "Libertad condicional"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Actualmente cumple encarcelamiento, libertad bajo palabra o libertad condicional?"
      }
    }
  },
  {
    "id": "de_financial_status",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "What is the status of the money owed for these convictions?",
    "options": [
      "paid",
      "court_resolved",
      "nonwilful_fines",
      "unpaid_restitution",
      "unpaid_other",
      "unknown"
    ],
    "optionDisplay": {
      "paid": {
        "label": "All fines, fees and restitution are paid",
        "translations": {
          "es": {
            "label": "Todas las multas, tasas y restitución están pagadas"
          }
        }
      },
      "court_resolved": {
        "label": "Restitution is paid; an actual court order waived fines/fees or converted them to a civil judgment",
        "translations": {
          "es": {
            "label": "La restitución está pagada; una orden del tribunal eximió las multas o tasas, o las convirtió en sentencia civil"
          }
        }
      },
      "nonwilful_fines": {
        "label": "Restitution is paid; fines/fees remain unpaid for reasons other than wilful noncompliance",
        "translations": {
          "es": {
            "label": "La restitución está pagada; quedan multas o tasas impagadas por motivos distintos al incumplimiento intencional"
          }
        }
      },
      "unpaid_restitution": {
        "label": "Restitution remains unpaid",
        "translations": {
          "es": {
            "label": "Queda restitución impagada"
          }
        }
      },
      "unpaid_other": {
        "label": "Other unpaid obligations",
        "translations": {
          "es": {
            "label": "Otras obligaciones impagadas"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Cuál es la situación del dinero adeudado por estas condenas?"
      }
    }
  },
  {
    "id": "de_incarceration",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Was there incarceration for any conviction included in this request?",
    "options": [
      "never",
      "released",
      "serving",
      "unknown"
    ],
    "optionDisplay": {
      "never": {
        "label": "No incarceration for these convictions",
        "translations": {
          "es": {
            "label": "No hubo encarcelamiento por estas condenas"
          }
        }
      },
      "released": {
        "label": "Yes, and release has occurred",
        "translations": {
          "es": {
            "label": "Sí, y ya ocurrió la puesta en libertad"
          }
        }
      },
      "serving": {
        "label": "Still incarcerated",
        "translations": {
          "es": {
            "label": "Todavía encarcelado"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Hubo encarcelamiento por alguna condena incluida en esta solicitud?"
      }
    }
  },
  {
    "id": "de_prior_expungement",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Have you previously been granted expungement of a conviction?",
    "options": [
      "none",
      "conviction",
      "felony",
      "unknown"
    ],
    "optionDisplay": {
      "none": {
        "label": "No",
        "translations": {
          "es": {
            "label": "No"
          }
        }
      },
      "conviction": {
        "label": "Yes, a conviction other than a felony",
        "translations": {
          "es": {
            "label": "Sí, una condena que no era por delito grave"
          }
        }
      },
      "felony": {
        "label": "Yes, a felony conviction",
        "translations": {
          "es": {
            "label": "Sí, una condena por delito grave"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Se le concedió antes la eliminación de una condena?"
      }
    }
  },
  {
    "id": "de_active_warrant",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Is there an active warrant in any case with an unresolved charge?",
    "options": [
      "yes",
      "no",
      "unknown"
    ],
    "optionDisplay": {
      "yes": {
        "label": "Yes",
        "translations": {
          "es": {
            "label": "Sí"
          }
        }
      },
      "no": {
        "label": "No",
        "translations": {
          "es": {
            "label": "No"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Hay una orden de arresto activa en algún caso con un cargo sin resolver?"
      }
    }
  },
  {
    "id": "de_recent_case_activity",
    "stage": "pathway_routing",
    "type": "single_choice",
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "Is there documented case activity in the last 12 months for any unresolved charge?",
    "options": [
      "yes",
      "no",
      "unknown"
    ],
    "optionDisplay": {
      "yes": {
        "label": "Yes",
        "translations": {
          "es": {
            "label": "Sí"
          }
        }
      },
      "no": {
        "label": "No",
        "translations": {
          "es": {
            "label": "No"
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
    },
    "translations": {
      "es": {
        "prompt": "¿Hay actividad documentada en los últimos 12 meses en algún caso con un cargo sin resolver?"
      }
    }
  },
  {
    "id": "conviction_date",
    "stage": "pathway_routing",
    "type": "date_or_unknown",
    "options": null,
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "What is the conviction date, or the most recent conviction date for multiple cases?",
    "translations": {
      "es": {
        "prompt": "¿Cuál es la fecha de condena, o la fecha más reciente si son varios casos?"
      }
    }
  },
  {
    "id": "release_date",
    "stage": "pathway_routing",
    "type": "date_or_unknown",
    "options": null,
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "What is the latest release-from-incarceration date for the convictions requested?",
    "translations": {
      "es": {
        "prompt": "¿Cuál es la fecha más reciente de puesta en libertad por las condenas solicitadas?"
      }
    }
  },
  {
    "id": "de_prior_expungement_date",
    "stage": "pathway_routing",
    "type": "date_or_unknown",
    "options": null,
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "On what date was the prior conviction expungement granted?",
    "translations": {
      "es": {
        "prompt": "¿En qué fecha se concedió la eliminación de la condena anterior?"
      }
    }
  },
  {
    "id": "de_latest_unresolved_charge_date",
    "stage": "pathway_routing",
    "type": "date_or_unknown",
    "options": null,
    "required": false,
    "contextOnly": false,
    "doesNotSelectPathway": true,
    "lifecyclePhase": "prepay_route_splitter",
    "prompt": "What is the date of the most recent unresolved charge?",
    "translations": {
      "es": {
        "prompt": "¿Cuál es la fecha del cargo sin resolver más reciente?"
      }
    }
  }
];
export const DE_CONVICTION_FACT_IDS = DE_CONVICTION_QUESTIONS.map(q => q.id);
