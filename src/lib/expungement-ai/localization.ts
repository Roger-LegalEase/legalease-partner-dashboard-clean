import {RCAP_SPANISH_COPY} from "@/lib/partners/onboarding/rcap-spanish-copy";
export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES = ["en", "es"] as const;

type CopyEntry = {
  en: string;
  es?: string;
};

export const EXPUNGEMENT_COPY: Record<string, CopyEntry> = {
  "clinic.integrated.entry.0": {"en": "This clinic is outside its scheduled hours. Check the event time with staff.", "es": "Esta clínica está fuera de su horario. Confirme la hora del evento con el personal."},
  "clinic.integrated.entry.1": {"en": "This event code has expired. Ask Clinic staff for a current code.", "es": "Este código ha vencido. Pida un código vigente al personal de la clínica."},
  "clinic.integrated.entry.2": {"en": "This event code is no longer active. Ask Clinic staff for a current code.", "es": "Este código ya no está activo. Pida un código vigente al personal de la clínica."},
  "clinic.integrated.entry.3": {"en": "This event code is scheduled for a later time. Check its start time with staff.", "es": "Este código está programado para más tarde. Confirme su hora de inicio con el personal."},
  "clinic.integrated.entry.4": {"en": "That code does not match this event. Check the code with Clinic staff.", "es": "El código no corresponde a este evento. Confírmelo con el personal de la clínica."},
  "clinic.integrated.entry.5": {"en": "This code or event has reached its limit. Ask Clinic staff about available entry.", "es": "El código o el evento ha alcanzado su límite. Pregunte al personal sobre las opciones de entrada."},
  "clinic.integrated.entry.6": {"en": "This clinic is not currently open. Ask staff for the current event link.", "es": "La clínica no está abierta en este momento. Pida al personal el enlace vigente del evento."},
  "clinic.integrated.entry.7": {"en": "Clinic entry could not be verified. Retry or ask event staff for help.", "es": "No se pudo verificar la entrada. Reintente o pida ayuda al personal del evento."},

  "rcap.setup.copy.0": {"en": "Where can participants email for help?", "es": "¿Dónde pueden los participantes enviar un correo para pedir ayuda?"},
  "rcap.setup.copy.1": {"en": "How often should your team receive reports?", "es": "¿Con qué frecuencia debe recibir informes su equipo?"},
  "rcap.setup.copy.2": {"en": "Who will manage your program dashboard?", "es": "¿Quién administrará el panel de su programa?"},
  "rcap.setup.copy.3": {"en": "What should people see at the top of your page?", "es": "¿Qué deben ver las personas en la parte superior de su página?"},
  "rcap.setup.copy.4": {"en": "Organization and contacts", "es": "Organización y contactos"},
  "rcap.setup.copy.5": {"en": "Public identity and website", "es": "Identidad pública y sitio web"},
  "rcap.setup.copy.6": {"en": "Confirm the names and contact details participants may see.", "es": "Confirme los nombres y los datos de contacto que podrán ver los participantes."},
  "rcap.setup.copy.7": {"en": "These values will be available to the later private-page review.", "es": "Estos datos estarán disponibles cuando revise la vista previa privada de su página."},
  "rcap.setup.copy.8": {"en": "Needs information", "es": "Necesita información"},
  "rcap.setup.copy.9": {"en": "Saved task", "es": "Tarea guardada"},
  "rcap.setup.copy.10": {"en": "Current task", "es": "Tarea actual"},
  "rcap.setup.copy.11": {"en": "Save and Continue", "es": "Guardar y continuar"},
  "rcap.setup.copy.12": {"en": "Save section", "es": "Guardar sección"},
  "rcap.setup.copy.13": {"en": "Saving", "es": "Guardando"},
  "rcap.setup.copy.14": {"en": "Back", "es": "Atrás"},
  "rcap.setup.copy.15": {"en": "Implementation center", "es": "Centro del programa"},
  "rcap.setup.copy.16": {"en": "Retry", "es": "Reintentar"},
  "rcap.setup.copy.17": {"en": "Return to last saved version", "es": "Volver a la última versión guardada"},
  "rcap.setup.copy.18": {"en": "Sign in again", "es": "Iniciar sesión de nuevo"},
  "rcap.setup.copy.19": {"en": "Public organization name", "es": "Nombre público de la organización"},
  "rcap.setup.copy.20": {"en": "Organization website", "es": "Sitio web de la organización"},
  "rcap.setup.copy.21": {"en": "Main phone", "es": "Teléfono principal"},
  "rcap.setup.copy.22": {"en": "Public program name", "es": "Nombre público del programa"},
  "rcap.setup.copy.23": {"en": "Preferred public-page address", "es": "Dirección preferida de la página pública"},
  "rcap.setup.copy.24": {"en": "This is the organization name participants will see.", "es": "Este es el nombre de la organización que verán los participantes."},
  "rcap.setup.copy.25": {"en": "This is a preference only. It does not change your current partner or public-page address.", "es": "Esto es solo una preferencia. No cambia la dirección actual de su organización ni de su página pública."},
  "rcap.setup.copy.26": {"en": "required", "es": "obligatorio"},
  "rcap.setup.copy.27": {"en": "optional", "es": "opcional"},
  "rcap.setup.copy.28": {"en": "Optional", "es": "Opcional"},
  "rcap.setup.copy.29": {"en": "Saved", "es": "Guardado"},
  "rcap.setup.copy.30": {"en": "Not finished", "es": "Sin terminar"},
  "rcap.setup.copy.31": {"en": "Organization", "es": "Organización"},
  "rcap.setup.copy.32": {"en": "Could not save. Nothing changed. This role cannot edit the onboarding section.", "es": "No se pudo guardar. No cambió nada. Este rol no puede editar la sección de configuración."},
  "rcap.setup.copy.33": {"en": "Could not save. Nothing changed. Check your connection and try again.", "es": "No se pudo guardar. No cambió nada. Revise su conexión e inténtelo de nuevo."},
  "rcap.setup.copy.34": {"en": "Could not save. Nothing changed. Sign in again to continue.", "es": "No se pudo guardar. No cambió nada. Inicie sesión de nuevo para continuar."},
  "rcap.reporting.title": {"en": "Program reporting", "es": "Informes del programa"},
  "rcap.reporting.unavailable": {"en": "Report exports are not yet available. View recorded program activity in your dashboard.", "es": "La exportación de informes aún no está disponible. Consulte la actividad registrada de su programa en el panel."},
  "rcap.reporting.open": {"en": "Open program dashboard", "es": "Abrir el panel del programa"},
  "rcap.setup.join": {"en": "How will people join your program?", "es": "¿Cómo se unirán las personas a su programa?"},
  "rcap.setup.help": {"en": "What does this mean?", "es": "¿Qué significa esto?"},
  "rcap.setup.why": {"en": "Why we ask", "es": "Por qué preguntamos"},

  "legal_aid.places_open": { en: "Open", es: "Disponibles" },
  "legal_aid.participant.auth_required": {"en": "Sign in to continue.", "es": "Inicie sesión para continuar."},
  "legal_aid.participant.account_unverified": {"en": "Verify your account to continue.", "es": "Verifique su cuenta para continuar."},
  "legal_aid.participant.account_deleted": {"en": "This account has been deleted.", "es": "Esta cuenta ha sido eliminada."},
  // QA-UX-02 participant presentation only. H-A A3 and H-L human review remain open.
  "legal_aid.participant.0": {"en": "Your registration could not be saved. Please try again.", "es": "No se pudo guardar su inscripción. Vuelva a intentarlo."},
  "legal_aid.participant.1": {"en": "Your registration could not be saved. Check your connection and try again.", "es": "No se pudo guardar su inscripción. Revise su conexión y vuelva a intentarlo."},
  "legal_aid.participant.2": {"en": "Your full name", "es": "Su nombre completo"},
  "legal_aid.participant.3": {"en": "Email", "es": "Correo electrónico"},
  "legal_aid.participant.4": {"en": "Phone", "es": "Teléfono"},
  "legal_aid.participant.5": {"en": "How should", "es": "¿Cómo debe"},
  "legal_aid.participant.6": {"en": "contact you?", "es": "comunicarse con usted?"},
  "legal_aid.participant.7": {"en": "Phone call", "es": "Llamada telefónica"},
  "legal_aid.participant.8": {"en": "Text message", "es": "Mensaje de texto"},
  "legal_aid.participant.9": {"en": "Any of these", "es": "Cualquiera de estas opciones"},
  "legal_aid.participant.10": {"en": "Language you prefer (optional)", "es": "Idioma que prefiere (opcional)"},
  "legal_aid.participant.11": {"en": "English", "es": "Inglés"},
  "legal_aid.participant.12": {"en": "Anything that would help us assist you at the clinic? (optional)", "es": "¿Hay algo que nos ayude a atenderle en la clínica? (opcional)"},
  "legal_aid.participant.13": {"en": "For example: I need an interpreter, I use a wheelchair, I can only come in the afternoon.", "es": "Por ejemplo: necesito un intérprete, uso una silla de ruedas, solo puedo asistir por la tarde."},
  "legal_aid.participant.14": {"en": "Registration holds your place. It does not ask about your finances, citizenship, or Social Security number; that comes later, in your private application, and only if you choose to continue.", "es": "La inscripción reserva su lugar. No le pide información sobre sus finanzas, ciudadanía ni número de Seguro Social; esa información se solicita después, en su solicitud privada, y solo si usted decide continuar."},
  "legal_aid.participant.15": {"en": "Saving your place…", "es": "Reservando su lugar…"},
  "legal_aid.participant.16": {"en": "Register for this clinic", "es": "Inscribirse en esta clínica"},
  "legal_aid.participant.17": {"en": "Protected information", "es": "Información protegida"},
  "legal_aid.participant.18": {"en": "One number the court filing needs. It is stored encrypted and only the clinic attorney or coordinator on your case can see it.", "es": "Un número que se necesita para la presentación ante el tribunal. Se guarda cifrado y solo el abogado o coordinador de la clínica que atiende su caso puede verlo."},
  "legal_aid.participant.19": {"en": "Review and sign", "es": "Revisar y firmar"},
  "legal_aid.participant.20": {"en": "Your answers could not be saved.", "es": "No se pudieron guardar sus respuestas."},
  "legal_aid.participant.21": {"en": "Your answers could not be saved. Check your connection; nothing on this screen was lost.", "es": "No se pudieron guardar sus respuestas. Revise su conexión; no se perdió nada de esta pantalla."},
  "legal_aid.participant.22": {"en": "Your application has been received.", "es": "Se ha recibido su solicitud."},
  "legal_aid.participant.23": {"en": "The application could not be submitted.", "es": "No se pudo enviar la solicitud."},
  "legal_aid.participant.24": {"en": "Withdraw this application? The clinic team will stop reviewing it.", "es": "¿Desea retirar esta solicitud? El equipo de la clínica dejará de revisarla."},
  "legal_aid.participant.25": {"en": "The clinic team needs more from you", "es": "El equipo de la clínica necesita más información de usted"},
  "legal_aid.participant.26": {"en": "Please update your application", "es": "Actualice su solicitud"},
  "legal_aid.participant.27": {"en": "Make the changes, sign again where asked, and submit again.", "es": "Haga los cambios, vuelva a firmar donde se le indique y envíe la solicitud de nuevo."},
  "legal_aid.participant.28": {"en": "Application steps", "es": "Pasos de la solicitud"},
  "legal_aid.participant.29": {"en": "Step", "es": "Paso"},
  "legal_aid.participant.30": {"en": "of", "es": "de"},
  "legal_aid.participant.31": {"en": "Your application was updated somewhere else (another tab or device).", "es": "Su solicitud se actualizó en otro lugar (otra pestaña o dispositivo)."},
  "legal_aid.participant.32": {"en": "Reload to see the latest answers.", "es": "Vuelva a cargar la página para ver las respuestas más recientes."},
  "legal_aid.participant.33": {"en": "Try saving again.", "es": "Intente guardar de nuevo."},
  "legal_aid.participant.34": {"en": "Your clinic:", "es": "Su clínica:"},
  "legal_aid.participant.35": {"en": ". It comes from your registration.", "es": ". Se toma de su inscripción."},
  "legal_aid.participant.36": {"en": "Back", "es": "Atrás"},
  "legal_aid.participant.37": {"en": "Save and continue", "es": "Guardar y continuar"},
  "legal_aid.participant.38": {"en": "Submit my application", "es": "Enviar mi solicitud"},
  "legal_aid.participant.39": {"en": "You can leave and come back; your answers are saved on the server, not on this device.", "es": "Puede salir y volver; sus respuestas se guardan en el sistema, no en este dispositivo."},
  "legal_aid.participant.40": {"en": "Withdraw this application", "es": "Retirar esta solicitud"},
  "legal_aid.participant.41": {"en": "Registration details", "es": "Detalles de la inscripción"},
  "legal_aid.participant.42": {"en": "Saving…", "es": "Guardando…"},
  "legal_aid.participant.43": {"en": "Saved", "es": "Guardado"},
  "legal_aid.participant.44": {"en": "Unsaved changes", "es": "Cambios sin guardar"},
  "legal_aid.participant.45": {"en": "Not saved", "es": "No se guardó"},
  "legal_aid.participant.46": {"en": "Needs reload", "es": "Es necesario volver a cargar la página"},
  "legal_aid.participant.47": {"en": "Choose…", "es": "Elija…"},
  "legal_aid.participant.48": {"en": "I don't know this amount", "es": "No sé esta cantidad"},
  "legal_aid.participant.49": {"en": "(optional)", "es": "(opcional)"},
  "legal_aid.participant.50": {"en": "Save your answers first, then enter this number.", "es": "Guarde sus respuestas primero y después ingrese este número."},
  "legal_aid.participant.51": {"en": "The number could not be saved.", "es": "No se pudo guardar el número."},
  "legal_aid.participant.52": {"en": "Saved. Only the masked number is shown from now on.", "es": "Guardado. A partir de ahora solo se muestran los últimos cuatro dígitos del número."},
  "legal_aid.participant.53": {"en": "On file:", "es": "Registrado:"},
  "legal_aid.participant.54": {"en": ". Enter it again only if you need to correct it.", "es": ". Ingréselo de nuevo solo si necesita corregirlo."},
  "legal_aid.participant.55": {"en": "Social Security number", "es": "Número de Seguro Social"},
  "legal_aid.participant.56": {"en": "Replace the number on file", "es": "Reemplazar el número registrado"},
  "legal_aid.participant.57": {"en": "Save securely", "es": "Guardar de forma segura"},
  "legal_aid.participant.58": {"en": "Before you sign, these answers are still needed:", "es": "Antes de firmar, todavía se necesitan estas respuestas:"},
  "legal_aid.participant.59": {"en": "and", "es": "y"},
  "legal_aid.participant.60": {"en": "more", "es": "más"},
  "legal_aid.participant.61": {"en": "Each signature is tied to the statement's wording and to your answers at the moment you sign. If you change an answer afterwards, you will be asked to sign again.", "es": "Cada firma está vinculada al texto de la declaración y a sus respuestas en el momento de firmar. Si después cambia una respuesta, se le pedirá que vuelva a firmar."},
  "legal_aid.participant.62": {"en": "Save your answers first.", "es": "Guarde sus respuestas primero."},
  "legal_aid.participant.63": {"en": "The signature could not be saved.", "es": "No se pudo guardar la firma."},
  "legal_aid.participant.64": {"en": "Signed by", "es": "Firmado por"},
  "legal_aid.participant.65": {"en": "on", "es": "el"},
  "legal_aid.participant.66": {"en": "drawn signature", "es": "firma dibujada"},
  "legal_aid.participant.67": {"en": "typed signature", "es": "firma escrita con el teclado"},
  "legal_aid.participant.68": {"en": "Your full legal name", "es": "Su nombre legal completo"},
  "legal_aid.participant.69": {"en": "Type my name as my signature", "es": "Escribir mi nombre como firma"},
  "legal_aid.participant.70": {"en": "Draw my signature", "es": "Dibujar mi firma"},
  "legal_aid.participant.71": {"en": "Your name", "es": "Su nombre"},
  "legal_aid.participant.72": {"en": "Signing…", "es": "Firmando…"},
  "legal_aid.participant.73": {"en": "Sign this statement", "es": "Firmar esta declaración"},
  "legal_aid.participant.74": {"en": "Photo ID", "es": "Identificación con foto"},
  "legal_aid.participant.75": {"en": "Court record or paperwork", "es": "Registro o documentos judiciales"},
  "legal_aid.participant.76": {"en": "Proof of income or benefits", "es": "Comprobante de ingresos o beneficios"},
  "legal_aid.participant.77": {"en": "Signed document", "es": "Documento firmado"},
  "legal_aid.participant.78": {"en": "Other", "es": "Otro"},
  "legal_aid.participant.79": {"en": "The file could not be uploaded.", "es": "No se pudo cargar el archivo."},
  "legal_aid.participant.80": {"en": "Uploaded.", "es": "Archivo cargado."},
  "legal_aid.participant.81": {"en": "Documents (optional)", "es": "Documentos (opcionales)"},
  "legal_aid.participant.82": {"en": "Add a photo ID, court paperwork, or proof of income if you have them. PDF, JPEG, PNG or WebP, up to 20 MB each. Files are stored privately and only opened by the clinic team assigned to you.", "es": "Agregue una identificación con foto, documentos judiciales o comprobantes de ingresos si los tiene. PDF, JPEG, PNG o WebP, de hasta 20 MB cada uno. Los archivos se guardan de forma privada y solo puede abrirlos el equipo de la clínica asignado a usted."},
  "legal_aid.participant.83": {"en": "Open", "es": "Abrir"},
  "legal_aid.participant.84": {"en": "Remove", "es": "Eliminar"},
  "legal_aid.participant.85": {"en": "Type", "es": "Tipo"},
  "legal_aid.participant.86": {"en": "File", "es": "Archivo"},
  "legal_aid.participant.87": {"en": "Uploading…", "es": "Cargando…"},
  "legal_aid.participant.88": {"en": "Upload", "es": "Cargar"},
  "legal_aid.participant.89": {"en": "Your application has been received", "es": "Se ha recibido su solicitud"},
  "legal_aid.participant.90": {"en": "{partnerName} is reviewing your application", "es": "{partnerName} está revisando su solicitud"},
  "legal_aid.participant.91": {"en": "You are approved for clinic services", "es": "Se le ha aprobado para recibir servicios de la clínica"},
  "legal_aid.participant.92": {"en": "{partnerName} could not accept this application", "es": "{partnerName} no pudo aceptar esta solicitud"},
  "legal_aid.participant.93": {"en": "You have been referred to another resource", "es": "Se le ha referido a otro recurso"},
  "legal_aid.participant.94": {"en": "This application was withdrawn", "es": "Esta solicitud fue retirada"},
  "legal_aid.participant.95": {"en": "You do not need to do anything else right now. {partnerName} will contact you using the details on your registration.", "es": "No necesita hacer nada más por ahora. {partnerName} se comunicará con usted usando los datos de su inscripción."},
  "legal_aid.participant.96": {"en": "Your next steps are listed below. Bring a photo ID to the clinic.", "es": "Sus próximos pasos se indican a continuación. Lleve una identificación con foto a la clínica."},
  "legal_aid.participant.97": {"en": "If you withdrew by mistake, register again or contact the clinic.", "es": "Si retiró la solicitud por error, inscríbase de nuevo o comuníquese con la clínica."},
  "legal_aid.participant.98": {"en": "{partnerName} will explain your options.", "es": "{partnerName} le explicará sus opciones."},
  "legal_aid.participant.99": {"en": "Submitted", "es": "Enviada"},
  "legal_aid.participant.100": {"en": "Your next steps", "es": "Sus próximos pasos"},
  "legal_aid.participant.101": {"en": "· by", "es": "· antes del"},
  "legal_aid.participant.102": {"en": "Your documents", "es": "Sus documentos"},
  "legal_aid.participant.103": {"en": "Your documents on file", "es": "Sus documentos registrados"},
  "legal_aid.participant.104": {"en": "What you told us", "es": "Lo que nos dijo"},
  "legal_aid.participant.105": {"en": "Protected number on file:", "es": "Número protegido registrado:"},
  "legal_aid.participant.106": {"en": "not provided", "es": "no proporcionado"},
  "legal_aid.participant.107": {"en": "Being prepared by the clinic team.", "es": "El equipo de la clínica lo está preparando."},
  "legal_aid.participant.108": {"en": "Reviewed by the attorney. Not yet ready to sign.", "es": "Revisado por el abogado. Todavía no está listo para firmar."},
  "legal_aid.participant.109": {"en": "Ready for you to sign at the clinic.", "es": "Listo para que usted lo firme en la clínica."},
  "legal_aid.participant.110": {"en": "Waiting for signature or notarization.", "es": "Pendiente de firma o notarización."},
  "legal_aid.participant.111": {"en": "Signed copy received; the team is checking it.", "es": "Se recibió la copia firmada; el equipo la está revisando."},
  "legal_aid.participant.112": {"en": "Signed copy checked.", "es": "Copia firmada revisada."},
  "legal_aid.participant.113": {"en": "Ready to file with the court.", "es": "Listo para presentar ante el tribunal."},
  "legal_aid.participant.114": {"en": "Filed with the court.", "es": "Presentado ante el tribunal."},
  "legal_aid.participant.115": {"en": "I don't know", "es": "No sé"},
  "legal_aid.participant.116": {"en": "Not applicable", "es": "No corresponde"},
  "legal_aid.participant.117": {"en": "Clinics", "es": "Clínicas"},
  "legal_aid.participant.118": {"en": "My application", "es": "Mi solicitud"},
  "legal_aid.participant.119": {"en": "Questions?", "es": "¿Tiene preguntas?"},
  "legal_aid.participant.120": {"en": "Application technology provided by LegalEase.", "es": "Tecnología para la solicitud proporcionada por LegalEase."},
  "legal_aid.participant.121": {"en": "decides who it can help; this site does not give legal advice.", "es": "decide a quién puede ayudar; este sitio no brinda asesoría legal."},
  "legal_aid.participant.122": {"en": "The registration could not be cancelled.", "es": "No se pudo cancelar la inscripción."},
  "legal_aid.participant.123": {"en": "Cancel my registration", "es": "Cancelar mi inscripción"},
  "legal_aid.participant.124": {"en": "Cancel your place at this clinic?", "es": "¿Desea cancelar su lugar en esta clínica?"},
  "legal_aid.participant.125": {"en": "Your application answers are kept, but your seat is released to someone else.", "es": "Se conservan las respuestas de su solicitud, pero su lugar queda disponible para otra persona."},
  "legal_aid.participant.126": {"en": "Cancelling…", "es": "Cancelando…"},
  "legal_aid.participant.127": {"en": "Yes, cancel my registration", "es": "Sí, cancelar mi inscripción"},
  "legal_aid.participant.128": {"en": "Keep my place", "es": "Conservar mi lugar"},
  "legal_aid.participant.129": {"en": "Draw your signature", "es": "Dibuje su firma"},
  "legal_aid.participant.130": {"en": "Signature drawn.", "es": "Firma dibujada."},
  "legal_aid.participant.131": {"en": "Sign with your finger, stylus, or mouse.", "es": "Firme con el dedo, un lápiz digital o el ratón."},
  "legal_aid.participant.132": {"en": "Clear", "es": "Borrar"},
  "legal_aid.participant.133": {"en": "← All clinics", "es": "← Todas las clínicas"},
  "legal_aid.participant.134": {"en": "You are registered", "es": "Usted está inscrito"},
  "legal_aid.participant.135": {"en": "You are on the waitlist", "es": "Usted está en la lista de espera"},
  "legal_aid.participant.136": {"en": "Your place is confirmed", "es": "Su lugar está confirmado"},
  "legal_aid.participant.137": {"en": "We have your registration", "es": "Tenemos su inscripción"},
  "legal_aid.participant.138": {"en": "{partnerName} will contact you if a place opens.", "es": "{partnerName} se comunicará con usted si queda un lugar disponible."},
  "legal_aid.participant.139": {"en": "{partnerName} will contact you {contact} with anything you need to bring.", "es": "{partnerName} se comunicará con usted {contact} para indicarle lo que debe llevar."},
  "legal_aid.participant.140": {"en": "Name", "es": "Nombre"},
  "legal_aid.participant.141": {"en": "Contact", "es": "Contacto"},
  "legal_aid.participant.142": {"en": "Next: complete your private application", "es": "Siguiente: complete su solicitud privada"},
  "legal_aid.participant.143": {"en": "Your application asks about your household, income, and your record so the clinic team can prepare. It saves as you go and you can finish it later. Only you sign it.", "es": "Su solicitud pregunta sobre su hogar, sus ingresos y sus antecedentes para que el equipo de la clínica pueda prepararse. Se guarda a medida que avanza y puede terminarla después. Solo usted la firma."},
  "legal_aid.participant.144": {"en": "Start my application", "es": "Comenzar mi solicitud"},
  "legal_aid.participant.145": {"en": "Registration is closed for this clinic", "es": "La inscripción para esta clínica está cerrada"},
  "legal_aid.participant.146": {"en": "Your earlier registration was cancelled.", "es": "Su inscripción anterior fue cancelada."},
  "legal_aid.participant.147": {"en": "See the", "es": "Consulte la"},
  "legal_aid.participant.148": {"en": "list of open clinics", "es": "lista de clínicas disponibles"},
  "legal_aid.participant.149": {"en": "for other dates.", "es": "para ver otras fechas."},
  "legal_aid.participant.150": {"en": "Clinic is full", "es": "La clínica está llena"},
  "legal_aid.participant.151": {"en": "Save your place", "es": "Reserve su lugar"},
  "legal_aid.participant.152": {"en": "Join the waitlist", "es": "Inscribirse en la lista de espera"},
  "legal_aid.participant.153": {"en": "Register", "es": "Inscribirse"},
  "legal_aid.participant.154": {"en": "Your earlier registration was cancelled. Register again to hold a new place.", "es": "Su inscripción anterior fue cancelada. Inscríbase de nuevo para reservar otro lugar."},
  "legal_aid.participant.155": {"en": "by email", "es": "por correo electrónico"},
  "legal_aid.participant.156": {"en": "by phone", "es": "por teléfono"},
  "legal_aid.participant.157": {"en": "by text message", "es": "por mensaje de texto"},
  "legal_aid.participant.158": {"en": "by email or phone", "es": "por correo electrónico o teléfono"},
  "legal_aid.participant.159": {"en": "← My application", "es": "← Mi solicitud"},
  "legal_aid.participant.160": {"en": "Your {partnerName} clinic application", "es": "Su solicitud para la clínica de {partnerName}"},
  "legal_aid.participant.161": {"en": "The clinic schedule is temporarily unavailable. Please try again in a few minutes.", "es": "El calendario de clínicas no está disponible temporalmente. Vuelva a intentarlo en unos minutos."},
  "legal_aid.participant.162": {"en": "Register for an expungement clinic", "es": "Inscribirse en una clínica de eliminación de antecedentes"},
  "legal_aid.participant.163": {"en": "Choose a clinic, save your place, and complete your private application before you arrive.", "es": "Elija una clínica, reserve su lugar y complete su solicitud privada antes de llegar."},
  "legal_aid.participant.164": {"en": "reviews every application and tells you your next step.", "es": "revisa cada solicitud y le indica su próximo paso."},
  "legal_aid.participant.165": {"en": "No clinics are open for registration right now", "es": "No hay clínicas abiertas para inscripción en este momento"},
  "legal_aid.participant.166": {"en": "New clinic dates are added here as soon as", "es": "Aquí se agregan nuevas fechas de clínicas en cuanto"},
  "legal_aid.participant.167": {"en": "opens them.", "es": "las habilita."},
  "legal_aid.participant.168": {"en": "You can also call {phone}.", "es": "También puede llamar al {phone}."},
  "legal_aid.participant.169": {"en": "Continue an application I already started", "es": "Continuar una solicitud que ya comencé"},
  "legal_aid.participant.170": {"en": "Already registered?", "es": "¿Ya se inscribió?"},
  "legal_aid.participant.171": {"en": "Continue my application", "es": "Continuar mi solicitud"},
  "legal_aid.participant.172": {"en": "Format", "es": "Modalidad"},
  "legal_aid.participant.173": {"en": "By appointment", "es": "Con cita"},
  "legal_aid.participant.174": {"en": "Appointments and walk-ins", "es": "Con cita o sin cita"},
  "legal_aid.participant.175": {"en": "Walk in during clinic hours", "es": "Asista sin cita durante el horario de la clínica"},
  "legal_aid.participant.176": {"en": "Cost", "es": "Costo"},
  "legal_aid.participant.177": {"en": "{partnerName} will explain any court costs at the clinic.", "es": "{partnerName} le explicará los costos judiciales que correspondan en la clínica."},
  "legal_aid.participant.178": {"en": "Places", "es": "Lugares"},
  "legal_aid.participant.179": {"en": "Full (waitlist available)", "es": "Lleno (lista de espera disponible)"},
  "legal_aid.participant.180": {"en": "{count} remaining", "es": "{count} disponibles"},
  "legal_aid.participant.181": {"en": "Registration is closed", "es": "La inscripción está cerrada"},
  "legal_aid.participant.182": {"en": "Your application is saved and not yet submitted.", "es": "Su solicitud está guardada y aún no se ha enviado."},
  "legal_aid.participant.183": {"en": "Your application has been received and is waiting for review.", "es": "Se ha recibido su solicitud y está pendiente de revisión."},
  "legal_aid.participant.184": {"en": "The clinic team has asked you for more information.", "es": "El equipo de la clínica le ha pedido más información."},
  "legal_aid.participant.185": {"en": "The clinic team is reviewing your application.", "es": "El equipo de la clínica está revisando su solicitud."},
  "legal_aid.participant.186": {"en": "You are approved for clinic services. See your next steps below.", "es": "Se le ha aprobado para recibir servicios de la clínica. Consulte sus próximos pasos a continuación."},
  "legal_aid.participant.187": {"en": "The clinic team could not accept this application. They will explain your options.", "es": "El equipo de la clínica no pudo aceptar esta solicitud. Le explicará sus opciones."},
  "legal_aid.participant.188": {"en": "The clinic team has referred you to another resource.", "es": "El equipo de la clínica le ha referido a otro recurso."},
  "legal_aid.participant.189": {"en": "You withdrew this application.", "es": "Usted retiró esta solicitud."},
  "legal_aid.participant.190": {"en": "Signed in as", "es": "Sesión iniciada como"},
  "legal_aid.participant.191": {"en": "your account", "es": "su cuenta"},
  "legal_aid.participant.192": {"en": ". Your answers are saved as you go, and only the", "es": ". Sus respuestas se guardan a medida que avanza y solo el equipo de"},
  "legal_aid.participant.193": {"en": "team assigned to your clinic can see them.", "es": "asignado a su clínica puede verlas."},
  "legal_aid.participant.194": {"en": "You have not registered for a clinic yet", "es": "Todavía no se ha inscrito en una clínica"},
  "legal_aid.participant.195": {"en": "Choose a clinic date first. Registration takes about two minutes.", "es": "Primero elija una fecha de clínica. La inscripción toma unos dos minutos."},
  "legal_aid.participant.196": {"en": "See open clinics", "es": "Ver clínicas disponibles"},
  "legal_aid.participant.197": {"en": "Go to my LegalEase briefcase", "es": "Ir a mi Maletín de LegalEase"},
  "legal_aid.participant.198": {"en": "for screening results and prepared documents.", "es": "para ver los resultados de la evaluación y los documentos preparados."},
  "legal_aid.participant.199": {"en": "You have not started your application.", "es": "No ha comenzado su solicitud."},
  "legal_aid.participant.200": {"en": "(by", "es": "(antes del"},
  "legal_aid.participant.201": {"en": "View my application", "es": "Ver mi solicitud"},
  "legal_aid.participant.202": {"en": "Registration confirmed", "es": "Inscripción confirmada"},
  "legal_aid.participant.203": {"en": "On the waitlist", "es": "En la lista de espera"},
  "legal_aid.participant.204": {"en": "Registration cancelled", "es": "Inscripción cancelada"},
  "legal_aid.participant.205": {"en": "Registration not accepted", "es": "Inscripción no aceptada"},
  "legal_aid.participant.206": {"en": "Registration received", "es": "Inscripción recibida"},
  "legal_aid.participant.207": {"en": "Your legal matter", "es": "Su asunto legal"},
  "legal_aid.participant.208": {"en": "Tell MVLP what kind of expungement you are asking about.", "es": "Indique a MVLP sobre qué tipo de eliminación de antecedentes está consultando."},
  "legal_aid.participant.209": {"en": "About you", "es": "Sobre usted"},
  "legal_aid.participant.210": {"en": "Your name, how to reach you, and the details MVLP needs to identify your case.", "es": "Su nombre, cómo comunicarse con usted y los datos que MVLP necesita para identificar su caso."},
  "legal_aid.participant.211": {"en": "Your household and work", "es": "Su hogar y trabajo"},
  "legal_aid.participant.212": {"en": "Who lives with you and where you work. Answer for your household as it is today.", "es": "Quién vive con usted y dónde trabaja. Responda según la situación actual de su hogar."},
  "legal_aid.participant.213": {"en": "Monthly household receipts", "es": "Ingresos mensuales del hogar"},
  "legal_aid.participant.214": {"en": "Enter the monthly amount your household receives in each category. Enter 0 for a category you do not receive. If you do not know an amount, choose \"I don't know\" and MVLP will ask you about it.", "es": "Ingrese la cantidad mensual que recibe su hogar en cada categoría. Ingrese 0 en las categorías en las que no recibe nada. Si no sabe una cantidad, elija «No sé» y MVLP le preguntará al respecto."},
  "legal_aid.participant.215": {"en": "Home and vehicle", "es": "Vivienda y vehículo"},
  "legal_aid.participant.216": {"en": "Whether you own a home or a vehicle, and what they are worth.", "es": "Si tiene una vivienda o un vehículo propios y cuánto valen."},
  "legal_aid.participant.217": {"en": "Bank accounts", "es": "Cuentas bancarias"},
  "legal_aid.participant.218": {"en": "Whether you have a checking or savings account, and the balance.", "es": "Si tiene una cuenta corriente o de ahorros y su saldo."},
  "legal_aid.participant.219": {"en": "Monthly expenses", "es": "Gastos mensuales"},
  "legal_aid.participant.220": {"en": "Enter the monthly amount your household pays in each category. Enter 0 for a category that does not apply.", "es": "Ingrese la cantidad mensual que paga su hogar en cada categoría. Ingrese 0 en las categorías que no correspondan."},
  "legal_aid.participant.221": {"en": "Your case and MVLP", "es": "Su caso y MVLP"},
  "legal_aid.participant.222": {"en": "Anything else about your legal matter, and whether you already have a case with MVLP or an attorney.", "es": "Cualquier otra información sobre su asunto legal y si ya tiene un caso con MVLP o un abogado."},
  "legal_aid.participant.223": {"en": "Read each statement that applies to you and sign it. A volunteer may help you type, but only you sign.", "es": "Lea y firme cada declaración que le corresponda. Un voluntario puede ayudarle a escribir, pero solo usted firma."},
  "legal_aid.participant.224": {"en": "What is your legal matter?", "es": "¿Cuál es su asunto legal?"},
  "legal_aid.participant.225": {"en": "If your matter is not listed, MVLP's direct-representation intake is the right place to start.", "es": "Si su asunto no aparece en la lista, comience con la solicitud de representación directa de MVLP."},
  "legal_aid.participant.226": {"en": "Felony Expungement", "es": "Eliminación de antecedentes de un delito grave"},
  "legal_aid.participant.227": {"en": "Misdemeanor Expungement", "es": "Eliminación de antecedentes de un delito menor"},
  "legal_aid.participant.228": {"en": "First name", "es": "Nombre"},
  "legal_aid.participant.229": {"en": "Last name", "es": "Apellido"},
  "legal_aid.participant.230": {"en": "MVLP asks for this for the expungement court filing and does not use it for any other purpose. It is stored encrypted, shown only to the MVLP attorney or coordinator handling your case, and never appears in ordinary lists, messages, or exports.", "es": "MVLP solicita este número para la presentación de la eliminación de antecedentes ante el tribunal y no lo usa para ningún otro propósito. Se guarda cifrado, solo se muestra al abogado o coordinador de MVLP que atiende su caso y nunca aparece en listas, mensajes ni exportaciones habituales."},
  "legal_aid.participant.231": {"en": "Phone number", "es": "Número de teléfono"},
  "legal_aid.participant.232": {"en": "Address line 1", "es": "Dirección, línea 1"},
  "legal_aid.participant.233": {"en": "Address line 2", "es": "Dirección, línea 2"},
  "legal_aid.participant.234": {"en": "City", "es": "Ciudad"},
  "legal_aid.participant.235": {"en": "State", "es": "Estado"},
  "legal_aid.participant.236": {"en": "ZIP code", "es": "Código postal"},
  "legal_aid.participant.237": {"en": "Are you a U.S. citizen?", "es": "¿Es usted ciudadano de los Estados Unidos?"},
  "legal_aid.participant.238": {"en": "If you answer No or are not sure, MVLP reviews your status privately. You will not be asked to sign a statement that you are a citizen.", "es": "Si responde No o no está seguro, MVLP revisará su situación de forma privada. No se le pedirá que firme una declaración de ciudadanía."},
  "legal_aid.participant.239": {"en": "Yes", "es": "Sí"},
  "legal_aid.participant.240": {"en": "No", "es": "No"},
  "legal_aid.participant.241": {"en": "Do you identify as a:", "es": "¿Se identifica como:"},
  "legal_aid.participant.242": {"en": "Man", "es": "Hombre"},
  "legal_aid.participant.243": {"en": "Woman", "es": "Mujer"},
  "legal_aid.participant.244": {"en": "Prefer not to say", "es": "Prefiero no responder"},
  "legal_aid.participant.245": {"en": "What is your date of birth?", "es": "¿Cuál es su fecha de nacimiento?"},
  "legal_aid.participant.246": {"en": "What is your race?", "es": "¿Cuál es su raza?"},
  "legal_aid.participant.247": {"en": "How many adults live in your household?", "es": "¿Cuántos adultos viven en su hogar?"},
  "legal_aid.participant.248": {"en": "How many children live in your household?", "es": "¿Cuántos niños viven en su hogar?"},
  "legal_aid.participant.249": {"en": "Ages of all members in the household:", "es": "Edades de todos los integrantes del hogar:"},
  "legal_aid.participant.250": {"en": "Number in household who are disabled:", "es": "Número de personas con discapacidad en el hogar:"},
  "legal_aid.participant.251": {"en": "Occupation", "es": "Ocupación"},
  "legal_aid.participant.252": {"en": "Write \"none\" if you are not working.", "es": "Escriba «ninguna» si no está trabajando."},
  "legal_aid.participant.253": {"en": "Employer", "es": "Empleador"},
  "legal_aid.participant.254": {"en": "Write \"none\" if you do not have an employer.", "es": "Escriba «ninguno» si no tiene empleador."},
  "legal_aid.participant.255": {"en": "Monthly Wages", "es": "Salarios mensuales"},
  "legal_aid.participant.256": {"en": "Monthly amount in dollars. Enter 0 if none.", "es": "Cantidad mensual en dólares. Ingrese 0 si no hay ninguna."},
  "legal_aid.participant.257": {"en": "Disability", "es": "Beneficios por discapacidad"},
  "legal_aid.participant.258": {"en": "Food Stamps", "es": "Asistencia alimentaria"},
  "legal_aid.participant.259": {"en": "Unemployment", "es": "Beneficios por desempleo"},
  "legal_aid.participant.260": {"en": "TANF", "es": "TANF"},
  "legal_aid.participant.261": {"en": "Pension/Retirement", "es": "Pensión o jubilación"},
  "legal_aid.participant.262": {"en": "Assistance from family or friends", "es": "Ayuda de familiares o amigos"},
  "legal_aid.participant.263": {"en": "Do you own a home?", "es": "¿Tiene una vivienda propia?"},
  "legal_aid.participant.264": {"en": "Do you own a vehicle?", "es": "¿Tiene un vehículo propio?"},
  "legal_aid.participant.265": {"en": "If so, what is the value of your home?", "es": "Si es así, ¿cuánto vale su vivienda?"},
  "legal_aid.participant.266": {"en": "Your best estimate in dollars.", "es": "Su mejor estimación en dólares."},
  "legal_aid.participant.267": {"en": "Is this your main/principal residence?", "es": "¿Es esta su residencia principal?"},
  "legal_aid.participant.268": {"en": "If so, what is the value of your vehicle?", "es": "Si es así, ¿cuánto vale su vehículo?"},
  "legal_aid.participant.269": {"en": "Is this your main/principal vehicle?", "es": "¿Es este su vehículo principal?"},
  "legal_aid.participant.270": {"en": "Do you own a checking account?", "es": "¿Tiene una cuenta corriente?"},
  "legal_aid.participant.271": {"en": "If so, how much is in this account?", "es": "Si es así, ¿cuánto dinero hay en esta cuenta?"},
  "legal_aid.participant.272": {"en": "Current balance in dollars.", "es": "Saldo actual en dólares."},
  "legal_aid.participant.273": {"en": "Do you own a savings account?", "es": "¿Tiene una cuenta de ahorros?"},
  "legal_aid.participant.274": {"en": "Rent/Mortgage", "es": "Alquiler o hipoteca"},
  "legal_aid.participant.275": {"en": "Child Support", "es": "Manutención de menores"},
  "legal_aid.participant.276": {"en": "Medical", "es": "Gastos médicos"},
  "legal_aid.participant.277": {"en": "Nursing Home/Medical Home Care", "es": "Residencia de cuidados o atención médica en el hogar"},
  "legal_aid.participant.278": {"en": "Taxes", "es": "Impuestos"},
  "legal_aid.participant.279": {"en": "Child Care", "es": "Cuidado de niños"},
  "legal_aid.participant.280": {"en": "Transportation", "es": "Transporte"},
  "legal_aid.participant.281": {"en": "Employment Related", "es": "Gastos relacionados con el empleo"},
  "legal_aid.participant.282": {"en": "Additional information regarding your legal matter:", "es": "Información adicional sobre su asunto legal:"},
  "legal_aid.participant.283": {"en": "Do you currently have a case open with MVLP?", "es": "¿Tiene actualmente un caso abierto con MVLP?"},
  "legal_aid.participant.284": {"en": "Do you currently have an attorney?", "es": "¿Tiene actualmente un abogado?"},
  "legal_aid.participant.285": {"en": "How did you hear about the clinic?", "es": "¿Cómo se enteró de la clínica?"},
  "legal_aid.participant.286": {"en": "Financial statement", "es": "Declaración financiera"},
  "legal_aid.participant.287": {"en": "I confirm that the financial information in this application and the facts I have given about my legal problem are true and accurate to the best of my knowledge.", "es": "Confirmo que la información financiera de esta solicitud y los hechos que he proporcionado sobre mi problema legal son verdaderos y exactos según mi leal saber y entender."},
  "legal_aid.participant.288": {"en": "Citizenship statement", "es": "Declaración de ciudadanía"},
  "legal_aid.participant.289": {"en": "I am a citizen of the United States of America.", "es": "Soy ciudadano de los Estados Unidos de América."},
  "legal_aid.participant.290": {"en": "Confidential status review", "es": "Revisión confidencial de su situación"},
  "legal_aid.participant.291": {"en": "I answered that I am not a U.S. citizen, or I am not sure. I understand that MVLP will review my status privately to decide whether it can help me, and that I am not being asked to sign a statement that I am a citizen.", "es": "Respondí que no soy ciudadano de los Estados Unidos o que no estoy seguro. Entiendo que MVLP revisará mi situación de forma privada para decidir si puede ayudarme y que no se me pide firmar una declaración de que soy ciudadano."},
  "legal_aid.participant.292": {"en": "Who may see this application", "es": "Quién puede ver esta solicitud"},
  "legal_aid.participant.293": {"en": "I agree that MVLP staff and volunteer attorneys assigned to my clinic may review my application and documents to decide whether MVLP can help me and to prepare my documents. My answers are not shared with other participants, other organizations, or anyone who is not assigned to my clinic.", "es": "Acepto que el personal y los abogados voluntarios de MVLP asignados a mi clínica revisen mi solicitud y mis documentos para decidir si MVLP puede ayudarme y para preparar mis documentos. Mis respuestas no se comparten con otros participantes, otras organizaciones ni ninguna persona que no esté asignada a mi clínica."},
  "legal_aid.participant.294": {"en": "Please answer this question.", "es": "Responda esta pregunta."},
  "legal_aid.participant.295": {"en": "This question applies to you; please answer it.", "es": "Esta pregunta le corresponde; respóndala."},
  "legal_aid.participant.296": {"en": "Enter a dollar amount, such as 0 or 850.50.", "es": "Ingrese una cantidad en dólares, como 0 u 850.50."},
  "legal_aid.participant.297": {"en": "Enter a whole number, such as 0, 1, or 2.", "es": "Ingrese un número entero, como 0, 1 o 2."},
  "legal_aid.participant.298": {"en": "Enter a date as year, month, and day.", "es": "Ingrese una fecha en el orden año, mes y día."},
  "legal_aid.participant.299": {"en": "The date cannot be in the future.", "es": "La fecha no puede ser futura."},
  "legal_aid.participant.300": {"en": "Enter a phone number with area code.", "es": "Ingrese un número de teléfono con código de área."},
  "legal_aid.participant.301": {"en": "Enter a valid email address.", "es": "Ingrese una dirección de correo electrónico válida."},
  "legal_aid.participant.302": {"en": "Choose one of the listed options.", "es": "Elija una de las opciones de la lista."},
  "legal_aid.participant.303": {"en": "Please shorten this to 4,000 characters.", "es": "Reduzca este texto a 4,000 caracteres."},
  "legal_aid.participant.304": {"en": "Please shorten this answer.", "es": "Acorte esta respuesta."},
  "legal_aid.participant.305": {"en": "Clinic services require configured Supabase services.", "es": "Los servicios de la clínica no están disponibles en este momento."},
  "legal_aid.participant.306": {"en": "Registration could not be saved. Nothing was recorded; please try again.", "es": "No se pudo guardar la inscripción. No se registró nada; vuelva a intentarlo."},
  "legal_aid.participant.307": {"en": "Registration could not be saved.", "es": "No se pudo guardar la inscripción."},
  "legal_aid.participant.308": {"en": "The registration could not be updated.", "es": "No se pudo actualizar la inscripción."},
  "legal_aid.participant.309": {"en": "You cannot change this registration.", "es": "Usted no puede cambiar esta inscripción."},
  "legal_aid.participant.310": {"en": "Registration was not found.", "es": "No se encontró la inscripción."},
  "legal_aid.participant.311": {"en": "Choose a clinic.", "es": "Elija una clínica."},
  "legal_aid.participant.312": {"en": "Enter your name.", "es": "Ingrese su nombre."},
  "legal_aid.participant.313": {"en": "Enter an email address or a phone number so MVLP can reach you.", "es": "Ingrese una dirección de correo electrónico o un número de teléfono para que MVLP pueda comunicarse con usted."},
  "legal_aid.participant.314": {"en": "Choose how MVLP should contact you.", "es": "Elija cómo debe comunicarse MVLP con usted."},
  "legal_aid.participant.315": {"en": "Enter an email address, or choose a different way to be contacted.", "es": "Ingrese una dirección de correo electrónico o elija otra forma de contacto."},
  "legal_aid.participant.316": {"en": "Enter a phone number, or choose a different way to be contacted.", "es": "Ingrese un número de teléfono o elija otra forma de contacto."},
  "legal_aid.participant.317": {"en": "Your answers could not be saved. Nothing was lost on your screen; please try again.", "es": "No se pudieron guardar sus respuestas. No se perdió nada de su pantalla; vuelva a intentarlo."},
  "legal_aid.participant.318": {"en": "Enter a nine-digit Social Security number.", "es": "Ingrese un número de Seguro Social de nueve dígitos."},
  "legal_aid.participant.319": {"en": "The protected field is not available right now. Your other answers are saved; please try this step again later.", "es": "No se puede guardar el número protegido en este momento. Sus otras respuestas están guardadas; vuelva a intentar este paso más tarde."},
  "legal_aid.participant.320": {"en": "The protected field is not available right now.", "es": "No se puede guardar el número protegido en este momento."},
  "legal_aid.participant.321": {"en": "You cannot change this field.", "es": "Usted no puede cambiar este dato."},
  "legal_aid.participant.322": {"en": "The application is no longer editable.", "es": "Ya no se puede modificar la solicitud."},
  "legal_aid.participant.323": {"en": "The protected field could not be saved.", "es": "No se pudo guardar el número protegido."},
  "legal_aid.participant.324": {"en": "Type your full name to sign.", "es": "Escriba su nombre completo para firmar."},
  "legal_aid.participant.325": {"en": "Draw your signature to continue.", "es": "Dibuje su firma para continuar."},
  "legal_aid.participant.326": {"en": "Only the applicant can sign this statement.", "es": "Solo la persona solicitante puede firmar esta declaración."},
  "legal_aid.participant.327": {"en": "Answer the questions before signing.", "es": "Responda las preguntas antes de firmar."},
  "legal_aid.participant.328": {"en": "Your application could not be submitted. Please try again.", "es": "No se pudo enviar su solicitud. Vuelva a intentarlo."},
  "legal_aid.participant.329": {"en": "The file is empty.", "es": "El archivo está vacío."},
  "legal_aid.participant.330": {"en": "The file is larger than 20 MB.", "es": "El archivo supera los 20 MB."},
  "legal_aid.participant.331": {"en": "Upload a PDF, JPEG, PNG, or WebP file.", "es": "Cargue un archivo PDF, JPEG, PNG o WebP."},
  "legal_aid.participant.332": {"en": "The file's type does not match its contents.", "es": "El tipo de archivo no coincide con su contenido."},
  "legal_aid.participant.333": {"en": "Document storage requires configured Supabase services.", "es": "No se pueden guardar documentos en este momento."},
  "legal_aid.participant.334": {"en": "Choose a document type.", "es": "Elija un tipo de documento."},
  "legal_aid.participant.335": {"en": "The document could not be stored.", "es": "No se pudo guardar el documento."},
  "legal_aid.participant.336": {"en": "You cannot add this document.", "es": "Usted no puede agregar este documento."},
  "legal_aid.participant.337": {"en": "The document could not be recorded.", "es": "No se pudo registrar el documento."},
  "legal_aid.participant.338": {"en": "Protected storage is not configured in this environment.", "es": "El almacenamiento protegido no está disponible en este momento."},
  "legal_aid.participant.339": {"en": "The request could not be completed.", "es": "No se pudo completar la solicitud."},
  "legal_aid.participant.340": {"en": "This clinic is not open for registration.", "es": "Esta clínica no está abierta para inscripción."},
  "legal_aid.participant.341": {"en": "Registration for this clinic has closed.", "es": "La inscripción para esta clínica ha cerrado."},
  "legal_aid.participant.342": {"en": "Register for the clinic before starting your application.", "es": "Inscríbase en la clínica antes de comenzar su solicitud."},
  "legal_aid.participant.343": {"en": "This clinic is not accepting applications.", "es": "Esta clínica no está aceptando solicitudes."},
  "legal_aid.participant.344": {"en": "This application has been submitted and can no longer be edited.", "es": "Esta solicitud se ha enviado y ya no se puede modificar."},
  "legal_aid.participant.345": {"en": "Application was not found.", "es": "No se encontró la solicitud."},
  "legal_aid.participant.346": {"en": "Only the applicant can submit.", "es": "Solo la persona solicitante puede enviar la solicitud."},
  "legal_aid.participant.347": {"en": "Some required answers are missing or need a correction.", "es": "Faltan algunas respuestas obligatorias o es necesario corregirlas."},
  "legal_aid.participant.348": {"en": "Enter your Social Security number in the protected step before submitting.", "es": "Ingrese su número de Seguro Social en el paso de información protegida antes de enviar la solicitud."},
  "legal_aid.participant.349": {"en": "Sign each statement that applies to you before submitting.", "es": "Firme cada declaración que le corresponda antes de enviar la solicitud."},
  "legal_aid.participant.350": {"en": "Answer the questions before submitting.", "es": "Responda las preguntas antes de enviar la solicitud."},
  "legal_aid.participant.351": {"en": "This application was withdrawn.", "es": "Esta solicitud fue retirada."},
  "legal_aid.participant.352": {"en": "Choose a file to upload.", "es": "Elija un archivo para cargar."},

  "signin.pending_claim_error": { en: "You are signed in, but we could not save your result yet. Retry saving it. Your preliminary result is still waiting for you.", es: "Ha iniciado sesión, pero todavía no pudimos guardar su resultado. Vuelva a intentar guardarlo. Su resultado preliminar sigue disponible." },
  "signin.javascript_required": { en: "Enable JavaScript to sign in securely.", es: "Active JavaScript para iniciar sesión de forma segura." },
  "signin.secure_link_sent": { en: "Check your email for a secure sign-in link. Your saved result will still be here.", es: "Revise su correo electrónico para encontrar un enlace seguro de inicio de sesión. Su resultado guardado seguirá aquí." },
  "signin.retrying": { en: "Retrying...", es: "Reintentando..." },
  "signin.retry_save": { en: "Retry saving my result", es: "Reintentar guardar mi resultado" },
  "signin.sending_secure_link": { en: "Sending secure link...", es: "Enviando enlace seguro..." },
  "signin.email_secure_link": { en: "Email me a secure sign-in link", es: "Enviar un enlace seguro de inicio de sesión a mi correo" },
  "signin.opening_google": { en: "Opening Google...", es: "Abriendo Google..." },
  "signin.continue_google": { en: "Continue with Google", es: "Continuar con Google" },
  "signin.passwordless.error": { en: "We could not sign you in. Check your email and try again.", es: "No pudimos iniciar sesión. Revise su correo electrónico e inténtelo de nuevo." },
  "signin.captcha_failure": { en: "Please complete the security check and try again.", es: "Complete la verificación de seguridad e inténtelo de nuevo." },
  "clinic.assistance.staff_error": { en: "Approved staff for this event are required.", es: "Se requiere personal autorizado para este evento." },
  "clinic.assistance.capacity_error": { en: "Sponsor capacity could not be confirmed. Please retry.", es: "No se pudo confirmar la disponibilidad de cupos patrocinados. Vuelva a intentarlo." },
  "legal_aid.device_reset_required": { en: "Complete device recovery before opening Legal Aid records.", es: "Complete la recuperación segura del dispositivo antes de abrir los registros de Legal Aid." },
  "clinic.verification.prepare_error": { en: "We verified your facts, but could not prepare the clinic packet right now. Try again from this review.", es: "Verificamos sus datos, pero no pudimos preparar el paquete de la clínica en este momento. Vuelva a intentarlo desde esta revisión." },
  "clinic.admission.unavailable": {en: "This isn’t available yet. Your information is saved in your Briefcase.", es: "Esto aún no está disponible. Su información está guardada en su Maletín."},
  "clinic.admission.stale": {en: "We’re re-checking this route. Your information is saved. Please try again shortly.", es: "Estamos revisando esta vía. Su información está guardada; vuelva a intentarlo en unos momentos."},
  "clinic.admission.updated": {en: "This route was just updated. Please try again.", es: "Esta vía se acaba de actualizar. Vuelva a intentarlo."},
  "clinic.cap.title": {en: "Sponsored coverage is unavailable", es: "La cobertura del patrocinador no está disponible"},
  "clinic.cap.body": {en: "This sponsor has reached its capacity. You can continue through the standard consumer service. Screening is free; an eligible packet costs $50 after required information and verification. The sponsor will not pay for this packet.", es: "Este patrocinador ha agotado su capacidad. Puede continuar con el servicio habitual para consumidores. La evaluación es gratuita; un paquete elegible cuesta $50 después de completar la información requerida y la verificación. El patrocinador no pagará este paquete."},
  "clinic.cap.continue": {en: "Continue with standard consumer service", es: "Continuar con el servicio habitual para consumidores"},

  "clinic.participant.0": {en: "Clinic entry is temporarily unavailable.", es: "El acceso a la clínica no está disponible temporalmente."},
  "clinic.participant.1": {en: "Event-specific access", es: "Acceso para este evento"},
  "clinic.participant.2": {en: "Enter this Clinic", es: "Entrar a esta clínica"},
  "clinic.participant.3": {en: "Enter the code provided by Clinic staff. The code is checked by the server and cannot grant access to another event or organization.", es: "Ingrese el código que le dio el personal de la clínica. El sistema lo verifica y no permite acceder a otro evento u organización."},
  "clinic.participant.4": {en: "Screening is free", es: "La evaluación es gratuita"},
  "clinic.participant.5": {en: ", and the partner covers the packet. You will use your own account and keep ownership of your matter.", es: ", y la organización paga el paquete. Usted usará su propia cuenta y seguirá siendo titular de su asunto."},
  "clinic.participant.6": {en: "Have your court or arrest records ready. A volunteer can help you find and enter record facts, but LegalEase does not file the packet or guarantee relief.", es: "Tenga a mano sus registros judiciales o de arresto. Un voluntario puede ayudarle a buscar e ingresar los datos, pero LegalEase no presenta el paquete ante el tribunal ni garantiza el resultado."},
  "clinic.participant.7": {en: "Event access code", es: "Código de acceso al evento"},
  "clinic.participant.8": {en: "Checking event…", es: "Verificando el evento…"},
  "clinic.participant.9": {en: "Continue to participant consent", es: "Continuar al consentimiento del participante"},
  "clinic.participant.10": {en: "Each participant signs in to their own account. Clinic staff assistance does not transfer ownership of the participant's matter or Briefcase.", es: "Cada participante inicia sesión en su propia cuenta. La asistencia del personal de la clínica no transfiere la titularidad del asunto ni del Maletín del participante."},
  "clinic.participant.11": {en: "The assisted session could not be started.", es: "No se pudo iniciar la sesión de asistencia."},
  "clinic.participant.12": {en: "Participant-owned assistance", es: "Asistencia bajo el control del participante"},
  "clinic.participant.13": {en: "Consent to Clinic staff assistance", es: "Consentimiento para recibir asistencia del personal de la clínica"},
  "clinic.participant.14": {en: "You remain the owner of your account, screening, matter, documents, and Briefcase. The approved staff member may help during this time-limited session only. Ending the Clinic session removes their assistance access.", es: "Usted sigue siendo titular de su cuenta, evaluación, asunto, documentos y Maletín. El personal autorizado solo puede ayudarle durante esta sesión de duración limitada. Finalizar la sesión de la clínica elimina su acceso de asistencia."},
  "clinic.participant.15": {en: "Assisting staff member", es: "Persona del equipo que le ayudará"},
  "clinic.participant.16": {en: "Select approved staff", es: "Seleccione personal autorizado"},
  "clinic.participant.17": {en: "State or jurisdiction", es: "Estado o jurisdicción"},
  "clinic.participant.18": { en: " - fixed by this clinic event", es: " - fijado para este evento de la clínica" },
  "clinic.participant.19": {en: "Select state", es: "Seleccione un estado"},
  "clinic.participant.20": {en: "I consent to assistance for this Clinic session.", es: "Doy mi consentimiento para recibir asistencia durante esta sesión de la clínica."},
  "clinic.participant.21": {en: " I understand I can end assistance at any time, and Clinic staff do not receive permanent access to my matter.", es: " Entiendo que puedo finalizar la asistencia en cualquier momento y que el personal de la clínica no recibe acceso permanente a mi asunto."},
  "clinic.participant.22": {en: "Starting secure session…", es: "Iniciando la sesión segura…"},
  "clinic.participant.23": { en: "Start screening with assistance", es: "Iniciar la evaluación con asistencia" },
  "clinic.participant.scope_missing": { en: "This event has no authorized screening jurisdiction. Ask the event coordinator to correct the event scope.", es: "Este evento no tiene una jurisdicción autorizada para la evaluación. Pida al coordinador que corrija el alcance del evento." },
  "clinic.participant.staff_missing": { en: "No approved assistance staff are available. Ask the event coordinator for help.", es: "No hay personal de asistencia autorizado disponible. Pida ayuda al coordinador del evento." },
  "clinic.participant.24": {en: "Open your Clinic event", es: "Abra el evento de su clínica"},
  "clinic.participant.25": {en: "Use the event link or QR code provided by Clinic staff. Confirm the event name before the next participant signs in.", es: "Use el enlace o código QR del evento que le dio el personal de la clínica. Confirme el nombre del evento antes de que el siguiente participante inicie sesión."},
  "clinic.participant.26": {en: "If the original event is no longer available, ask staff which event to use. This page does not restore an assisted session or participant data.", es: "Si el evento original ya no está disponible, pregunte al personal qué evento debe usar. Esta página no restaura una sesión de asistencia ni los datos de un participante."},
  "clinic.participant.27": {en: "Event address name provided by staff", es: "Nombre del evento en la dirección web que le dio el personal"},
  "clinic.participant.28": {en: "Open event", es: "Abrir evento"},
  "clinic.participant.29": {en: "That event is not available. Ask Clinic staff for the current event link.", es: "Ese evento no está disponible. Pida al personal de la clínica el enlace actual."},
  "clinic.participant.30": { en: "Dedicated Clinic Mode", es: "Modo exclusivo de clínica" },
  "clinic.participant.31": {en: "Privacy rule", es: "Regla de privacidad"},
  "clinic.participant.32": {en: "One participant per session. Reset the device before the next person.", es: "Un participante por sesión. Restablezca el dispositivo antes de que lo use la siguiente persona."},
  "clinic.error.0": {en: "A valid event code is required.", es: "Se requiere un código de evento válido."},
  "clinic.error.1": {en: "That event code is invalid, unavailable, or the event is full.", es: "Ese código no es válido, no está disponible o el evento está lleno."},
  "clinic.error.2": {en: "Finish resetting this device before starting another participant.", es: "Termine de restablecer este dispositivo antes de comenzar con otro participante."},
  "clinic.error.3": {en: "Participant sign-in is required.", es: "El participante debe iniciar sesión."},
  "clinic.error.4": { en: "Consent, approved staff, and a state are required.", es: "Debe dar su consentimiento, seleccionar personal autorizado y elegir un estado." },
  "clinic.error.5": {en: "This Clinic event is fixed to another jurisdiction.", es: "Este evento de la clínica está limitado a otra jurisdicción."},
  "clinic.error.6": {en: "Sponsored screening capacity is full.", es: "No quedan cupos para evaluaciones patrocinadas."},
  "clinic.error.7": {en: "The partner screening is unavailable.", es: "La evaluación de la organización no está disponible."},
  "clinic.error.8": {en: "Clinic assistance is temporarily unavailable.", es: "La asistencia de la clínica no está disponible temporalmente."},
  "clinic.error.9": {en: "Assisted session could not be started.", es: "No se pudo iniciar la sesión de asistencia."},
  "clinic.error.10": { en: "We could not link your account to this Clinic case.", es: "No pudimos vincular su cuenta con este caso de la clínica." },
  "clinic.error.11": {en: "The Clinic entry handoff is invalid or expired.", es: "El acceso a la sesión de la clínica no es válido o ha vencido."},
  "clinic.context.0": {en: "signed in participant", es: "participante con sesión iniciada"},
  "clinic.context.1": {en: "Clinic assistance is time-limited.", es: "La asistencia de la clínica tiene una duración limitada."},
  "clinic.context.2": {en: " Your signed-in account remains the owner of this screening and any saved matter.", es: " Su cuenta sigue siendo titular de esta evaluación y de cualquier asunto guardado."},
  "clinic.context.3": {en: "Approved staff {number}", es: "Personal autorizado {number}"},
  "clinic.recovery.0": {en: "Shared-device privacy is active", es: "La privacidad del dispositivo compartido está activa"},
  "clinic.recovery.1": { en: "Device recovery is required. Assistance may have expired or a previous reset may be incomplete. Keep this device locked until reset is confirmed.", es: "Se requiere completar la recuperación del dispositivo. Es posible que la asistencia haya vencido o que un restablecimiento anterior haya quedado incompleto. Mantenga este dispositivo bloqueado hasta que se confirme el restablecimiento." },
  "clinic.recovery.2": {en: "This device is locked until the interrupted reset is completed. Retry reset.", es: "Este dispositivo está bloqueado hasta que se complete el restablecimiento interrumpido. Vuelva a intentarlo."},
  "clinic.recovery.3": { en: "Ending the participant session and clearing participant data from this device…", es: "Finalizando la sesión del participante y borrando los datos locales de este dispositivo…" },
  "clinic.recovery.4": {en: "Reset needs the original participant or approved event staff to sign in. This device remains locked.", es: "Para restablecer, debe iniciar sesión el participante original o personal autorizado del evento. Este dispositivo permanece bloqueado."},
  "clinic.recovery.5": { en: "The original access for this Clinic session cannot be verified. Keep this device locked and ask approved event staff for help. If that access cannot be verified, reset will remain blocked.", es: "No se puede verificar el acceso original de esta sesión de la clínica. Mantenga este dispositivo bloqueado y pida ayuda al personal autorizado del evento. Si ese acceso no puede verificarse, el restablecimiento seguirá bloqueado." },
  "clinic.recovery.6": {en: "Reset is incomplete. This device is locked. Retry before handing it to another participant.", es: "El restablecimiento está incompleto. Este dispositivo está bloqueado. Vuelva a intentarlo antes de entregarlo a otro participante."},
  "clinic.recovery.7": { en: "Reset after every participant. Inactivity automatically ends the session after 15 minutes.", es: "Restablezca después de cada participante. Después de 15 minutos de inactividad, la sesión finaliza automáticamente." },
  "clinic.recovery.8": { en: "Retry device reset", es: "Reintentar el restablecimiento del dispositivo" },
  "clinic.recovery.9": {en: "End clinic session / Reset device", es: "Finalizar sesión de la clínica / Restablecer dispositivo"},
  "clinic.recovery.10": {en: "Original participant: sign in to finish reset", es: "Participante original: inicie sesión para completar el restablecimiento"},
  "clinic.recovery.11": { en: "Approved event staff: sign in with your own account to recover this device", es: "Personal autorizado del evento: inicie sesión con su propia cuenta para completar el restablecimiento de este dispositivo" },
  "clinic.recovery.12": { en: "Staff recovery only ends the verified Clinic session. It does not open participant documents or resume assistance.", es: "La recuperación por parte del personal solo finaliza la sesión verificada de la clínica. No abre documentos del participante ni reanuda la asistencia." },
  "signin.loading_secure": { en: "Loading secure sign-in. If the controls stay unavailable, reload this page. Do not enter credentials until the controls are ready.", es: "Cargando el inicio de sesión seguro. Si los controles siguen deshabilitados, vuelva a cargar esta página. No ingrese sus credenciales hasta que los controles estén listos." },
  "commercial.unavailable": { en: "Packet not available yet", es: "Paquete aún no disponible" },
  "commercial.unavailable_detail": { en: "A packet is not available for this route yet. Your eligibility result and saved information remain available.", es: "Aún no hay un paquete disponible para esta ruta. Su resultado de elegibilidad y su información guardada siguen disponibles." },
  "commercial.screening_unavailable": { en: "Your answers may match a record-clearing route. A packet is not available for this route yet. You can still save your result.", es: "Sus respuestas pueden coincidir con una ruta de limpieza de antecedentes. Aún no hay un paquete disponible para esta ruta. Puede guardar su resultado." },
  "commercial.planned_components": { en: "These are the planned packet components for this route. A packet is not available yet.", es: "Estos son los componentes previstos del paquete para esta ruta. El paquete aún no está disponible." },
  "commercial.sponsor_context": { en: "Your partner program information is saved. Packet coverage is confirmed before preparation.", es: "La información de su programa asociado está guardada. La cobertura del paquete se confirma antes de prepararlo." },
  "commercial.sponsor_confirmation": { en: "Packet coverage is confirmed before preparation.", es: "La cobertura del paquete se confirma antes de prepararlo." },
  "commercial.open_matter": { en: "Open your Briefcase to review packet availability and the next steps for this result.", es: "Abra su Portafolio para revisar la disponibilidad del paquete y los próximos pasos para este resultado." },
  "commercial.saved_result": { en: "Your eligibility result and saved information remain available. There is no packet to purchase for this route yet.", es: "Su resultado de elegibilidad y su información guardada siguen disponibles. Aún no hay un paquete para comprar para esta ruta." },
  "commercial.generation_confirmation": { en: "Packet generation is available only after the server confirms this matter can be prepared.", es: "La preparación del paquete solo está disponible después de que el servidor confirme que este asunto puede prepararse." },

  "common.free": { en: "Free", es: "Gratis" },
  "common.continue": { en: "Continue", es: "Continuar" },
  "common.back": { en: "Back", es: "Atrás" },
  "common.optional": { en: "Optional", es: "Opcional" },

  // Packet-information completion. PRODUCT_CONTRACT.md Stage 6 fixes both of
  // these vocabularies: the four section statuses, and autosave copy that is
  // only ever shown once the server has confirmed the write.
  "packet.eyebrow": { en: "Packet information", es: "Información del paquete" },
  "packet.saving": { en: "Saving...", es: "Guardando..." },
  "packet.saved": { en: "Saved", es: "Guardado" },
  "packet.save_failed": { en: "Could not save. Try again.", es: "No se pudo guardar. Inténtelo de nuevo." },
  "packet.section.not_started": { en: "Not started", es: "Sin comenzar" },
  "packet.section.in_progress": { en: "In progress", es: "En curso" },
  "packet.section.complete": { en: "Complete", es: "Completo" },
  "packet.section.needs_attention": { en: "Needs attention", es: "Requiere atención" },
  "common.next_steps": { en: "Next steps", es: "Próximos pasos" },
  "common.why": { en: "Why", es: "Por qué" },
  "common.download": { en: "Download", es: "Descargar" },
  "common.open_matter": { en: "Open matter", es: "Abrir asunto" },
  "common.ask_wilma": { en: "Ask Wilma", es: "Preguntar a Wilma" },
  "common.try_again": { en: "Try again", es: "Intentar de nuevo" },
  "common.sign_in": { en: "Sign in", es: "Iniciar sesión" },
  "common.sign_out": { en: "Sign out", es: "Cerrar sesión" },
  "common.email": { en: "Email", es: "Correo electrónico" },
  "common.password": { en: "Password", es: "Contraseña" },
  "common.show": { en: "Show", es: "Mostrar" },
  "common.hide": { en: "Hide", es: "Ocultar" },
  "common.support": { en: "Support", es: "Ayuda" },

  // The language control on the inner consumer surfaces. It exists here, and
  // not only on the landing header, because a participant who arrives straight
  // at a screening, sign-in or Briefcase link never passes the landing page: if
  // the only way to choose Spanish is a control they never see, the journey has
  // an English-only fallback for exactly the people it was written for.
  "common.language_selector": { en: "Choose language", es: "Elegir idioma" },
  "common.language_english": { en: "Use English", es: "Usar inglés" },
  "common.language_spanish": { en: "Usar español", es: "Usar español" },

  // The packet-ready result. These four steps and the price block are fixed
  // interface copy, not engine text, so they belong here: rendered through
  // `safeUserFacingEngineText` they stayed English in Spanish, which put the
  // price and the order of payment in front of a Spanish-speaking participant
  // in a language they may not read. The English is unchanged.
  "result.next_step.save": {
    en: "Save this result to your free Briefcase.",
    es: "Guarde este resultado en su Maletín gratuito."
  },
  "result.next_step.complete_packet_information": {
    en: "Complete the packet information.",
    es: "Complete la información del paquete."
  },
  "result.next_step.verify_before_payment": {
    en: "Verify the packet facts before payment or covered generation.",
    es: "Verifique los datos del paquete antes del pago o de la generación cubierta."
  },
  "result.next_step.filing_checklist": {
    en: "Read the filing checklist before you file anything with the court.",
    es: "Lea la lista de presentación antes de presentar algo ante el tribunal."
  },
  "result.price_line": {
    en: "$50 one time when you are ready to generate this packet",
    es: "$50 una sola vez cuando esté listo para generar este paquete"
  },
  "result.price_sequence": {
    en: "Save the matter to your free Briefcase, complete the packet information, and review it before payment.",
    es: "Guarde el asunto en su Maletín gratuito, complete la información del paquete y revísela antes del pago."
  },

  // Nevada NRS 176A.245 / .265 / .295, both branch results.
  //
  // These are engine reason texts, not interface chrome, and they reach the
  // participant through `safeUserFacingEngineText` -> `resolveRuntimeText`,
  // which matches on the exact English. The English below is byte-identical to
  // `NEVADA_176A_SUBSECTION_1_GUIDANCE` and `NEVADA_176A_UNRESOLVED_BRANCH_TEXT`
  // in src/lib/rcap-engine/nevada-176a-branch.ts; a control asserts that, so the
  // two cannot drift into a silent English-only fallback.
  //
  // The first one is the entire answer for a participant whose relief is
  // automatic: it is what they get instead of a packet, and leaving it English
  // would tell a Spanish-speaking participant nothing about relief they are
  // already entitled to and need pay nothing for.
  "result.nv.176a_subsection_1_automatic": {
    en: "Nevada seals this kind of case automatically. This applies after you are discharged from probation or your case is dismissed after the treatment program. Under NRS 176A.245, 176A.265, or 176A.295, the justice court, municipal court, or district court that handled your case must order the records sealed without a hearing unless the Nevada Division of Parole and Probation petitions the court, for good cause, not to seal the records and requests a hearing. You do not file a petition, you do not need a packet, and there is nothing to pay. If the record still shows the case, contact the court that supervised the program. That court holds the sealing order and is the only body that can act. You can also contact Nevada Legal Services.",
    es: "Nevada sella automáticamente este tipo de caso. Esto se aplica después de que se haya dado por terminada su libertad condicional o de que su caso haya sido desestimado después del programa de tratamiento. Conforme a las NRS 176A.245, 176A.265 o 176A.295, el tribunal de justicia, el tribunal municipal o el tribunal de distrito que atendió su caso debe ordenar que se sellen los antecedentes sin audiencia, salvo que la Nevada Division of Parole and Probation solicite al tribunal, por causa justificada, que no los selle y pida una audiencia. Usted no presenta una petición, no necesita un paquete y no hay nada que pagar. Si el antecedente todavía muestra el caso, comuníquese con el tribunal que supervisó el programa. Ese tribunal tiene la orden de sellado y es el único que puede actuar. También puede comunicarse con Nevada Legal Services."
  },
  "result.nv.176a_branch_not_established": {
    en: "Nevada has two different mechanisms for this kind of case, and which one applies depends on what you were charged with and how the case ended. Answer those two questions and we can tell you whether the court seals the record on its own or whether you file a petition.",
    es: "Nevada tiene dos mecanismos distintos para este tipo de caso, y cuál se aplica depende del cargo que se le imputó y de cómo terminó el caso. Responda esas dos preguntas y podremos decirle si el tribunal sella el antecedente por su cuenta o si usted presenta una petición."
  },
  "result.nv.176a_subsection_3_barred": {
    en: "Nevada does not allow this kind of case to be sealed under these sections. Subsection 3 of NRS 176A.245, 176A.265 and 176A.295 forbids sealing where the charge was under NRS 200.508 (abuse, neglect or endangerment of a child) or NRS 200.5099 (abuse, neglect, exploitation, isolation or abandonment of an older person or a vulnerable person). That is true whether you were discharged from probation, the case was dismissed, or the judgment was set aside, so neither the automatic route nor a petition is open here. A lawyer or Nevada Legal Services is the right place to take this.",
    es: "Nevada no permite que este tipo de caso se selle conforme a estas secciones. La subsección 3 de las NRS 176A.245, 176A.265 y 176A.295 prohíbe el sellado cuando el cargo fue conforme a la NRS 200.508 (maltrato, descuido o puesta en peligro de un menor) o la NRS 200.5099 (maltrato, descuido, explotación, aislamiento o abandono de una persona mayor o de una persona vulnerable). Esto rige tanto si usted fue dado de baja de la libertad condicional, como si el caso fue desestimado o la sentencia fue anulada, de modo que aquí no está abierta ni la vía automática ni una petición. Un abogado o Nevada Legal Services es el lugar indicado para llevar este asunto."
  },
  "result.nv.176a_subsection_3_not_established": {
    en: "Nevada bars sealing under these sections for some charges involving a child, an older person or a vulnerable person, whatever happened to the case afterwards. Tell us whether yours was one of those and we can say whether this route is open to you at all.",
    es: "Nevada prohíbe el sellado conforme a estas secciones para ciertos cargos relacionados con un menor, una persona mayor o una persona vulnerable, sin importar lo que haya ocurrido después con el caso. Díganos si el suyo fue uno de esos y podremos decirle si esta ruta está abierta para usted."
  },
  "missing.nv_176a_excluded_charge_class": {
    en: "Was the charge abuse of a child, an older person or a vulnerable person?",
    es: "¿El cargo fue maltrato de un menor, de una persona mayor o de una persona vulnerable?"
  },
  "missing.nv_176a_charge_class": {
    en: "Was the charge domestic-violence battery or driving under the influence?",
    es: "¿El cargo fue agresión por violencia doméstica o conducir bajo los efectos del alcohol o las drogas?"
  },
  "missing.nv_176a_disposition_class": {
    en: "How did the case end after the programme?",
    es: "¿Cómo terminó el caso después del programa?"
  },

  "screening.free_screening": { en: "Free screening", es: "Revisión gratis" },
  "screening.where_record": { en: "Where is the record?", es: "¿Dónde está el antecedente?" },
  "screening.state_picker_body": {
    en: "Choose the state or district where the case happened. We will ask a few plain questions for that place. This is legal information, not legal advice, and there is no payment to check.",
    es: "Elija el estado o distrito donde ocurrió el caso. Haremos unas preguntas sencillas para ese lugar. Esto es información legal, no asesoría legal, y no hay pago para revisar."
  },
  "screening.state_screening": { en: "{state} screening", es: "Revisión de {state}" },
  "screening.save_progress": { en: "Save progress", es: "Guardar progreso" },
  "screening.save_progress_email": {
    en: "We'll only use this email to send you a link back to your saved progress.",
    es: "Solo usaremos este correo electrónico para enviarle un enlace a su progreso guardado."
  },
  "screening.save_progress_sent": {
    en: "Check your email for a saved-progress link.",
    es: "Revise su correo electrónico para encontrar el enlace de progreso guardado."
  },
  "screening.save_progress_error": {
    en: "We could not send that link right now. You can continue without saving or try again.",
    es: "No pudimos enviar ese enlace ahora. Puede continuar sin guardar o intentarlo de nuevo."
  },
  "screening.email": { en: "Email", es: "Correo electrónico" },
  "screening.sending": { en: "Sending...", es: "Enviando..." },
  "screening.send_link": { en: "Send link", es: "Enviar enlace" },
  "screening.continue_without_saving": { en: "Continue without saving", es: "Continuar sin guardar" },
  "screening.answer_required": { en: "Please answer this question to continue.", es: "Responda esta pregunta para continuar." },
  "screening.legal_info": {
    en: "This is legal information, not legal advice. Expungement.ai prepares self-help materials based on your answers; the court or agency makes the final decision.",
    es: "Esto es información legal, no asesoría legal. Expungement.ai prepara materiales de autoayuda según sus respuestas; el tribunal o la agencia toma la decisión final."
  },
  "screening.loading": { en: "Loading your state's questions...", es: "Cargando las preguntas de su estado..." },
  "screening.missing_state_title": { en: "We could not find that state.", es: "No pudimos encontrar ese estado." },
  "screening.missing_state_body": {
    en: "\"{state}\" does not match a supported state or district. Pick from the state list to start again.",
    es: "\"{state}\" no coincide con un estado o distrito compatible. Elija una opción de la lista de estados para empezar de nuevo."
  },
  "screening.choose_state": { en: "Choose your state", es: "Elija su estado" },
  "screening.malformed_title": { en: "Something went wrong loading these questions.", es: "Algo salió mal al cargar estas preguntas." },
  "screening.malformed_body": {
    en: "We could not load this state's screening questions correctly, so we stopped rather than show you something unreliable. Please try again in a moment.",
    es: "No pudimos cargar correctamente las preguntas de este estado, así que nos detuvimos en lugar de mostrar algo poco confiable. Intente de nuevo en un momento."
  },
  "screening.back_to_states": { en: "Back to states", es: "Volver a los estados" },
  "screening.question_unavailable": {
    en: "We could not show this question right now. You can continue, and a reviewer will follow up if this detail is needed.",
    es: "No pudimos mostrar esta pregunta ahora. Puede continuar, y alguien dará seguimiento si este detalle es necesario."
  },
  "screening.step_count": { en: "{current} of {total}", es: "{current} de {total}" },
  "screening.step_aria": { en: "Step {current} of {total}", es: "Paso {current} de {total}" },
  "screening.context_note": { en: "This helps us understand your situation, but it does not decide the result by itself.", es: "Esto nos ayuda a entender su situación, pero no decide el resultado por sí solo." },
  "answer.yes": { en: "Yes", es: "Sí" },
  "answer.no": { en: "No", es: "No" },
  "answer.not_sure": { en: "I'm not sure", es: "No estoy seguro" },
  "answer.i_am_not_sure": { en: "I am not sure", es: "No estoy seguro" },
  "answer.prefer_not": { en: "Prefer not to say", es: "Prefiero no decirlo" },
  "answer.dont_know_date": { en: "I don't know the date", es: "No sé la fecha" },

  "result.packet_title": { en: "A path may be available.", es: "Puede haber una ruta disponible." },
  "result.packet_body": {
    en: "Based on what you shared, there may be a record-clearing path available. Expungement.ai can help you generate a self-help packet and next-step instructions.",
    es: "Según lo que compartió, puede haber una ruta disponible para limpiar antecedentes. Expungement.ai puede ayudarle a generar un paquete de autoayuda e instrucciones de próximos pasos."
  },
  "result.path_available": { en: "A path may be available.", es: "Puede haber una ruta disponible." },
  "result.path_available_caution": { en: "A path may be available.", es: "Puede haber una ruta disponible." },
  "result.caution_support": {
    en: "We'll flag anything you should review before filing. The court or agency makes the final decision.",
    es: "Marcaremos cualquier cosa que deba revisar antes de presentar. El tribunal o la agencia toma la decisión final."
  },
  "result.more_details": { en: "A few more details needed", es: "Faltan algunos detalles" },
  "result.may_need_wait": { en: "You may need to wait", es: "Es posible que tenga que esperar" },
  "result.state_next_steps": { en: "Next steps for your state", es: "Próximos pasos para su estado" },
  "result.not_supported": { en: "Not supported yet", es: "Aún no compatible" },
  "result.may_not_match": { en: "This record may not match a self-help path", es: "Es posible que este antecedente no coincida con una ruta de autoayuda" },
  "result.needs_review": { en: "This needs review", es: "Esto necesita revisión" },
  "result.ms_missing_detail_title": {
    en: "We need one more detail before we can prepare the right packet.",
    es: "Necesitamos un detalle más antes de preparar el paquete correcto."
  },
  "result.ms_missing_date_anchor": {
    en: "We need one more detail before we can prepare the right packet.",
    es: "Necesitamos un detalle más antes de preparar el paquete correcto."
  },
  "result.ms_missing_date_next_step": {
    en: "Save your progress and update your answers when you have that detail.",
    es: "Guarde su progreso y actualice sus respuestas cuando tenga ese dato."
  },
  "result.cannot_help": { en: "We can't help with this record", es: "No podemos ayudar con este antecedente" },
  "result.cautions": { en: "Please read these cautions", es: "Lea estas advertencias" },
  "result.still_need": { en: "What we still need", es: "Lo que todavía necesitamos" },
  "result.packet_includes": { en: "What your packet would include", es: "Qué incluiría su paquete" },
  "result.edit_answers": { en: "Edit my answers", es: "Editar mis respuestas" },
  "result.add_details": { en: "Add these details", es: "Agregar estos detalles" },
  "result.save_briefcase": { en: "Save this result to Briefcase", es: "Guardar este resultado en el Maletín" },
  // Pre-authentication copy never names a matter or a Briefcase: the preliminary
  // result becomes either only after the claim transaction wins.
  "result.save_matter_continue": { en: "Save my result and continue", es: "Guardar mi resultado y continuar" },
  "result.save_guidance": { en: "Save this guidance", es: "Guardar esta orientación" },
  "result.save_briefcase_continue": { en: "Save to my Briefcase and continue", es: "Guardar en mi Maletín y continuar" },
  "claim.matter_saved": { en: "Your matter has been saved to your Briefcase.", es: "Su asunto se ha guardado en su Maletín." },
  "result.lane_packet_builder": { en: "Continue to packet builder", es: "Continuar al generador de paquetes" },
  "result.lane_more_info": { en: "Continue to my Briefcase", es: "Continuar a mi Maletín" },
  "result.lane_next_steps": { en: "View my next steps", es: "Ver mis próximos pasos" },
  "result.lane_briefcase": { en: "View my Briefcase", es: "Ver mi Maletín" },
  "result.reviewing": { en: "Reviewing your answers...", es: "Revisando sus respuestas..." },
  "result.reviewing_body": {
    en: "This only takes a moment. We are checking what you told us. We do not guess, and nothing here is a decision yet.",
    es: "Esto solo toma un momento. Estamos revisando lo que nos compartió. No adivinamos, y nada aquí es una decisión todavía."
  },
  "result.safe_stop": { en: "We stopped to keep this safe", es: "Nos detuvimos para mantener esto seguro" },
  "result.something_wrong": { en: "Something went wrong", es: "Algo salió mal" },
  "result.unreadable_title": { en: "We couldn't read this result reliably.", es: "No pudimos leer este resultado de forma confiable." },
  "result.check_failed_title": { en: "We couldn't check your record just now.", es: "No pudimos revisar su antecedente en este momento." },
  "result.unreadable_body": {
    en: "The result came back in a form we did not expect, so we stopped rather than show you something that might be wrong. Your answers are not lost. Please try again.",
    es: "El resultado llegó en un formato que no esperábamos, así que nos detuvimos en lugar de mostrar algo que podría estar incorrecto. Sus respuestas no se perdieron. Intente de nuevo."
  },
  "result.connection_body": {
    en: "This was a connection problem, not a decision about your record. Please try again in a moment.",
    es: "Esto fue un problema de conexión, no una decisión sobre su antecedente. Intente de nuevo en un momento."
  },
  "result.back_to_answers": { en: "Back to my answers", es: "Volver a mis respuestas" },
  "result.partner_covered": { en: "Your packet is covered by your partner program.", es: "Su paquete está cubierto por su programa asociado." },
  "result.upl_disclaimer": {
    en: "Expungement.ai is not a law firm and this is not legal advice. We prepare self-help materials and information; the court or agency makes the final decision. Review everything before filing.",
    es: "Expungement.ai no es un bufete de abogados y esto no es asesoría legal. Preparamos materiales e información de autoayuda; el tribunal o la agencia toma la decisión final. Revise todo antes de presentar."
  },
  "missing.tell_more": { en: "Tell us more about {field}.", es: "Cuéntenos más sobre {field}." },
  "profile.MS.disposition_date.prompt": {
    en: "About how long ago did this case end or get resolved?",
    es: "¿Hace aproximadamente cuánto terminó o se resolvió este caso?"
  },
  "profile.MS.disposition_date.helper": {
    en: "An estimate is okay for this free screening. We may ask for exact case details later before generating documents.",
    es: "Una estimación está bien para esta revisión gratis. Es posible que pidamos detalles exactos del caso más adelante, antes de generar documentos."
  },

  "filing.ready_to_file": { en: "Ready to file", es: "Listo para presentar" },
  "filing.guidance_only": { en: "Next steps only", es: "Solo próximos pasos" },
  "filing.needs_external_document": { en: "Another document is needed", es: "Se necesita otro documento" },
  "filing.needs_court_or_agency_followup": { en: "Court or agency follow-up is needed", es: "Se necesita seguimiento con el tribunal o la agencia" },

  "payment.generate_packet": { en: "Generate my packet - $50", es: "Generar mi paquete - $50" },
  "payment.save_later": { en: "Save and come back later", es: "Guardar y volver después" },
  "payment.step": { en: "Step 2 of 2", es: "Paso 2 de 2" },
  "payment.title": { en: "Generate your self-help packet.", es: "Genere su paquete de autoayuda." },
  "payment.support": {
    en: "The free check is complete. Based on your answers, we found a possible packet route.",
    es: "La revisión gratis está completa. Según sus respuestas, encontramos una posible ruta de paquete."
  },
  "payment.supporting_copy": {
    en: "The $50 covers Expungement.ai packet generation. Court, agency, or background-report fees are separate.",
    es: "Los $50 cubren la generación del paquete de Expungement.ai. Las cuotas del tribunal, de agencias o de informes de antecedentes son aparte."
  },
  "payment.paid": { en: "paid", es: "pagado" },
  "payment.refunded": { en: "refunded", es: "reembolsado" },
  "payment.no_charge": { en: "No charge", es: "Sin cargo" },
  "payment.no_charge_receipt": { en: "No payment was collected; there is no charge receipt.", es: "No se cobró ningún pago; no hay recibo de cargo." },
  "briefcase.view_receipt": { en: "View receipt", es: "Ver recibo" },
  "payment.one_time": { en: "one-time", es: "pago único" },
  "payment.fee_note": {
    en: "You are paying for self-help packet preparation and filing instructions. Court approval is not promised. Expungement.ai is not a law firm and does not provide legal advice.",
    es: "Usted paga por la preparación de un paquete de autoayuda y por instrucciones de presentación. No se promete la aprobación del tribunal. Expungement.ai no es un bufete de abogados y no brinda asesoría legal."
  },
  "payment.unavailable": { en: "Payment unavailable", es: "Pago no disponible" },
  "payment.no_paid_packet": { en: "This result does not include a paid packet.", es: "Este resultado no incluye un paquete pagado." },
  "payment.saved_matter": { en: "Saved matter", es: "Asunto guardado" },
  "payment.open_from_briefcase": { en: "Return to your Briefcase and open a case with a packet available to start payment.", es: "Vuelva a su Maletín y abra un caso que tenga un paquete disponible para iniciar el pago." },
  "payment.starting": { en: "Starting checkout...", es: "Iniciando el pago..." },
  "payment.error": { en: "Checkout is not available right now.", es: "El pago no está disponible ahora." },

  "briefcase.label": { en: "Briefcase", es: "Maletín" },
  "briefcase.open": { en: "Open Briefcase", es: "Abrir Maletín" },
  "briefcase.my_matters": { en: "My matters", es: "Mis asuntos" },
  "briefcase.documents": { en: "Documents", es: "Documentos" },
  "briefcase.account": { en: "Account", es: "Cuenta" },
  "briefcase.profile": { en: "Profile", es: "Perfil" },
  "briefcase.settings": { en: "Settings", es: "Configuración" },
  "briefcase.new_check": { en: "New screening", es: "Nueva evaluación" },
  "briefcase.guidance_saved": { en: "Next steps saved", es: "Próximos pasos guardados" },
  "briefcase.ready_to_file": { en: "Ready to file", es: "Listo para presentar" },
  "briefcase.needs_attention": { en: "Needs your attention", es: "Necesita su atención" },
  "briefcase.waiting_period": { en: "Waiting period", es: "Período de espera" },
  "briefcase.extra_care": { en: "Extra care", es: "Revisión cuidadosa" },
  "briefcase.saved": { en: "Saved", es: "Guardado" },
  "briefcase.reviewing_eligibility": { en: "Reviewing your answers", es: "Revisando sus respuestas" },
  "briefcase.with_court": { en: "With the court", es: "Con el tribunal" },
  "briefcase.closer_look": { en: "Needs a closer look", es: "Necesita una revisión más cuidadosa" },
  "briefcase.stage.free_screening": { en: "Free screening", es: "Evaluación gratuita" },
  "briefcase.stage.account_created": { en: "Account created", es: "Cuenta creada" },
  "briefcase.stage.payment": { en: "Payment", es: "Pago" },
  "briefcase.stage.packet_information": { en: "Packet information", es: "Información del paquete" },
  "briefcase.stage.packet_generated": { en: "Packet generated", es: "Paquete generado" },
  "briefcase.stage.filing_next_steps": { en: "Filing next steps", es: "Próximos pasos de presentación" },
  "briefcase.account_required": { en: "Account required", es: "Se requiere una cuenta" },
  "briefcase.sign_in_title": { en: "Sign in to open your Briefcase", es: "Inicie sesión para abrir su Maletín" },
  "briefcase.sign_in_body": {
    en: "Sign in to see the cases, results, available packets, reminders, payments, and Wilma conversations you chose to save in your Briefcase.",
    es: "Inicie sesión para ver los casos, resultados, paquetes disponibles, recordatorios, pagos y conversaciones con Wilma que decidió guardar en su Maletín."
  },
  "briefcase.empty_title": { en: "Start a free screening", es: "Comenzar una evaluación gratuita" },
  "briefcase.empty_body": {
    en: "Answer a few plain questions about your record. It's free, and you'll see possible next steps before paying anything.",
    es: "Responda unas preguntas sencillas sobre sus antecedentes. Es gratis y verá posibles próximos pasos antes de pagar algo."
  },
  "briefcase.empty_cta": { en: "Check my options", es: "Ver mis opciones" },
  "briefcase.welcome_back": { en: "Welcome back", es: "Bienvenido de nuevo" },
  "briefcase.progress_body": {
    en: "You have {count} {recordWord} in progress. Here's where things stand.",
    es: "Tiene {count} antecedentes en proceso. Así van las cosas."
  },
  "briefcase.stand_body": { en: "Here's where your records stand.", es: "Así están sus antecedentes." },
  "briefcase.record_singular": { en: "record", es: "antecedente" },
  "briefcase.record_plural": { en: "records", es: "antecedentes" },
  "briefcase.in_progress": { en: "In progress", es: "En proceso" },
  "briefcase.active_records": { en: "Active records", es: "Antecedentes activos" },
  "briefcase.action_needed": { en: "Action needed", es: "Acción necesaria" },
  "briefcase.documents_prepared": { en: "Prepared for you", es: "Preparados para usted" },
  "briefcase.cleared": { en: "Cleared", es: "Limpiados" },
  "briefcase.so_far": { en: "So far", es: "Hasta ahora" },
  "briefcase.reminders": { en: "Reminders", es: "Recordatorios" },
  "briefcase.reminders_body": {
    en: "Waiting-period reminders and filing follow-ups are saved here when the engine recommends them. You will never miss a window without a heads-up.",
    es: "Los recordatorios de períodos de espera y seguimientos de presentación se guardan aquí cuando el motor los recomienda. Le avisaremos para que no se le pase una fecha importante."
  },
  "briefcase.payment_history": { en: "Payment history", es: "Historial de pagos" },
  "briefcase.packet_label": { en: "Packet", es: "Paquete" },
  "briefcase.receipt": { en: "Receipt", es: "Recibo" },
  "briefcase.no_payments": {
    en: "No payments yet. You only pay when a packet is ready, and you will see the price first.",
    es: "Aún no hay pagos. Solo paga cuando un paquete está listo, y verá el precio primero."
  },
  "briefcase.generate_packet": { en: "Generate my packet", es: "Generar mi paquete" },
  "briefcase.generating_packet": { en: "Generating packet...", es: "Generando paquete..." },
  "briefcase.generate_error": {
    en: "We could not generate the packet right now. Try again or contact support.",
    es: "No pudimos generar el paquete ahora. Intente de nuevo o contacte a soporte."
  },
  "briefcase.profile_settings": { en: "Profile and settings", es: "Perfil y configuración" },
  "briefcase.settings_body": {
    en: "Your account preferences live here. This pass does not change partner auth, sessions, or billing.",
    es: "Sus preferencias de cuenta están aquí. Esto no cambia la autenticación de socios, sesiones ni facturación."
  },
  "briefcase.technical_support": { en: "Get technical support", es: "Obtener ayuda técnica" },
  "briefcase.stuck": { en: "Stuck on something?", es: "¿Tiene alguna duda?" },
  "briefcase.view_all": { en: "View all", es: "Ver todo" },
  "briefcase.complete_packet_information": { en: "Complete packet information", es: "Completar información del paquete" },
  "briefcase.contact_support": { en: "Contact support", es: "Contactar ayuda" },
  "briefcase.wilma_help": { en: "Wilma can explain any step in plain language, anytime.", es: "Wilma puede explicar cualquier paso en lenguaje sencillo, cuando lo necesite." },
  "packet.ask_wilma_next": { en: "Ask Wilma about next steps", es: "Preguntar a Wilma sobre los próximos pasos" },
  "briefcase.my_matters_body": {
    en: "Each record you check is saved here as its own matter. Open one to see its documents and next steps.",
    es: "Cada antecedente que revise se guarda aquí como su propio asunto. Abra uno para ver sus documentos y próximos pasos."
  },
  "briefcase.documents_body": {
    en: "Your documents live inside the matter they belong to. Here is every matter that has documents ready.",
    es: "Sus documentos están dentro del asunto al que pertenecen. Aquí aparece cada asunto que tiene documentos listos."
  },
  "briefcase.documents_empty": {
    en: "Your documents will appear here after you generate a packet for one of your matters.",
    es: "Sus documentos aparecerán aquí después de generar un paquete para uno de sus asuntos."
  },
  "briefcase.guidance_card": {
    en: "What we can do here: we saved your state-specific next steps. Open this matter to read them.",
    es: "Lo que podemos hacer aquí: guardamos los próximos pasos específicos de su estado. Abra este asunto para leerlos."
  },
  "briefcase.nav.briefcase": { en: "Briefcase", es: "Maletín" },
  "briefcase.nav.my_matters": { en: "My matters", es: "Mis asuntos" },
  "briefcase.nav.documents": { en: "Documents", es: "Documentos" },
  "briefcase.nav.profile": { en: "Profile", es: "Perfil" },
  "briefcase.nav.settings": { en: "Settings", es: "Configuración" },
  "nav.how_it_works": { en: "How it works", es: "Cómo funciona" },
  "nav.what_you_get": { en: "What you get", es: "Qué incluye" },
  "nav.pricing": { en: "Price", es: "Precio" },
  "nav.trust_privacy": { en: "Trust & privacy", es: "Confianza y privacidad" },
  "nav.questions": { en: "Questions", es: "Preguntas" },
  "nav.start_free": { en: "Check my options", es: "Ver mis opciones" },
  "start.eyebrow": { en: "Free screening", es: "Evaluación gratuita" },
  "start.heading": {
    en: "Start with what happened. See what may be available.",
    es: "Comience con lo que pasó. Vea qué opciones podrían estar disponibles."
  },
  "start.body": {
    en: "Answer clear questions about your state, case, and outcome. No account or payment is required to begin. If a supported self-help packet is available, review your information before paying $50 to generate it.",
    es: "Responda preguntas claras sobre su estado, caso y resultado. No necesita una cuenta ni hacer un pago para comenzar. Si hay un paquete de autoayuda disponible, revise su información antes de pagar $50 para generarlo."
  },
  "start.resume": { en: "Already started? Open Briefcase", es: "¿Ya comenzó? Abra su Maletín" },
  "start.boundary": {
    en: "No account to begin. No payment to start. Self-help information, not legal advice.",
    es: "Sin cuenta para comenzar. Sin pago para empezar. Información de autoayuda, no asesoría legal."
  },
  "start.card_check_title": { en: "Free screening", es: "Evaluación gratuita" },
  "start.card_check_body": {
    en: "Answer questions that reflect the record-clearing rules in the state you choose.",
    es: "Responda preguntas que reflejan las reglas de limpieza de antecedentes del estado que elija."
  },
  "start.card_briefcase_title": { en: "Your free Briefcase", es: "Su Maletín gratuito" },
  "start.card_briefcase_body": {
    en: "Create an account when you want to save cases, available documents, receipts, and next steps.",
    es: "Cree una cuenta cuando quiera guardar casos, documentos disponibles, recibos y próximos pasos."
  },
  "start.card_packet_title": { en: "Supported self-help packets", es: "Paquetes de autoayuda disponibles" },
  "start.card_packet_body": {
    en: "When one is available, review your information before paying $50 for documents and filing steps you use yourself.",
    es: "Cuando haya uno disponible, revise su información antes de pagar $50 por documentos y pasos de presentación que usará usted mismo."
  },
  "signin.account": { en: "Your Expungement.ai account", es: "Su cuenta de Expungement.ai" },
  "signin.create_title": { en: "Create your account", es: "Cree su cuenta" },
  "signin.create_body": {
    en: "Create an account to save this result in your free Briefcase, complete packet information, and return later.",
    es: "Cree una cuenta para guardar este resultado en su Maletín gratuito, completar la información del paquete y volver más tarde."
  },
  "signin.create_submit": { en: "Create account and continue", es: "Crear cuenta y continuar" },
  "signin.creating": { en: "Creating account...", es: "Creando cuenta..." },
  "signin.switch_to_signin": { en: "Already have an account? Sign in", es: "¿Ya tiene una cuenta? Inicie sesión" },
  "signin.switch_to_create": { en: "New here? Create account", es: "¿Aún no tiene una cuenta? Cree una cuenta" },
  "signin.title": { en: "Sign in to continue", es: "Inicie sesión para continuar" },
  "signin.body": {
    en: "Sign in to return to your Briefcase and continue where you left off.",
    es: "Inicie sesión para volver a su Maletín y continuar donde se quedó."
  },
  "signin.disclaimer": {
    en: "Expungement.ai is self-help software, not a law firm. The court or agency makes the final decision.",
    es: "Expungement.ai es software de autoayuda, no un bufete de abogados. El tribunal o la agencia toma la decisión final."
  },
  "signin.error": {
    en: "We could not sign you in. Check your email and password and try again.",
    es: "No pudimos iniciar sesión. Revise su correo electrónico y contraseña e intente de nuevo."
  },
  "signin.create_error": {
    en: "We could not create your account. Check your email and password and try again.",
    es: "No pudimos crear su cuenta. Revise su correo electrónico y contraseña e intente de nuevo."
  },
  "signin.reset_password": { en: "Reset password", es: "Restablecer contraseña" },
  "signin.edit_email": { en: "Edit email", es: "Editar correo electrónico" },
  "signin.confirm_email": {
    en: "If this email needs verification, check your inbox and spam folder for a confirmation link. Already have an account? Sign in or reset your password.",
    es: "Si este correo necesita verificación, revise su bandeja de entrada y la carpeta de spam para encontrar un enlace de confirmación. ¿Ya tiene una cuenta? Inicie sesión o restablezca su contraseña."
  },
  "signin.signing_in": { en: "Signing in...", es: "Iniciando sesión..." },
  "signin.forgot": { en: "Forgot your password?", es: "¿Olvidó su contraseña?" },
  "signin.show_password": { en: "Show password", es: "Mostrar contraseña" },
  "signin.hide_password": { en: "Hide password", es: "Ocultar contraseña" },

  "wilma.transport_fallback": { en: "I couldn't respond just now. Try again in a moment. The free screening and your Briefcase are still available.", es: "No pude responder en este momento. Inténtelo de nuevo en un momento. La evaluación gratuita y su Maletín siguen disponibles." },
  "wilma.challenge_pending": { en: "One sec - just finishing a quick security check, then send that again.", es: "Un segundo. Estamos terminando una revisión rápida de seguridad; luego envíe eso otra vez." },
  "wilma.rate_limit": { en: "I'm getting a lot of questions right now. Wait a few seconds and try again. The free screening is still available.", es: "Estoy recibiendo muchas preguntas en este momento. Espere unos segundos e inténtelo de nuevo. La evaluación gratuita sigue disponible." },
  "wilma.bot": { en: "I couldn't verify this request. Refresh the page and try again, or start the free screening.", es: "No pude verificar esta solicitud. Actualice la página e inténtelo de nuevo, o comience la evaluación gratuita." },
  "wilma.turns": { en: "We've covered a lot. This is a good time to start the free screening, which uses your answers and your state's rules to show what may be available.", es: "Ya cubrimos bastante. Este es un buen momento para comenzar la evaluación gratuita, que usa sus respuestas y las reglas de su estado para mostrar qué opciones podrían estar disponibles." },
  "wilma.message_required": { en: "Enter a question for Wilma.", es: "Escriba una pregunta para Wilma." },
  "wilma.too_long": { en: "Keep your question under {count} characters and try again.", es: "Escriba una pregunta de menos de {count} caracteres e inténtelo de nuevo." },
  "wilma.guide": { en: "Guide", es: "Guía" },
  "wilma.close": { en: "Close", es: "Cerrar" },
  "wilma.expand": { en: "Expand chat", es: "Ampliar chat" },
  "wilma.collapse": { en: "Collapse chat", es: "Contraer chat" },
  "wilma.your_state": { en: "Your state", es: "Su estado" },
  "wilma.select_state": { en: "Select a state (optional)", es: "Seleccione un estado (opcional)" },
  "wilma.thinking": { en: "Wilma is thinking...", es: "Wilma está pensando..." },
  "wilma.need_help": { en: "Need help? Ask Wilma to explain this clearly.", es: "¿Necesita ayuda? Pida a Wilma que lo explique en lenguaje sencillo." },
  "wilma.reported": { en: "Reported, thank you. A reviewer will take a look.", es: "Reportado, gracias. Un revisor lo revisará." },
  "wilma.report_response": { en: "Report this response", es: "Reportar esta respuesta" },
  "wilma.message": { en: "Message Wilma", es: "Enviar mensaje a Wilma" },
  "wilma.ask_question": { en: "Ask Wilma about this question", es: "Preguntar a Wilma sobre esta pregunta" },
  "wilma.send": { en: "Send message", es: "Enviar mensaje" },
  "wilma.not_advice": { en: "Wilma is a guide, not legal advice.", es: "Wilma es una guía, no asesoría legal." },
  "wilma.resting": { en: "Wilma is resting", es: "Wilma está descansando" },
  "wilma.resting_body": { en: "Wilma is taking a quick break. The free screening and your Briefcase are still available.", es: "Wilma está tomando una pausa breve. La evaluación gratuita y su Maletín siguen disponibles." },
  "wilma.prompt.landing": { en: "Want me to explain how this works?", es: "¿Quiere que explique cómo funciona?" },
  "wilma.prompt.pricing": { en: "Want to know what is included?", es: "¿Quiere saber qué está incluido?" },
  "wilma.prompt.start": { en: "Want me to explain the free screening?", es: "¿Quiere que explique la evaluación gratuita?" },
  "wilma.prompt.check": { en: "Want me to explain these questions?", es: "¿Quiere que explique estas preguntas?" },
  "wilma.prompt.results": { en: "Want me to explain this result?", es: "¿Quiere que explique este resultado?" },
  "wilma.prompt.pay": { en: "Want to know what's included?", es: "¿Quiere saber qué está incluido?" },
  "wilma.prompt.packet-ready": { en: "Want help with next steps?", es: "¿Quiere ayuda con los próximos pasos?" },
  "wilma.prompt.briefcase": { en: "Want me to explain this case status?", es: "¿Quiere que explique el estado de este caso?" },

  "external_doc.1": { en: "File the TF-810 request at your local Alaska trial court", es: "Presente la solicitud TF-810 en su tribunal local de primera instancia de Alaska" },
  "external_doc.2": { en: "Proof of SIS and/or the order setting aside charges (if applicable)", es: "Prueba del SIS y/o de la orden que dejó sin efecto los cargos, si aplica" },
  "external_doc.3": { en: "Certified disposition showing acquittal or dismissal (if requested)", es: "Resolución certificada que muestre absolución o desestimación, si se solicita" },
  "external_doc.4": { en: "SBI criminal-history / SBI eligibility letter", es: "Informe de antecedentes penales del SBI o carta de elegibilidad del SBI" },
  "external_doc.5": { en: "Certified case documents", es: "Documentos certificados del caso" },
  "external_doc.6": { en: "Superior Court filing fee", es: "Cuota de presentación del Tribunal Superior" },
  "external_doc.7": { en: "Current verified criminal-history record (CHR/SCOPE)", es: "Registro actual verificado de antecedentes penales (CHR/SCOPE)" },
  "external_doc.8": { en: "Certified dispositions / judgment of conviction", es: "Resoluciones certificadas / sentencia de condena" },
  "external_doc.9": { en: "Probation/parole/prison discharge paperwork", es: "Documentos de finalización de probation, parole o prisión" },
  "external_doc.10": { en: "Fingerprints where required", es: "Huellas digitales cuando se requieran" },
  "external_doc.11": { en: "Prosecutor review/stipulation step", es: "Paso de revisión o estipulación de la fiscalía" },
  "external_doc.12": { en: "Court/county filing fee", es: "Cuota de presentación del tribunal o condado" },
  "external_doc.13": { en: "PATCH / PSP criminal-history report", es: "Informe de antecedentes penales PATCH / PSP" },
  "external_doc.14": { en: "Expected PATCH fee", es: "Cuota esperada de PATCH" },

  "route.generic.record_clearing": { en: "{state} record-clearing", es: "limpieza de antecedentes de {state}" },
  "route.ak.courtview_removal": { en: "CourtView Removal", es: "Eliminación de CourtView (CourtView Removal)" },
  "route.nv.record_sealing": { en: "Record Sealing", es: "Sellado de antecedentes (Record Sealing)" },
  "route.ma.cori_sealing": { en: "CORI Sealing", es: "Sellado CORI (CORI Sealing)" },
  "route.ma.dismissed_case_sealing": { en: "Dismissed Case Sealing", es: "sellado de caso desestimado (Dismissed Case Sealing)" },
  "route.ma.marijuana_expungement": { en: "Marijuana Expungement", es: "expungement de marihuana (Marijuana Expungement)" },
  "route.pa.court_case_expungement": { en: "Court Case Expungement", es: "Expungement de caso judicial (Court Case Expungement)" },
  "route.pa.summary_expungement": { en: "Summary Expungement", es: "Expungement sumario (Summary Expungement)" },
  "route.pa.limited_access": { en: "Limited Access / Sealing", es: "Acceso limitado / sellado (Limited Access / Sealing)" },
  "route.hi.admin_application": { en: "Administrative Application", es: "Solicitud administrativa" },
  "route.de.discretionary_expungement": { en: "Discretionary Expungement Packet", es: "Paquete de expungement discrecional (Discretionary Expungement Packet)" }
};

