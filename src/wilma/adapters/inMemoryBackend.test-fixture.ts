import type {
  WilmaChatBackend,
  WilmaChatFacts,
  WilmaChatMessageRole,
  WilmaChatSession
} from "@/wilma/chat/orchestrator";
import type { WilmaCheckoutBackend, WilmaCheckoutMetadata } from "@/wilma/chat/checkout";
import type { WilmaAnalyticsEvent } from "@/wilma/analytics/types";

export type InMemoryWilmaMessage = {
  sessionId: string;
  userId: string;
  role: WilmaChatMessageRole;
  content: string;
  metadata?: Record<string, unknown>;
};

export type InMemoryWilmaBackend = WilmaChatBackend & WilmaCheckoutBackend & {
  sessions: WilmaChatSession[];
  messages: InMemoryWilmaMessage[];
  leads: Array<{ sessionId: string; email: string; consent: boolean }>;
  checkouts: Array<{ sessionId: string; email: string; metadata: WilmaCheckoutMetadata }>;
  auditEvents: WilmaAnalyticsEvent[];
  sessionCreatedAt: Map<string, Date>;
  sessionLastMessageAt: Map<string, Date>;
  ipSessionCounts: Map<string, number>;
  deviceSessionCounts: Map<string, number>;
  ipChatRequestCounts: Map<string, number>;
};

export function createInMemoryWilmaBackend(): InMemoryWilmaBackend {
  const sessions: WilmaChatSession[] = [];
  const messages: InMemoryWilmaMessage[] = [];
  const leads: Array<{ sessionId: string; email: string; consent: boolean }> = [];
  const checkouts: Array<{ sessionId: string; email: string; metadata: WilmaCheckoutMetadata }> = [];
  const auditEvents: WilmaAnalyticsEvent[] = [];
  const sessionCreatedAt = new Map<string, Date>();
  const sessionLastMessageAt = new Map<string, Date>();
  const ipSessionCounts = new Map<string, number>();
  const deviceSessionCounts = new Map<string, number>();
  const ipChatRequestCounts = new Map<string, number>();

  return {
    sessions,
    messages,
    leads,
    checkouts,
    auditEvents,
    sessionCreatedAt,
    sessionLastMessageAt,
    ipSessionCounts,
    deviceSessionCounts,
    ipChatRequestCounts,

    async loadSession({ sessionId, userId }) {
      return sessions.find((session) => session.id === sessionId && session.userId === userId) ?? null;
    },

    async createSession({ userId, email, facts }) {
      const session: WilmaChatSession = {
        id: `wilma_session_${sessions.length + 1}`,
        userId,
        email: email ?? null,
        facts: facts ?? {},
        decision: null
      };
      sessions.push(session);
      const now = new Date();
      sessionCreatedAt.set(session.id, now);
      sessionLastMessageAt.set(session.id, now);
      return session;
    },

    async saveMessage(message) {
      messages.push({ ...message });
      sessionLastMessageAt.set(message.sessionId, new Date());
    },

    async updateSession({ sessionId, userId, email, facts, decision }) {
      const session = sessions.find((candidate) => candidate.id === sessionId && candidate.userId === userId);

      if (!session) {
        throw new Error("Session not found.");
      }

      session.email = email ?? session.email;
      session.facts = { ...facts } satisfies WilmaChatFacts;
      session.decision = decision ?? null;

      return session;
    },

    async captureLead({ sessionId, email, consent }) {
      const session = sessions.find((candidate) => candidate.id === sessionId);

      if (!session) {
        throw new Error("Session not found.");
      }

      session.email = email;
      leads.push({ sessionId, email, consent });

      return session;
    },

    async loadCheckoutSession({ sessionId }) {
      return sessions.find((session) => session.id === sessionId) ?? null;
    },

    async createCheckoutSession({ sessionId, email, metadata }) {
      checkouts.push({ sessionId, email, metadata });

      return {
        checkoutUrl: `https://checkout.test/${sessionId}`
      };
    },

    async trackWilmaEvent(event) {
      auditEvents.push(event);
    },

    async getSessionUsage({ sessionId }) {
      const session = sessions.find((candidate) => candidate.id === sessionId);
      if (!session) {
        return null;
      }
      return {
        userMessageCount: messages.filter((message) => message.sessionId === sessionId && message.role === "user").length,
        createdAt: sessionCreatedAt.get(sessionId),
        lastMessageAt: sessionLastMessageAt.get(sessionId)
      };
    },

    async countSessionsByEmailSince({ email }) {
      return sessions.filter((session) => session.email === email).length;
    },

    async countSessionsByIpSince({ ip }) {
      return ipSessionCounts.get(ip) ?? 0;
    },

    async countSessionsByDeviceSince({ deviceId }) {
      return deviceSessionCounts.get(deviceId) ?? 0;
    },

    async countChatRequestsByIpSince({ ip }) {
      return ipChatRequestCounts.get(ip) ?? 0;
    }
  };
}
