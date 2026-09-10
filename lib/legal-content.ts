// TradeCraft legal documents, versioned. The version numbers here are what
// the acceptance record stores. Bump the version when content materially
// changes. A lawyer should review both documents before payments launch.

export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";
export const LEGAL_LAST_UPDATED = "September 2026";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export const TERMS: LegalDocument = {
  title: "Terms of Service",
  intro:
    "These Terms govern your use of TradeCraft. By creating an account you agree to them. Please read them carefully.",
  sections: [
    {
      heading: "1. What TradeCraft is",
      paragraphs: [
        "TradeCraft is an online platform for independent professionals. It helps members discover work opportunities, share opportunities with others, build a professional network, and use professional tools.",
        "TradeCraft is a platform and a community. We are not an employer, a recruitment agency, or a party to any agreement between members. Any work, payment, or contract arrangement between members is solely between those members.",
      ],
    },
    {
      heading: "2. Accounts",
      paragraphs: [
        "You must provide accurate information when creating an account, including a valid email address. You are responsible for keeping your password confidential and for all activity that happens under your account.",
        "One person may maintain one primary account. Creating additional accounts to circumvent restrictions, exploit referral rewards, or manipulate platform limits is not allowed.",
        "You must be at least 18 years old, or the age of legal majority in your country, to use TradeCraft.",
      ],
    },
    {
      heading: "3. Acceptable use",
      paragraphs: [
        "You agree not to: misuse the platform or its APIs; attempt to access data or systems you are not authorized to access; use automation, bots, or scripts to interact with the platform outside its intended interfaces; scrape, harvest, or bulk-collect content or member information; upload malicious code; impersonate other people or organizations; or use TradeCraft for any unlawful purpose.",
        "You agree not to manipulate the platform's credit, referral, or reward systems, including through multiple accounts, automated activity, fake engagement, or exploiting errors.",
      ],
    },
    {
      heading: "4. Referrals",
      paragraphs: [
        "TradeCraft may offer a referral program. Referral rewards are granted at TradeCraft's discretion and are subject to verification and anti-abuse checks. Rewards may be withheld, delayed, reduced, or reversed if we reasonably believe a referral is not genuine, is self-referred, is generated through duplicate or fake accounts, or otherwise abuses the program.",
        "Referral rewards have no cash value unless explicitly stated, and may not be sold or transferred.",
      ],
    },
    {
      heading: "5. Credits and Premium",
      paragraphs: [
        "Certain features may require credits. Credits are a limited license to use platform features, have no cash value, and are not refundable unless required by law. Credits granted free of charge (daily allowances, bonuses, rewards) may change in amount or availability at any time.",
        "Optional paid subscriptions (Premium) may be offered. Prices, billing periods, and features will be clearly displayed before purchase. Subscriptions renew as described at purchase and can be canceled at any time from your account settings.",
      ],
    },
    {
      heading: "6. Content and opportunities",
      paragraphs: [
        "You keep ownership of content you post. By posting, you grant TradeCraft a worldwide, non-exclusive license to display and distribute that content within the platform for the purpose of operating the service.",
        "You are responsible for the opportunities, posts, and links you share. Do not post false, misleading, fraudulent, or harmful content. Opportunity listings discovered from external sources are provided for information only; TradeCraft does not endorse them and is not responsible for their accuracy.",
      ],
    },
    {
      heading: "7. Moderation and account restrictions",
      paragraphs: [
        "To keep TradeCraft safe we may review reports, limit features, remove content, temporarily suspend accounts, or disable accounts that violate these Terms. Where practical, temporary suspensions come with a reason and an end time, and serious or repeated violations can lead to permanent disabling.",
        "If your account is restricted, you may contact support to request a review. We may decline actions that would expose our security processes or other members to risk.",
      ],
    },
    {
      heading: "8. Third-party services",
      paragraphs: [
        "TradeCraft relies on third-party providers for infrastructure and functionality, currently including Google Firebase (authentication, database, hosting-related services), Resend (email delivery), and Vercel (web hosting). Third-party logos, trademarks, and external platforms referenced in opportunities belong to their owners.",
        "Integrations with external platforms (such as social networks) are provided only where those platforms' official terms and APIs permit. TradeCraft does not guarantee availability of any third-party integration.",
      ],
    },
    {
      heading: "9. Disclaimers and limitations",
      paragraphs: [
        "TradeCraft is provided on an as-is and as-available basis. We do not guarantee that opportunities discovered through the platform are accurate, available, or suitable, and we do not guarantee uninterrupted or error-free service.",
        "To the maximum extent permitted by law, TradeCraft is not liable for indirect, incidental, or consequential damages, or for lost profits, opportunities, or data, arising from your use of the platform.",
      ],
    },
    {
      heading: "10. Changes to these Terms",
      paragraphs: [
        "We may update these Terms. When changes are material, we will notify you through the platform or by email, and may ask you to review and accept the new version before continuing to use affected features. Continued use after changes take effect constitutes acceptance.",
      ],
    },
    {
      heading: "11. Contact",
      paragraphs: [
        "Questions about these Terms can be sent through the support channels published on the TradeCraft website.",
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  title: "Privacy Policy",
  intro:
    "The short version: we collect what we need to run TradeCraft, we never sell your data, and you can request a copy or deletion of your data at any time. The details:",
  sections: [
    {
      heading: "1. What we collect",
      paragraphs: [
        "Account details you give us: email address, username, display name, professional title, country, timezone, experience, and any links you add.",
        "Sign-in details: if you use Google sign-in, we receive your email and basic profile from Google. We never see your Google password.",
        "Platform activity: leads, prompts, posts, referrals, and notifications.",
        "Security data: at key security moments we store a hashed (permanently scrambled) form of your IP address and your browser type. Raw IP addresses are never stored with your account.",
      ],
    },
    {
      heading: "2. How we use it",
      paragraphs: [
        "To run your account, verify your email, protect the platform from abuse and fraud, send transactional email such as verification codes, and provide support.",
        "We do not sell your personal data, and we do not use it for third-party advertising.",
      ],
    },
    {
      heading: "3. Cookies and local storage",
      paragraphs: [
        "A login cookie keeps you signed in. A small stored reminder keeps a referral code between pages. Nothing here tracks you across other websites.",
      ],
    },
    {
      heading: "4. Service providers",
      paragraphs: [
        "Google Firebase (accounts and database), Resend (email delivery), and Vercel (hosting) process data on our behalf under their own privacy and security terms.",
      ],
    },
    {
      heading: "5. Your choices",
      paragraphs: [
        "Your profile is editable anytime in your settings. You can request a copy or deletion of your data through support. Deleting your account removes your profile and workspace data, except records we must keep for security or legal reasons.",
      ],
    },
    {
      heading: "6. Changes",
      paragraphs: [
        "If this policy changes in a material way, we will announce it in the platform and update the version number at the top of this page.",
      ],
    },
  ],
};