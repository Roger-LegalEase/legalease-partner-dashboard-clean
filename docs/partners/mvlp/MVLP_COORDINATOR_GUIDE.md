# Getting started with MVLP Clinic Mode
## A guide for the MVLP clinic coordinator

Clinic Mode connects registration, MVLP's intake, attorney review, documents, and follow-up. MVLP leads the client relationship. LegalEase helps your team keep the work organized.

Everything below names the exact screens, buttons and web addresses you will see. Addresses are on `https://legaleasepartner.com`.

## 1. Gather your clinic details

Choose a clinic coordinator and a backup. Have the following ready:

| Detail | What to provide |
|---|---|
| Coordinator | Name and work email of the person managing the clinic |
| Clinic | Name, date, start and end time, address, capacity, and whether people come by appointment, walk in, or both |
| Team | Volunteer names, work emails, and assignments |
| Reviews | Who answers intake questions, who approves services, and who provides legal advice |
| Documents and signing | Required records, available notary, and where participants go for signing |
| Costs | What MVLP covers, any participant costs, and whom to contact about fees |
| Follow-up | Who handles missing records, how participants are contacted, and where case files are kept |

Clinic times are entered and shown in Central time (`America/Chicago`). Check the displayed time on the public clinic page before sharing it.

## 2. Accept your invitation

Open the invitation sent to your work email and follow the account setup link. Use your own account. Sign in at **`/sign-in`**. After signing in, open **`/partner/clinic`**: the page is titled **Clinic Mode administration** and shows **mvlp** above the title. That confirms you are in the Mississippi Volunteer Lawyers Project organization.

Your coordinator account is for managing the clinic. Participants use their own accounts and volunteers use their own staff accounts. Do not share passwords, and never create a participant's application under a staff login: only the applicant can sign their statements.

## 3. Review MVLP's program information

The public MVLP page is **`/p/mvlp`**. It carries the MVLP wordmark and colors, the program name **Self-Representation Expungement Clinics**, MVLP's phone number and email, and two actions: **Register for a clinic** and **Continue my application**. Open clinics are listed at **`/p/mvlp/clinics`** with the date, place, format, cost note and places remaining.

MVLP's service rules live in a **policy profile**: what counts as income, which documents need a notary, and where case files go. One administrator prepares the profile and a different administrator approves it. Until MVLP supplies its approved income guideline, every application's financial summary reads **Needs a person's decision** and the program reviewer decides; no automatic income cut-off is installed.

