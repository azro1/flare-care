/** @typedef {{ id: string, title: string, paragraphs: string[] }} LegalSection */

export const LEGAL_LAST_UPDATED = '19 May 2026'

export const LEGAL_FOOTER_NOTE =
  'These documents explain how Flarecare handles your information and may be updated as the Service changes.'

export const PRIVACY_INTRO =
  'Flarecare helps people with inflammatory bowel disease (IBD) manage their condition day to day. This policy explains what data we collect, how we use it, and what choices are available to you.'

export const TERMS_INTRO =
  'These Terms explain your rights and responsibilities when you use Flarecare. Please read them together with our Privacy Policy.'

/** @type {LegalSection[]} */
export const PRIVACY_SECTIONS = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    paragraphs: [
      'The data controller is Simon Sutherland, operating Flarecare ("we", "us", "our").',
      'Contact: support@flarecare.app',
    ],
  },
  {
    id: 'scope',
    title: 'What this policy covers',
    paragraphs: [
      'This policy applies when you use the Flarecare website or mobile apps.',
      'It is written for UK users with UK GDPR and the Data Protection Act 2018 in mind. If you use Flarecare from another country, local laws may also apply.',
    ],
  },
  {
    id: 'what-we-collect',
    title: 'Information we collect',
    paragraphs: [
      'Account information you provide (such as email address and name) and information about how you sign in.',
      'Health-related information you choose to enter in the app.',
      'Technical information needed to run the service (such as keeping you signed in, notifications if you enable them, and basic device or app settings).',
      'We do not sell your personal data. We do not use third-party advertising or behavioural tracking tools inside Flarecare.',
    ],
  },
  {
    id: 'health-data',
    title: 'Health information',
    paragraphs: [
      'Health information you log may be special category data under UK GDPR.',
      'We process health information you choose to provide in order to deliver Flarecare to you, including storing and syncing your data across devices when you use an account.',
      'Where required under UK GDPR, we rely on your explicit consent, which you provide during sign-up and can withdraw at any time by deleting your account or contacting us (see Your rights).',
    ],
  },
  {
    id: 'legal-bases',
    title: 'Legal bases for processing',
    paragraphs: [
      'We process personal data on the following bases, depending on what the data is used for:',
      'Contract — to provide your account and the features of Flarecare you use.',
      'Legitimate interests — to keep the Service secure, prevent misuse, and maintain, secure, and improve the Service (balanced against your rights).',
      'Consent — for health information you log, and for optional features such as push notifications, where consent is required under UK GDPR.',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How we use your information',
    paragraphs: [
      'We use your information to operate Flarecare, including your account, the data you store in the app, and features you use.',
      'We use it to send service messages (such as sign-in codes) and, if you turn them on, reminders.',
      'We use it to show information on the home dashboard (such as weather) and to keep the service secure and to respond to support requests.',
    ],
  },
  {
    id: 'how-you-share',
    title: 'How you may share your information',
    paragraphs: [
      'Flarecare does not sell or publish your health information.',
      'You may choose to share information from the app in ways we provide, such as downloading an export or sending a summary by email to an address you enter (for example your doctor or nurse).',
      'We only send email on your behalf when you ask us to and provide the recipient\'s address. We do not share your data with clinicians or anyone else unless you take that step.',
    ],
  },
  {
    id: 'where-stored',
    title: 'Where we store information',
    paragraphs: [
      'Your data is stored using Supabase (cloud hosting and authentication). Data is transmitted over encrypted connections (HTTPS) and stored using industry-standard security measures provided by our hosting infrastructure.',
      'Some information is also held on your device (for example to keep you signed in or run notifications).',
      'When you use an account, your data is stored in the cloud so you can use it across devices. Flarecare is not a local-only app.',
    ],
  },
  {
    id: 'international-transfers',
    title: 'International transfers',
    paragraphs: [
      'Some of our service providers may process information outside the UK (for example in the European Economic Area or the United States).',
      'Where this happens, we rely on appropriate safeguards required by UK data protection law, such as provider contractual commitments or recognised transfer mechanisms.',
    ],
  },
  {
    id: 'sharing',
    title: 'When we share information with others',
    paragraphs: [
      'We share information only with service providers that help us run Flarecare, or when you choose to share as described above:',
      'Supabase — hosting, database, and authentication.',
      'Google — only if you sign in with Google.',
      'Our email provider — only when you use the in-app email feature to send a summary to an address you provide.',
      'Notification services (Apple / Google, via Expo) — only if you enable push notifications.',
      'OpenWeatherMap — to show weather on the home dashboard. Location information used for this (such as a default area or a region your device provides if you allow location access on the web) may be sent to fetch weather information.',
      'We do not share your health information with advertisers, data brokers, or insurers.',
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep information',
    paragraphs: [
      'We keep your information while your account is active.',
      'If you delete your account, we delete your associated data using our account-deletion process. Some provider backups may take a short time to clear.',
      'Support emails may be kept for as long as reasonably necessary to handle enquiries and maintain records.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    paragraphs: [
      'Under UK GDPR you may have rights to access, correct, erase, restrict, object to, or port your data, and to withdraw consent.',
      'You can delete your account in the app under Help → Delete account, or from Account on the website.',
      'To request a copy of your data or ask for corrections, email support@flarecare.app. We aim to respond within one month.',
      'If you have a concern about how we handle your data, we would appreciate the chance to address it first by contacting support@flarecare.app.',
      'You may also complain to the UK Information Commissioner\'s Office (ICO) at ico.org.uk.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'We use reasonable technical measures to protect your information. No online service can guarantee perfect security. Please keep your email account and device secure.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    paragraphs: [
      'Flarecare is not aimed at children under 16. If we learn that a child under 16 has provided personal information, we will take steps to delete it. Contact us at support@flarecare.app if you believe this has happened.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this policy. The latest version will be shown in the app and on our website with a new "Last updated" date.',
    ],
  },
]

/** @type {LegalSection[]} */
export const TERMS_SECTIONS = [
  {
    id: 'agreement',
    title: 'Agreement',
    paragraphs: [
      'These Terms of Use ("Terms") apply to the Flarecare website and mobile apps ("the Service"), operated by Simon Sutherland ("we", "us").',
      'By creating an account or using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.',
    ],
  },
  {
    id: 'not-medical',
    title: 'Not medical advice',
    paragraphs: [
      'Flarecare is an IBD health management tool. It does not provide medical advice, diagnosis, or treatment.',
      'Always speak to a qualified healthcare professional about your condition. Do not use Flarecare in an emergency. In the UK, call 999.',
      'Information in the app is for your own use and discussions with your care team. We are not responsible for clinical decisions made using the app.',
    ],
  },
  {
    id: 'eligibility',
    title: 'Who may use the Service',
    paragraphs: [
      'You must be at least 16 and able to enter a binding contract.',
      'You must provide accurate account details and keep your sign-in secure. You are responsible for activity on your account.',
    ],
  },
  {
    id: 'your-content',
    title: 'Your content',
    paragraphs: [
      'You own the information you submit. You give us permission to store and process it only to run the Service for you, as described in our Privacy Policy.',
      'You must not submit unlawful or misleading content or try to access another person\'s data.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    paragraphs: [
      'You must not misuse the Service (for example by breaking security, spreading malware, or breaking the law).',
      'We may suspend or end access if we reasonably believe you have broken these Terms or put the Service or others at risk.',
    ],
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    paragraphs: [
      'We try to keep Flarecare available but cannot promise uninterrupted access. We may change or remove features where practical.',
      'The Service relies on third parties (for example hosting and app stores). Outages outside our control may affect access.',
    ],
  },
  {
    id: 'account',
    title: 'Account and deletion',
    paragraphs: [
      'You may stop using the Service at any time.',
      'You may delete your account from Help → Delete account in the mobile app, or from Account on the website.',
      'We may suspend or close accounts that break these Terms or for legal or operational reasons, with notice where reasonable.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual property',
    paragraphs: [
      'Flarecare\'s name, branding, software, and design belong to us or our licensors. You may not copy them except as the law allows or we permit in writing.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    paragraphs: [
      'The Service is provided "as is" to the extent permitted by law. We do not exclude liability for death or personal injury from our negligence, fraud, or anything else that cannot be excluded under UK law.',
      'Otherwise, we are not liable for indirect or consequential loss, or for loss from relying on information in the app. Our total liability to you for claims about the Service in any 12-month period is limited to £100 or what you paid us in that period (which may be zero).',
    ],
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    paragraphs: [
      'You agree to cover reasonable claims against us arising from your misuse of the Service or breach of these Terms, except where we are at fault.',
    ],
  },
  {
    id: 'law',
    title: 'Governing law',
    paragraphs: [
      'These Terms are governed by the laws of England and Wales. The courts of England and Wales have jurisdiction, without affecting mandatory rights you may have elsewhere in the UK.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    paragraphs: ['Questions about these Terms: support@flarecare.app'],
  },
  {
    id: 'changes-terms',
    title: 'Changes',
    paragraphs: [
      'We may update these Terms. The latest version will be shown with a new date. Continued use after changes may mean you accept the updated Terms where the law allows.',
    ],
  },
]
