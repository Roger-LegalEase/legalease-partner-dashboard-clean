# MVLP onboarding: Roger's order of operations

LegalEase handles the software setup. MVLP approves its service policy, staff responsibilities, and client decisions. Do these in order; each step names the screen.

## Before activation (facts MVLP must supply)

Collect the items in `03_MVLP_ACTIVATION_DETAILS.md`: the coordinator (name, work email, backup), the first real clinic (name, date, times, venue, capacity, appointment policy), the service and funding policy (income guideline table, asset policy, sign-off owner), sponsorship and fees, the records destination and export recipient, and the named team. Nothing below sends an invitation to a guessed recipient or publishes a guessed date.

## 1. Release the feature

Approve the consolidated rollout request in `MVLP_ENGINEERING_REPORT.md`: migration `20260916120000_legal_aid_clinic_mode.sql` on acceptance then production, the two environment variables for the protected field key, the release of the feature branch, and the rollback target. The public MVLP page and the clinic screens exist only after that release.

## 2. Provision the MVLP organization

Open **`/internal/partners/provisioning`** and confirm whether an MVLP organization already exists (partner slug `mvlp`). If not, choose **New** and complete **Partner Provisioning**: **Legal organization name** (Mississippi Volunteer Lawyers Project), **Public organization name** (MVLP), **Partner page address** (`mvlp`), **Program name** (Self-Representation Expungement Clinics), **Jurisdiction** (Mississippi), and the **First administrator name** and **First administrator work email** for the MVLP coordinator. Do not invent a coordinator: leave the first-administrator invitation unsent until MVLP names the person.

## 3. Send the first administrator invitation

On the organization's provisioning page, use **First administrator** → **Secure setup link** to issue the coordinator's invitation. The coordinator accepts it, signs in at **`/sign-in`**, and sees **Clinic Mode administration** at **`/partner/clinic`** with **mvlp** above the title. A second MVLP administrator is needed to approve the policy profile (the preparer cannot approve their own draft); invite that person the same way.

## 4. Attach the approved intake and program settings

Ask the coordinator to follow sections 4 and 5 of `MVLP_COORDINATOR_GUIDE.md`: create the event, open **Legal aid clinic setup**, prepare and approve the policy profile, save the clinic settings, and assign the team. The template profile at `data/legal-aid/profiles/mvlp-v1.json` deliberately carries **no income guideline**: every financial summary reads **Needs a person's decision** until MVLP supplies its table and a new profile version is prepared and approved.

## 5. Invite staff

Each volunteer needs their own staff account in the MVLP organization (partner staff invitations from the provisioning page). The coordinator assigns roles per clinic; roles never come from the invitation itself.

## 6. Complete the walkthrough

Run section 6 of the coordinator guide with the coordinator on a synthetic case. Confirm on a phone (about 390 px wide) and a computer that the same date and time appear, that the applications list opens for staff, and that the notary sees only **Notarization**.

## 7. Provide the final links, volunteer guide, and video

Hand over `MVLP_COORDINATOR_GUIDE.md` section 7 (links), `MVLP_Volunteer_Guide.pdf`, and the walkthrough recording made from `MVLP_WALKTHROUGH_VIDEO_SCRIPT.md`. Replace `<event slug>` and `<event id>` with the real clinic's values from **Legal aid clinic setup** before sending.
