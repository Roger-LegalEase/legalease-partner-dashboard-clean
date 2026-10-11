import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { PacketInformationSection } from "@/lib/expungement-ai/packet-information";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";

export type PacketScreen = { id: string; section: PacketInformationSection | null; questions: ProfileQuestion[] };
export type PacketNavigationIntent = "stay" | "next" | "previous";
export function packetScreensFor(questions: ProfileQuestion[], sections: PacketInformationSection[]): PacketScreen[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const grouped = sections.map((section) => ({ id: section.id, section, questions: section.questionIds.map((id) => byId.get(id)).filter((question): question is ProfileQuestion => Boolean(question)) })).filter((screen) => screen.questions.length);
  const placed = new Set(grouped.flatMap((screen) => screen.questions.map((question) => question.id)));
  return [...grouped, ...questions.filter((question) => !placed.has(question.id)).map((question) => ({ id: question.id, section: null, questions: [question] }))];
}

/** Resolve a navigation intent only after the server recomputes active questions. */
export function packetNavigationDestination(before: PacketScreen[], after: PacketScreen[], currentId: string | null, intent: PacketNavigationIntent, answers: Record<string, AnswerValue>): string {
  const oldIndex = before.findIndex((screen) => screen.id === currentId);
  const newIndex = after.findIndex((screen) => screen.id === currentId);
  if (intent === "next" && newIndex >= 0) {
    const unanswered = after[newIndex].questions.some((question) => question.required && !question.contextOnly && ["unanswered", "invalid"].includes(questionAnswerState(question, answers[question.id])));
    return unanswered ? after[newIndex].id : after[newIndex + 1]?.id ?? "review";
  }
  if (intent === "previous") {
    const prior = before.slice(0, Math.max(0, oldIndex)).reverse().find((screen) => after.some((next) => next.id === screen.id));
    return prior?.id ?? after[0]?.id ?? "review";
  }
  if (newIndex >= 0 || currentId === "review") return currentId!;
  // A removed section moves to its first surviving successor, then predecessor.
  const successor = before.slice(oldIndex + 1).find((screen) => after.some((next) => next.id === screen.id));
  const predecessor = before.slice(0, Math.max(0, oldIndex)).reverse().find((screen) => after.some((next) => next.id === screen.id));
  return successor?.id ?? predecessor?.id ?? after[0]?.id ?? "review";
}