const EXACT_ENGLISH_INDEX = new Map<string, string>();
for (const [key, entry] of Object.entries(EXPUNGEMENT_COPY)) {
  if (!key.startsWith("legal_aid.participant.") && key !== "legal_aid.places_open") EXACT_ENGLISH_INDEX.set(normalize(entry.en), key);
}

export function normalizeLocale(input: string | null | undefined): Locale {
  return input === "es" ? "es" : "en";
}

export function interpolate(text: string, vars?: Record<string, string | number | undefined>) {
  if (!vars) return text;
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function t(locale: Locale, key: string, fallback?: string, vars?: Record<string, string | number | undefined>) {
  const entry = EXPUNGEMENT_COPY[key];
  const value = locale === "es" ? entry?.es ?? entry?.en ?? fallback ?? key : entry?.en ?? fallback ?? key;
  return interpolate(value, vars);
}

export function resolveRuntimeText(locale: Locale, text: string, options?: { key?: string; vars?: Record<string, string | number | undefined> }): string {
  if (locale === "es" && RCAP_SPANISH_COPY[text]) return interpolate(RCAP_SPANISH_COPY[text],options?.vars);
  if (options?.key) return t(locale, options.key, text, options.vars);
  const key = EXACT_ENGLISH_INDEX.get(normalize(text));
  if (key) return t(locale, key, text, options?.vars);
  if (locale === "es") return resolveSpanishPattern(text, options?.vars);
  return interpolate(text, options?.vars);
}

export function runtimeCopyKeyForText(text: string) {
  return EXACT_ENGLISH_INDEX.get(normalize(text)) ?? `runtime.${slugify(text).slice(0, 80)}`;
}

export function localizeProfileText(locale: Locale, text: string, meta: { state?: string; questionId?: string; part?: string }) {
  const key = `profile.${meta.state ?? "all"}.${meta.questionId ?? "unknown"}.${meta.part ?? "text"}`;
  return t(locale, key, text);
}

export function routeLabelKeyForState(stateName: string, pathwayId?: string) {
  const state = stateName.toLowerCase();
  const pathway = (pathwayId ?? "").toLowerCase();
  if (state === "alaska") return "route.ak.courtview_removal";
  if (state === "nevada") return "route.nv.record_sealing";
  if (state === "hawaii") return "route.hi.admin_application";
  if (state === "delaware") return "route.de.discretionary_expungement";
  if (state === "massachusetts") {
    if (pathway.includes("marijuana")) return "route.ma.marijuana_expungement";
    if (pathway.includes("dismiss") || pathway.includes("non-conviction")) return "route.ma.dismissed_case_sealing";
    return "route.ma.cori_sealing";
  }
  if (state === "pennsylvania") {
    if (pathway.includes("summary") || pathway.includes("490")) return "route.pa.summary_expungement";
    if (pathway.includes("limited") || pathway.includes("seal") || pathway.includes("791")) return "route.pa.limited_access";
    return "route.pa.court_case_expungement";
  }
  return "route.generic.record_clearing";
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function slugify(text: string) {
  return normalize(text).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function resolveSpanishPattern(text: string, vars?: Record<string, string | number | undefined>): string {
  const normalized = interpolate(normalize(text), vars);
  const requiredField=normalized.match(/^(.+) is required\.$/);if(requiredField)return `${resolveRuntimeText("es",requiredField[1])} es obligatorio.`;
  const possibleRoute = normalized.match(/^Based on your answers, there may be a (.+) route for this case\.$/);
  if (possibleRoute) return `Según lo que compartió, puede haber una ruta de ${possibleRoute[1]} para este caso.`;

  const mississippi = normalized.match(/^Based on your answers, Mississippi may have a record-clearing path for a case that was dismissed, had no final disposition, or ended in acquittal\.$/);
  if (mississippi) return "Según lo que compartió, Mississippi puede tener una ruta de limpieza de antecedentes para un caso desestimado, sin resultado final o terminado en absolución.";

  const nonConviction = normalized.match(/^Your answers match a (.+) path for cases that did not end in a conviction\.$/);
  if (nonConviction) return `Sus respuestas coinciden con una ruta de ${nonConviction[1]} para casos que no terminaron en condena.`;

  const possible = normalized.match(/^This looks like a possible (.+) route based on the information you provided\.$/);
  if (possible) return `Esto parece una posible ruta de ${possible[1]} según la información que compartió.`;

  const packet = normalized.match(/^We’ll prepare a (.+) self-help packet for you to review, including the documents and filing steps that match the information you provided\.$/);
  if (packet) return `Prepararemos un paquete de autoayuda de ${packet[1]} para que lo revise, incluyendo los documentos y pasos de presentación que correspondan a la información que compartió.`;

  if (normalized === "We’ll help you confirm automatic relief and what to do next.") {
    return "Le ayudaremos a confirmar la opción automática y qué hacer después.";
  }

  const finish = normalized.match(/^Finish your (.+) check$/);
  if (finish) return `Termine la revisión de ${finish[1]}`;
  if (normalized === "We need one more thing before this can move forward. Open it to see what to add.") {
    return "Necesitamos un dato más antes de avanzar. Ábralo para ver qué agregar.";
  }
  if (normalized === "See what we need") return "Ver qué necesitamos";
  if (normalized === "You're ready to file") return "Está listo para presentar";
  const readyPacket = normalized.match(/^Your packet for (.+) is ready\. We'll show you exactly where to take it and what to expect\.$/);
  if (readyPacket) return `Su paquete para ${readyPacket[1]} está listo. Le mostraremos exactamente dónde llevarlo y qué esperar.`;
  if (normalized === "Show me how to file") return "Mostrar cómo presentar";
  if (normalized === "Your case is with the court") return "Su caso está con el tribunal";
  const filed = normalized.match(/^(.+) is filed and waiting on a decision\. There's nothing to do right now\. We'll help you keep track\.$/);
  if (filed) return `${filed[1]} fue presentado y está esperando una decisión. No tiene que hacer nada ahora. Le ayudaremos a darle seguimiento.`;
  if (normalized === "See your matter") return "Ver su asunto";
  if (normalized === "Your next steps are saved") return "Sus próximos pasos están guardados";
  const savedGuidance = normalized.match(/^We saved step-by-step guidance for (.+)\. Open it whenever you're ready\.$/);
  if (savedGuidance) return `Guardamos una guía paso a paso para ${savedGuidance[1]}. Ábrala cuando esté listo.`;
  if (normalized === "View next steps") return "Ver próximos pasos";
  if (normalized === "See where your check stands") return "Ver el estado de su revisión";
  const reviewFound = normalized.match(/^Open (.+) to review what we found and what you can do next\.$/);
  if (reviewFound) return `Abra ${reviewFound[1]} para revisar lo que encontramos y qué puede hacer después.`;

  return normalized;
}

// Scoped lookup shares the established locale/runtime and never rewrites the
// global English index used by the closed Clinic/consumer language lane.
const LEGAL_AID_ENGLISH_INDEX = new Map(Object.entries(EXPUNGEMENT_COPY)
  .filter(([key]) => key.startsWith("legal_aid.participant."))
  .map(([key, entry]) => [normalize(entry.en), key]));

export function resolveLegalAidText(locale: Locale, text: string, vars?: Record<string, string | number | undefined>): string {
  if (locale === "en") return interpolate(text, vars);
  const key = LEGAL_AID_ENGLISH_INDEX.get(normalize(text));
  const translated = key ? t(locale, key, text, vars) : resolveRuntimeText(locale, text, { vars });
  return (text.match(/^\s*/)?.[0] ?? "") + translated + (text.match(/\s*$/)?.[0] ?? "");
}
