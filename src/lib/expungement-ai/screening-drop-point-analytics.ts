import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type ScreeningSessionStatus = "in_progress" | "resumed" | "completed" | "abandoned";

export type ScreeningDropPointSourceRow = {
  session_id: string;
  jurisdiction: string;
  current_question_id: string | null;
  last_drop_question: string | null;
  furthest_stage: string | null;
  status: ScreeningSessionStatus;
  created_at: string;
  updated_at: string;
  resume_sent_at: string | null;
  resume_token_rotated_at: string | null;
};

export type DerivedScreeningDropPoint = {
  sessionRef: string;
  questionId: string;
  jurisdiction: string;
  furthestStage: string | null;
  droppedAt: string;
  outcome: "resumed" | "went_dark";
};

export type ScreeningDropPointAggregateRow = {
  question_id: string;
  jurisdiction: string;
  furthest_stage: string | null;
  drop_count: number;
  resumed_count: number;
  went_dark_count: number;
  went_dark_rate: number;
};

const PAGE_SIZE = 1000;

export async function getScreeningDropPointAnalytics(
  supabase: Pick<SupabaseClient, "from">
): Promise<ScreeningDropPointAggregateRow[]> {
  const rows: ScreeningDropPointSourceRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("screening_sessions")
      .select([
        "session_id",
        "jurisdiction",
        "current_question_id",
        "last_drop_question",
        "furthest_stage",
        "status",
        "created_at",
        "updated_at",
        "resume_sent_at",
        "resume_token_rotated_at"
      ].join(","))
      .not("resume_sent_at", "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as ScreeningDropPointSourceRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return aggregateScreeningDropPoints(rows);
}

export function deriveScreeningDropPoint(row: ScreeningDropPointSourceRow): DerivedScreeningDropPoint | null {
  if (!row.resume_sent_at) return null;

  const questionId = row.last_drop_question ?? row.current_question_id;
  if (!questionId) return null;

  return {
    sessionRef: row.session_id,
    questionId,
    jurisdiction: row.jurisdiction,
    furthestStage: row.furthest_stage,
    droppedAt: row.resume_sent_at ?? row.updated_at ?? row.created_at,
    outcome: row.status === "resumed" || row.status === "completed" ? "resumed" : "went_dark"
  };
}

export function aggregateScreeningDropPoints(rows: ScreeningDropPointSourceRow[]): ScreeningDropPointAggregateRow[] {
  const groups = new Map<string, ScreeningDropPointAggregateRow>();

  for (const row of rows) {
    const dropPoint = deriveScreeningDropPoint(row);
    if (!dropPoint) continue;

    const key = [
      dropPoint.questionId,
      dropPoint.jurisdiction,
      dropPoint.furthestStage ?? ""
    ].join("\u001f");
    const aggregate = groups.get(key) ?? {
      question_id: dropPoint.questionId,
      jurisdiction: dropPoint.jurisdiction,
      furthest_stage: dropPoint.furthestStage,
      drop_count: 0,
      resumed_count: 0,
      went_dark_count: 0,
      went_dark_rate: 0
    };

    aggregate.drop_count += 1;
    if (dropPoint.outcome === "resumed") {
      aggregate.resumed_count += 1;
    } else {
      aggregate.went_dark_count += 1;
    }
    aggregate.went_dark_rate = aggregate.drop_count === 0 ? 0 : aggregate.went_dark_count / aggregate.drop_count;
    groups.set(key, aggregate);
  }

  return [...groups.values()].sort((left, right) => (
    right.drop_count - left.drop_count
    || right.went_dark_rate - left.went_dark_rate
    || left.question_id.localeCompare(right.question_id)
    || left.jurisdiction.localeCompare(right.jurisdiction)
    || (left.furthest_stage ?? "").localeCompare(right.furthest_stage ?? "")
  ));
}
