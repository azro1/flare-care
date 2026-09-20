/**
 * IBD at work — Support guide copy grounded in UK sources only.
 * Do not invent legal/medical guidance beyond what these pages support.
 *
 * Primary sources:
 * - Crohn’s & Colitis UK — Employment: a guide for employees
 *   https://www.crohnsandcolitis.org.uk/info-support/information-about-crohns-and-colitis/all-information-about-crohns-and-colitis/employment-and-education/employment-a-guide-for-employees
 * - Crohn’s & Colitis UK — Employment: a guide for employers
 *   https://www.crohnsandcolitis.org.uk/info-support/information-about-crohns-and-colitis/all-information-about-crohns-and-colitis/employment-and-education/employment-a-guide-for-employers
 * - Crohn’s & Colitis UK — Fatigue (work section)
 *   https://www.crohnsandcolitis.org.uk/media/0ycputyn/fatigue-ed-5-2025.pdf
 * - Crohn’s & Colitis UK — Flare-ups
 *   https://www.crohnsandcolitis.org.uk/info-support/information-about-crohns-and-colitis/all-information-about-crohns-and-colitis/symptoms/flare-ups
 * - Acas — Reasonable adjustments at work
 *   https://www.acas.org.uk/reasonable-adjustments
 * - Acas — Asking for reasonable adjustments
 *   https://www.acas.org.uk/reasonable-adjustments/asking-for-reasonable-adjustments
 * - GOV.UK — Access to Work
 *   https://www.gov.uk/access-to-work
 * - GOV.UK — If you’re in employment and become disabled
 *   https://www.gov.uk/if-you-become-disabled/if-youre-in-employment-and-become-disabled
 */

export const IBD_AT_WORK_INTRO =
  "This guide summarises practical information from Crohn’s & Colitis UK, Acas and GOV.UK about Crohn’s, Colitis and work. It is not personal legal or medical advice. Open the linked sources for the full guidance.";

export const IBD_AT_WORK_NOTE =
  "Whether Crohn’s or Colitis counts as a disability depends on how it affects you. For advice about your situation, use the Crohn’s & Colitis UK, Acas or GOV.UK pages linked in each topic — or speak to your IBD team, HR, a union, or Acas.";

export type IbdAtWorkResource = {
  label: string;
  url: string;
};

export type IbdAtWorkTopic = {
  id: string;
  title: string;
  /** Short summary — only what sources support. */
  summary: string;
  /** Key points taken from the cited sources. */
  points: string[];
  resources: IbdAtWorkResource[];
};

const CCUK_EMPLOYEES: IbdAtWorkResource = {
  label: "Crohn’s & Colitis UK — Employment: a guide for employees",
  url: "https://www.crohnsandcolitis.org.uk/info-support/information-about-crohns-and-colitis/all-information-about-crohns-and-colitis/employment-and-education/employment-a-guide-for-employees",
};

const CCUK_EMPLOYERS: IbdAtWorkResource = {
  label: "Crohn’s & Colitis UK — Employment: a guide for employers",
  url: "https://www.crohnsandcolitis.org.uk/info-support/information-about-crohns-and-colitis/all-information-about-crohns-and-colitis/employment-and-education/employment-a-guide-for-employers",
};

const ACAS_ADJUSTMENTS: IbdAtWorkResource = {
  label: "Acas — What reasonable adjustments are",
  url: "https://www.acas.org.uk/reasonable-adjustments",
};

const ACAS_ASKING: IbdAtWorkResource = {
  label: "Acas — Asking for reasonable adjustments",
  url: "https://www.acas.org.uk/reasonable-adjustments/asking-for-reasonable-adjustments",
};

const GOV_ACCESS_TO_WORK: IbdAtWorkResource = {
  label: "GOV.UK — Access to Work",
  url: "https://www.gov.uk/access-to-work",
};

