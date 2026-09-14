// The provider registry. The Scout page reads it to render source cards;
// the run route reads it to execute runs. Adding a platform later means
// one new file and one line here.

import type { ScoutProvider } from "./types";
import { feedsProvider } from "./feeds";
import { redditProvider } from "./reddit";

export const SCOUT_PROVIDERS: ScoutProvider[] = [feedsProvider, redditProvider];

export function getScoutProvider(id: string): ScoutProvider | null {
  return SCOUT_PROVIDERS.find((p) => p.id === id) ?? null;
}