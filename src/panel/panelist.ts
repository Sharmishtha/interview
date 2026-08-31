import type { Panelist } from "../types.js";

export function createPanelist(params: Panelist): Panelist {
  return { ...params };
}

/**
 * A four-person executive panel. Each seat pushes on a different axis, which is
 * what makes the transcript cover the rubric rather than circling one topic.
 * Voice IDs are ElevenLabs stock voices; swap them for your own.
 */
export const executivePanel: Panelist[] = [
  createPanelist({
    id: "board-chair",
    name: "Eleanor Vance",
    role: "Board Chair",
    focus: "Strategic bets, capital allocation, and whether the candidate can be trusted with the mandate.",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
  }),
  createPanelist({
    id: "ceo",
    name: "Marcus Hale",
    role: "Chief Executive Officer",
    focus: "Execution rigor, operating cadence, and how the candidate handles being wrong.",
    voiceId: "pNInz6obpgDQGcFmaJgB",
  }),
  createPanelist({
    id: "chro",
    name: "Priya Raman",
    role: "Chief People Officer",
    focus: "Team building, hard people calls, succession, and self-awareness.",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
  }),
  createPanelist({
    id: "cfo",
    name: "David Okonjo",
    role: "Chief Financial Officer",
    focus: "P&L ownership, unit economics, and whether the numbers hold up under pressure.",
    voiceId: "TxGEqnHWrfWFTfGW9XjX",
  }),
];

export const panelistById = new Map(executivePanel.map((p) => [p.id, p]));