const GOV_DISABLED_AT_WORK: IbdAtWorkResource = {
  label: "GOV.UK — If you’re in employment and become disabled",
  url: "https://www.gov.uk/if-you-become-disabled/if-youre-in-employment-and-become-disabled",
};

const CCUK_FLARE_UPS: IbdAtWorkResource = {
  label: "Crohn’s & Colitis UK — Flare-ups with Crohn’s or Colitis",
  url: "https://www.crohnsandcolitis.org.uk/info-support/information-about-crohns-and-colitis/all-information-about-crohns-and-colitis/symptoms/flare-ups",
};

const CCUK_FATIGUE_PDF: IbdAtWorkResource = {
  label: "Crohn’s & Colitis UK — Fatigue (PDF)",
  url: "https://www.crohnsandcolitis.org.uk/media/0ycputyn/fatigue-ed-5-2025.pdf",
};

export const IBD_AT_WORK_TOPICS: IbdAtWorkTopic[] = [
  {
    id: "reasonable-adjustments",
    title: "Reasonable adjustments",
    summary:
      "Reasonable adjustments are changes an employer makes to remove or reduce a disadvantage related to someone’s disability. Under the Equality Act 2010, employers must make reasonable adjustments when they know — or could reasonably be expected to know — that someone is disabled.",
    points: [
      "Crohn’s & Colitis UK: if your employer knows about your Crohn’s or Colitis, they may be able to make changes to help you do your job. Employers have a legal duty to consider making reasonable adjustments for employees with a disability.",
      "Acas: adjustments can include changing working arrangements, making changes to the workplace, providing equipment or support, flexible or home working, distributing breaks more evenly, and reasonable adjustments for absence including paid time off for medical appointments and treatment.",
      "Crohn’s & Colitis UK examples include: unlimited toilet breaks; moving your workstation close to a toilet; flexible or shorter hours; time off for medical appointments or treatment; working from home; a phased return after absence; and not including Crohn’s or Colitis time off in absence reviews or trigger points.",
      "GOV.UK: Access to Work will not pay for reasonable adjustments — those are changes your employer must legally make. Access to Work may help with extra practical support beyond that.",
      "Acas: nobody has to tell their employer they are disabled, but when they do, the employer has a legal responsibility to support them. Agreed adjustments should be confirmed in writing.",
    ],
    resources: [ACAS_ADJUSTMENTS, ACAS_ASKING, CCUK_EMPLOYEES, GOV_ACCESS_TO_WORK, GOV_DISABLED_AT_WORK],
  },
  {
    id: "explaining-ibd",
    title: "Explaining IBD to an employer",
    summary:
      "Crohn’s & Colitis UK says you do not have to tell your employer or a potential employer that you have Crohn’s or Colitis. If you do tell them you are disabled, they have a legal responsibility to support you.",
    points: [
      "It is your decision whether to tell your employer. Some people decide not to. Telling them can help them understand your needs and support you.",
      "If you are looking for a job, you do not have to tell a potential employer you are disabled. If you do, you could mention it at different stages — see the full employees’ guide.",
      "If you want support when you tell your employer, you could ask someone to be with you. You might find it useful to show them Crohn’s & Colitis UK’s guide for employers.",
      "Acas: when talking about disability and support needs, employers should arrange a meeting, listen, not make assumptions, and consider the person’s specific situation. Both sides can suggest adjustments.",
      "You do not have to tell colleagues, but Crohn’s & Colitis UK notes there can be benefits in letting others know.",
    ],
    resources: [CCUK_EMPLOYEES, CCUK_EMPLOYERS, ACAS_ASKING],
  },
  {
    id: "toilet-access",
    title: "Toilet access & urgency",
    summary:
      "Crohn’s & Colitis UK lists easy access to toilets and unlimited toilet breaks among adjustments that can make a big difference at work. Their employers’ guide also includes moving the workstation close to a toilet.",
    points: [
      "Examples from Crohn’s & Colitis UK include unlimited toilet breaks, moving your workstation close to a toilet, and making changes including stoma-friendly toilet facilities or use of a disabled toilet where wash hand basins are in the cubicle.",
      "Crohn’s & Colitis UK also mentions a Can’t Wait Card and RADAR key (membership / Disability Rights UK / local council), and the Toilet Map as a searchable website of public toilets.",
      "Their employers’ guide notes that working from home can take away the fear of urgently needing the toilet in public.",
      "Ask for adjustments that reduce toilet-related disadvantage — Acas says employers should talk with you and not make assumptions.",
    ],
    resources: [CCUK_EMPLOYEES, CCUK_EMPLOYERS, ACAS_ADJUSTMENTS],
  },
  {
    id: "fatigue",
    title: "Fatigue at work",
    summary:
      "Crohn’s & Colitis UK says fatigue is reported as one of the main reasons people with Crohn’s and Colitis have trouble at work. In 2024 they found managing fatigue was the biggest impact of living with Crohn’s or Colitis.",
    points: [
      "Their fatigue information suggests talking to work about your symptoms and, if needed, asking for reasonable adjustments such as reduced hours, working from home, or more flexible hours.",
      "Their employment guides list flexible or shorter hours, later starts (bowels may be more active in the morning), breaks when not feeling well, working from home, and adjusting performance targets to consider sick leave or fatigue.",
      "Working from home can help with fatigue as well as toilet urgency concerns.",
      "If you are struggling, Crohn’s & Colitis UK suggests speaking to someone — a friend or family member, HR, occupational health, or an Employee Assistance Programme if your workplace has one — and looking at their employment guide.",
    ],
    resources: [CCUK_FATIGUE_PDF, CCUK_EMPLOYEES, CCUK_EMPLOYERS],
  },
  {
    id: "appointments",
    title: "Appointments during work hours",
    summary:
      "Crohn’s & Colitis UK says you may need time off for medical appointments — for example an infusion during work hours. There is no legal right for your employer to give you time off for these appointments; they may ask you to make the time up or use holiday entitlement.",
    points: [
      "Many workplaces have a medical appointments policy covering whether you can take time off and whether you need to make time up.",
      "You may be able to ask for a reasonable adjustment for time off for appointments — for example changing your working hours so you can attend.",
      "Acas lists reasonable adjustments for absence, including paid time off for medical appointments and treatment, among example adjustments.",
      "GOV.UK also lists time off for medical treatment among example reasonable adjustments when you become disabled in employment.",
      "Check your contract and speak to your employer about what you are entitled to. Extra rights may be in your employment contract.",
    ],
    resources: [CCUK_EMPLOYEES, ACAS_ADJUSTMENTS, GOV_DISABLED_AT_WORK],
  },
  {
    id: "symptoms-worsen",
    title: "If symptoms suddenly worsen",
    summary:
      "For flare-ups, Crohn’s & Colitis UK says: if you have a personalised care and support plan, follow it. If you do not, contact your IBD team or GP. If you cannot contact them, call NHS 111 or your local out-of-hours service.",
    points: [
      "Crohn’s & Colitis UK: if you feel you need urgent care, phone 111. If you need emergency care, call 999. Go to hospital if you are advised to.",
      "They say go to A&E or call 999 if you have severe dehydration or malnourishment; are vomiting blood; have severe tummy pain with a high temperature and a rapid heartbeat; are bleeding non-stop from your bottom; or have a stoma you think might be blocked (see their flare-ups page for blockage signs).",
      "At work, their employment guide says time off may be needed for a flare-up. If you are struggling to continue working, speak to someone — HR, occupational health, a trusted colleague, or an EAP if available.",
      "IBD Advice Lines (where available) are for flare advice between appointments — not for emergencies. In an emergency use GP/urgent care, 111, or A&E as directed on Crohn’s & Colitis UK’s IBD services information.",
    ],
    resources: [CCUK_FLARE_UPS, CCUK_EMPLOYEES],
  },
];
