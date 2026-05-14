import type { Prisma } from "@prisma/client";
import type { WilmaAnalyticsEvent } from "@/wilma/analytics/types";

export type WilmaAnalyticsDatabase = {
  auditEvent?: {
    create(args: {
      data: {
        actorUserId?: string;
        action: string;
        targetType: "WilmaSession";
        targetId: string;
        metadata: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
};

export async function writeWilmaAnalyticsEvent(
  db: WilmaAnalyticsDatabase,
  event: WilmaAnalyticsEvent
): Promise<void> {
  await db.auditEvent?.create({
    data: {
      actorUserId: event.actorUserId,
      action: event.event,
      targetType: "WilmaSession",
      targetId: event.wilmaSessionId,
      metadata: JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue
    }
  });
}