An application for assistance, acceptance by MVLP, and eligibility for expungement are different decisions. The screens keep them separate: **Registration** (a place at the clinic), **Program decision** (MVLP's acceptance), **Attorney review** (the legal matter), and **Court documents** (execution and filing). Keep those distinctions clear when explaining the process to participants.

**You are ready for the next step when:** the responsible MVLP staff member has reviewed the program information and each person knows their assignment.

## 4. Set up your event

Open **`/partner/clinic`**. Under **Create clinic event**, enter the **Public event slug** (the word that appears in the clinic's web address, for example `mvlp-jackson-october`), **Event name**, **Starts**, **Ends**, **Timezone** (`America/Chicago`), **Location**, **Geography** (for example `Hinds County, Mississippi`), **Fixed jurisdiction** (`MS`), **Capacity**, and the **Sponsored packet allocation** agreed with LegalEase. Choose **Create clinic event**. Keep court, record, fingerprinting and notary costs separate from the platform arrangement.

Open the new event and choose **Legal aid clinic setup**. The page has three steps:

- **Step 1: Policy profile.** Choose **Prepare a new draft from the template**. A *second* administrator then opens the same page, adds an optional **Approval note**, and chooses **Approve**. The system refuses the person who prepared the draft.
- **Step 2: Clinic settings.** Choose the approved **Policy profile**; set **Registration opens** and **Registration closes** if you want a window; choose **Scheduling** (walk in, by appointment, or both); write **What it costs the participant** and the **Public description** applicants will read. Choose **Save clinic settings**. The page shows the **Public registration page** address (`/clinic/<your-slug>/register`).
- **Step 3: Clinic team.** See section 5.

Return to the event page and choose **Publish event** only when the details are checked. A clinic cannot be published until its policy profile is approved. Registration is a request for a place; **Registration confirmed** is set by your team, and the confirmation screen says so.

**You are ready for the next step when:** your team sees the correct clinic at `/p/mvlp/clinics`, the same date and time on a phone and a computer, and the registration page opens.

## 5. Invite and assign your team

Each staff member needs their own LegalEase staff account in the MVLP organization (LegalEase sends the invitations; see the coordinator's note in section 7). On **Legal aid clinic setup, Step 3: Clinic team**, choose the **Person** by email, keep **Status** as **Approved**, tick only the **Roles for this clinic** the person holds, and choose **Save team member**.

| Role on the screen | Main responsibility |
|---|---|
| Coordinator | Event setup, staff assignments, and questions that need escalation |
| Intake volunteer | Help applicants answer questions and identify missing information |
| Program reviewer | Review the application under MVLP's service requirements |
| Attorney | Provide legal advice and review the matter and proposed documents |
| Notary | Handle the required notarization and return documents to the appropriate person |
| Follow-up volunteer | Track outstanding tasks and contact participants through approved channels |
| Reporting | See aggregate clinic counts |
| Case-file export | Export the MVLP case file to MVLP's approved destination |

One person may have more than one role. Roles apply to this clinic only. An intake volunteer sees the application but cannot reveal the protected Social Security number or record a program decision; a notary sees only the documents waiting for notarization, never the intake. Set **Status** to **Revoked** when someone's assignment ends.

Ask each person to sign in before clinic day and open **`/clinic/staff/<event id>/applications`** (the **Open the applications list** link on the setup page). Address missing access before participants arrive.

## 6. Walk through one application together

Use a synthetic training case, never a real client's file.

**Start at the MVLP website.** Open **`/p/mvlp/clinics`**, choose the clinic, and choose **Register for this clinic**. The participant signs in or creates a free account (**Sign in or create your account**), fills in **Your full name**, **Email** or **Phone**, **How should MVLP contact you?**, optional language and assistance needs, and chooses **Register for this clinic**. The page then reads **We have your registration**, with **Start my application** and **Cancel my registration**.

**Complete and reopen the intake.** **Start my application** opens the ten-step application: **Your legal matter**, **About you**, **Protected information**, **Your household and work**, **Monthly household receipts**, **Home and vehicle**, **Bank accounts**, **Monthly expenses**, **Your case and MVLP**, and **Review and sign**. Answers save on the server as the person types (the badge reads **Saved**). Close the browser, sign in again, choose **Continue my application** at **`/p/mvlp/continue`**, and confirm the same answers are there. On **Review and sign** the applicant reads each statement that applies and chooses **Sign this statement** (typed name or drawn signature), then **Submit my application**. The screen reads **Your application has been received**.

**Review the application.** On **`/clinic/staff/<event id>/applications`** choose the applicant's name. Choose **Start review**. Under **Information requests**, type what is missing and choose **Send request**: the applicant sees it on their application, edits, signs again, and resubmits. Under **Record a decision**, the program reviewer chooses **Program eligibility** and an **Outcome**, writes the **Reason**, and chooses **Record decision**. The **Financial summary** shows countable cash income (food benefits are listed as not counted) and expenses for context only. The attorney chooses **Take attorney assignment** and **Begin attorney review**; only the attorney or coordinator can use **Reveal once**, which records a purpose in the access log and shows the protected number for sixty seconds.

**Review the documents.** Under **Court documents**, the attorney chooses **Add a court document**, picks **Who signs** and **Execution** (for example **Notary jurat (sworn)**), and attaches the **Unsigned copy from the participant's prepared packet**. The **open prepared packet** link prints the reviewed, unsigned copy. The document then moves in order through **Mark attorney reviewed**, **Mark ready for execution** and **Mark signature or notary pending**.

**Explain signing and next steps.** The notary opens the same application and sees only **Notarization**: after notarizing on paper, they choose **Upload the signed copy**, select it under **Signed copy**, and choose **Record executed copy received**. The attorney then uses **Mark execution reviewed**, **Mark ready to file** and **Mark filed**. Under **Participant next steps**, add what the person should do next with an **Owner on the clinic team**. A prepared or printed document is not signed, notarized, filed, or granted by a court until those steps really happen; the system never adds a seal, notary block or signature.

**Reset the shared station.** Participants sign out of their own account before leaving a shared device (**Sign out** in the account menu), and volunteers sign out of staff accounts. Secure printed and downloaded documents as well.

## 7. Share the right links

| Purpose | Address |
|---|---|
| MVLP public page | `https://legaleasepartner.com/p/mvlp` |
| Open clinics and registration | `https://legaleasepartner.com/p/mvlp/clinics` |
| One clinic's registration page | `https://legaleasepartner.com/clinic/<event slug>/register` |
| Participant return visits | `https://legaleasepartner.com/p/mvlp/continue` |
| Staff sign-in | `https://legaleasepartner.com/sign-in` |
| Clinic administration | `https://legaleasepartner.com/partner/clinic` |
| Applications for one clinic (staff) | `https://legaleasepartner.com/clinic/staff/<event id>/applications` |

Check each address before sharing it. The clinic's registration page is public; staff addresses require a staff account. Do not put staff invitations or passwords into any flyer, guide or video.

People who applied earlier through MVLP's Cognito form do not appear here automatically, and no bulk transfer is installed. Ask them to register on the MVLP page and complete the application, with a volunteer's help at the clinic if needed. Locate any earlier submission in MVLP's own records before deciding how to proceed.

**You are ready to open registration when:** the links work, the coordinator has published the clinic, volunteers have opened the applications list, and the walkthrough is complete.

## 8. Brief volunteers before the doors open

Hold a short team huddle. Test internet access and printing. Identify the coordinator, program reviewer, attorney, notary, and technical-help contact. Have each shared-device volunteer practice signing a participant out.

Remind volunteers to ask the person rather than guess. A blank answer is not the same as zero; the application has an **I don't know this amount** choice for money questions, and the program reviewer follows up. Questions about income, citizenship, an existing attorney, or legal eligibility go to the appropriate MVLP reviewer. A person who answers **No** to the citizenship question is never asked to sign the citizenship statement; the application routes to confidential MVLP review instead.

If someone reaches an unexpected payment request, sees the wrong application, or cannot continue, pause and ask the coordinator. Do not create a second account or change an answer simply to get past a screen.

## 9. Give each participant a clear handoff

Before the person leaves, confirm:

- What is complete and what is still needed (the **Information requests** on their application).
- Which documents need signing or notarization (the **Court documents** status the participant sees as plain-English lines such as "Ready for you to sign at the clinic").
- Where the approved instructions direct the person to file.
- How the person returns to saved work: **`/p/mvlp/continue`**.
- Who owns the next task and when follow-up is due (**Participant next steps**).

Use **Contact the participant** for messages. The **Message to the participant** is what the person receives; the **Internal note (never sent)** stays with the team. The screen reports what actually happened: **Message sent by email and recorded**, or **Recorded, not sent** with the reason. Keep financial details and sensitive information out of ordinary messages.

## 10. Close the clinic without losing follow-up

Choose **Close event** on the event page at the agreed time; registration and new applications stop, and staff keep access to the applications they are responsible for. Set a volunteer's **Status** to **Revoked** when their assignment ends.

Review registrations, submitted applications, program decisions, prepared documents, filings, and court results as separate counts; the applications list shows each application's **Status**, **Registration**, **Attorney** and **Open requests** columns. Assign every unfinished case a next step with an owner.

Use **Case-file export** to produce the MVLP case file (PDF and JSON) for MVLP's approved records destination. The protected number is masked unless the assigned attorney or coordinator ticks **Include protected number**, and every export is recorded. Signing out clears access on the shared device; it is not a request to delete the client's case file.

## Help for your team

For general MVLP questions, the public contact is **601-960-9577** or **mvlp@mvlp.org**. Use the day-of coordinator and technical-help contacts provided in your event briefing for clinic support. Do not email sensitive client records to a general inbox.
