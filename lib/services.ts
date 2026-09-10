// TradeCraft service catalog. Used by onboarding now, and later by
// opportunity discovery and matching. Web3 specialties follow the product
// spec naming rule: the normal skill plus " (Web3)", never a new category.
//
// Phase 1 note (recommendation R8): this catalog lives in code. When the
// admin panel arrives in Phase 7, it moves to a Firestore config document
// so admins can edit it without a code deploy.

export type ServiceOption = { id: string; label: string; group: string };

export const SERVICES: ServiceOption[] = [
  // Design
  { id: "web-design", label: "Web Design", group: "Design" },
  { id: "web-design-web3", label: "Web Design (Web3)", group: "Design" },
  { id: "ui-ux-design", label: "UI/UX Design", group: "Design" },
  { id: "graphic-design", label: "Graphic Design", group: "Design" },
  { id: "graphic-design-web3", label: "Graphic Design (Web3)", group: "Design" },
  { id: "logo-design", label: "Logo Design", group: "Design" },
  { id: "branding", label: "Branding", group: "Design" },
  { id: "illustration", label: "Illustration", group: "Design" },
  { id: "3d-design", label: "3D Design", group: "Design" },

  // Development
  { id: "web-development", label: "Web Development", group: "Development" },
  { id: "software-development", label: "Software Development", group: "Development" },
  { id: "mobile-app-development", label: "Mobile App Development", group: "Development" },

  // Writing and content
  { id: "copywriting", label: "Copywriting", group: "Writing & Content" },
  { id: "content-writing", label: "Content Writing", group: "Writing & Content" },

  // Marketing and growth
  { id: "seo", label: "SEO", group: "Marketing & Growth" },
  { id: "marketing", label: "Marketing", group: "Marketing & Growth" },
  { id: "email-marketing", label: "Email Marketing", group: "Marketing & Growth" },
  { id: "sales", label: "Sales", group: "Marketing & Growth" },

  // Community and social
  { id: "social-media-management", label: "Social Media Management", group: "Community & Social" },
  { id: "community-management", label: "Community Management", group: "Community & Social" },
  { id: "community-management-web3", label: "Community Management (Web3)", group: "Community & Social" },
  { id: "discord-moderation", label: "Discord Moderation", group: "Community & Social" },
  { id: "discord-moderation-web3", label: "Discord Moderation (Web3)", group: "Community & Social" },
  { id: "collab-management-web3", label: "Collab Management (Web3)", group: "Community & Social" },

  // Media
  { id: "video-editing", label: "Video Editing", group: "Media" },
  { id: "motion-design", label: "Motion Design", group: "Media" },
  { id: "photography", label: "Photography", group: "Media" },

  // Business and other
  { id: "virtual-assistance", label: "Virtual Assistance", group: "Business & Other" },
  { id: "data-analytics", label: "Data/Analytics", group: "Business & Other" },
  { id: "consulting", label: "Consulting", group: "Business & Other" },
];

export const SERVICE_GROUPS: string[] = [...new Set(SERVICES.map((s) => s.group))];