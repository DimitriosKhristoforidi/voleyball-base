import {
  playerHasSkills,
  playerSkillTotal,
  type ParticipantWithPlayer,
} from "@/types/domain";

export interface TeamAssignment {
  participantId: string;
  teamId: string | null;
}

/** Participant statuses that shouldn't be distributed into teams. */
const NON_PLAYING: ReadonlySet<string> = new Set(["cancelled", "absent"]);

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Bucket {
  teamId: string;
  total: number;
  count: number;
}

/**
 * Distribute a game's participants across the given teams.
 *
 * - Non-playing participants (cancelled/absent) are sent to the bench.
 * - If at least one playing participant has skills rated, teams are balanced
 *   by total skill (greedy: each rated player joins the weakest team; unrated
 *   players then fill the smallest teams).
 * - If nobody is rated, the split is purely random (round-robin).
 */
export function computeAutoSplit(
  participants: ParticipantWithPlayer[],
  teamIds: string[],
): TeamAssignment[] {
  if (teamIds.length === 0) return [];

  const assignments: TeamAssignment[] = [];
  const playing: ParticipantWithPlayer[] = [];

  for (const p of participants) {
    if (NON_PLAYING.has(p.status)) {
      if (p.team_id) assignments.push({ participantId: p.id, teamId: null });
    } else {
      playing.push(p);
    }
  }

  const buckets: Bucket[] = teamIds.map((teamId) => ({
    teamId,
    total: 0,
    count: 0,
  }));

  const anyRated = playing.some((p) => playerHasSkills(p.player));

  if (!anyRated) {
    // Pure random round-robin.
    shuffle(playing).forEach((p, i) => {
      const bucket = buckets[i % buckets.length];
      bucket.count += 1;
      assignments.push({ participantId: p.id, teamId: bucket.teamId });
    });
    return assignments;
  }

  const rated = playing
    .filter((p) => playerHasSkills(p.player))
    .map((p) => ({ p, score: playerSkillTotal(p.player) }))
    .sort((a, b) => b.score - a.score);
  const unrated = shuffle(playing.filter((p) => !playerHasSkills(p.player)));

  // Strongest players first, each into the currently weakest team.
  for (const { p, score } of rated) {
    const bucket = weakestByTotal(buckets);
    bucket.total += score;
    bucket.count += 1;
    assignments.push({ participantId: p.id, teamId: bucket.teamId });
  }

  // Unrated players fill the smallest teams to keep sizes even.
  for (const p of unrated) {
    const bucket = smallestByCount(buckets);
    bucket.count += 1;
    assignments.push({ participantId: p.id, teamId: bucket.teamId });
  }

  return assignments;
}

function weakestByTotal(buckets: Bucket[]): Bucket {
  return buckets.reduce((best, b) =>
    b.total < best.total || (b.total === best.total && b.count < best.count)
      ? b
      : best,
  );
}

function smallestByCount(buckets: Bucket[]): Bucket {
  return buckets.reduce((best, b) =>
    b.count < best.count || (b.count === best.count && b.total < best.total)
      ? b
      : best,
  );
}
