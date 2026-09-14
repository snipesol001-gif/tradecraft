// Reddit provider configuration. The status is current and honest:
// Reddit's Responsible Builder Policy gates app creation and API access,
// and a commercial access request is the legitimate path. Until approval
// is granted, run() is unreachable and nothing is fabricated. When
// access arrives: implement run() with official OAuth, flip status to
// "active", and nothing else in Scout changes.

import type { ScoutProvider } from "./types";

export const redditProvider: ScoutProvider = {
  id: "reddit",
  label: "Reddit",
  description:
    "Public posts from relevant communities where people genuinely ask for freelance help.",
  status: "pending_approval",
  statusNote:
    "Reddit requires API approval under its Responsible Builder Policy before Scout can search it. Access request planned. This card updates the moment approval lands.",
  pricing: "per_discovery",
  async run() {
    throw new Error("PROVIDER_NOT_ACTIVE");
  },
};