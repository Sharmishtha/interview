import type { Panelist } from "../types.js";

export function createPanelist(params: Panelist): Panelist {
  return { ...params };
}

/**
 * The two seats a VP of Engineering candidate actually faces at a public company:
 * the CTO, who will be their manager and probes technical depth, and the CEO, who
 * cares about predictability, spend, and whether this person can face the board.
 *
 * Voice IDs are ElevenLabs stock voices; swap them for your own.
 */
export const executivePanel: Panelist[] = [
  createPanelist({
    id: "cto",
    name: "Ravi Menon",
    role: "Chief Technology Officer",
    focus:
      "Architecture and build-versus-buy judgment, reliability and incident ownership, tech debt, org design, and whether the candidate is still trying to be the smartest engineer in the room.",
    voiceId: "pNInz6obpgDQGcFmaJgB",
  }),
  createPanelist({
    id: "ceo",
    name: "Claire Whitfield",
    role: "Chief Executive Officer",
    focus:
      "Hitting committed dates when guidance depends on them, R&D spend and efficiency, conflict with product and sales, and how this person communicates technical risk to a board.",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
  }),
];

export const panelistById = new Map(executivePanel.map((p) => [p.id, p]));
