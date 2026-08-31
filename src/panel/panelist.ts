import type { Panelist } from "../types.js";

export function createPanelist(params: {
  id: string;
  name: string;
  role: string;
  expertiseAreas: string[];
  voiceId?: string;
}): Panelist {
  return { ...params };
}

/** A small starter panel covering common technical-interview angles. */
export const defaultPanel: Panelist[] = [
  createPanelist({
    id: "panelist-tech",
    name: "Ada",
    role: "Technical Lead",
    expertiseAreas: ["algorithms", "system design", "code quality"],
  }),
  createPanelist({
    id: "panelist-behavioral",
    name: "Grace",
    role: "Engineering Manager",
    expertiseAreas: ["collaboration", "communication", "leadership"],
  }),
  createPanelist({
    id: "panelist-domain",
    name: "Alan",
    role: "Domain Expert",
    expertiseAreas: ["role-specific knowledge", "problem solving"],
  }),
];
