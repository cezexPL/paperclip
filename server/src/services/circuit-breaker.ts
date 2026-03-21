import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";
import { logActivity } from "./activity-log.js";
import { publishLiveEvent } from "./live-events.js";
import { notFound } from "../errors.js";

export interface CircuitBreakerStatus {
  enabled: boolean;
  tripped: boolean;
  trippedAt: Date | null;
  tripReason: string | null;
  consecutiveFailures: number;
  consecutiveNoProgress: number;
  maxFailures: number;
  maxNoProgress: number;
}

export interface RunOutcome {
  outcome: "succeeded" | "failed" | "cancelled" | "timed_out";
  hadProgress: boolean;
}

export function circuitBreakerService(db: Db) {
  async function getAgent(agentId: string) {
    return db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((rows) => rows[0] ?? null);
  }

  return {
    getStatus: async (agentId: string): Promise<CircuitBreakerStatus> => {
      const agent = await getAgent(agentId);
      if (!agent) throw notFound("Agent not found");
      return {
        enabled: agent.circuitBreakerEnabled,
        tripped: agent.circuitBreakerTripped,
        trippedAt: agent.circuitBreakerTrippedAt,
        tripReason: agent.circuitBreakerTripReason,
        consecutiveFailures: agent.circuitBreakerConsecutiveFailures,
        consecutiveNoProgress: agent.circuitBreakerConsecutiveNoProgress,
        maxFailures: agent.circuitBreakerMaxFailures,
        maxNoProgress: agent.circuitBreakerMaxNoProgress,
      };
    },

    evaluateAfterRun: async (agentId: string, runOutcome: RunOutcome) => {
      const agent = await getAgent(agentId);
      if (!agent) return;
      if (!agent.circuitBreakerEnabled) return;
      if (agent.circuitBreakerTripped) return;

      const { outcome, hadProgress } = runOutcome;

      if (outcome === "cancelled") return;

      if (outcome === "succeeded" && hadProgress) {
        // Reset counters on successful run with progress
        if (agent.circuitBreakerConsecutiveFailures > 0 || agent.circuitBreakerConsecutiveNoProgress > 0) {
          await db
            .update(agents)
            .set({
              circuitBreakerConsecutiveFailures: 0,
              circuitBreakerConsecutiveNoProgress: 0,
              updatedAt: new Date(),
            })
            .where(eq(agents.id, agentId));
        }
        return;
      }

      let newFailures = agent.circuitBreakerConsecutiveFailures;
      let newNoProgress = agent.circuitBreakerConsecutiveNoProgress;

      if (outcome === "failed" || outcome === "timed_out") {
        newFailures += 1;
      }

      if (outcome === "succeeded" && !hadProgress) {
        newNoProgress += 1;
      }

      await db
        .update(agents)
        .set({
          circuitBreakerConsecutiveFailures: newFailures,
          circuitBreakerConsecutiveNoProgress: newNoProgress,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      // Check if we should trip
      let tripReason: string | null = null;
      if (newFailures >= agent.circuitBreakerMaxFailures) {
        tripReason = `${newFailures} consecutive failures (threshold: ${agent.circuitBreakerMaxFailures})`;
      } else if (newNoProgress >= agent.circuitBreakerMaxNoProgress) {
        tripReason = `${newNoProgress} consecutive runs with no progress (threshold: ${agent.circuitBreakerMaxNoProgress})`;
      }

      if (tripReason) {
        await tripBreaker(agentId, agent.companyId, tripReason);
      }
    },

    tripBreaker: async (agentId: string, reason: string) => {
      const agent = await getAgent(agentId);
      if (!agent) throw notFound("Agent not found");
      await tripBreaker(agentId, agent.companyId, reason);
    },

    resetBreaker: async (agentId: string) => {
      const agent = await getAgent(agentId);
      if (!agent) throw notFound("Agent not found");

      await db
        .update(agents)
        .set({
          circuitBreakerTripped: false,
          circuitBreakerTrippedAt: null,
          circuitBreakerTripReason: null,
          circuitBreakerConsecutiveFailures: 0,
          circuitBreakerConsecutiveNoProgress: 0,
          status: "idle",
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      await logActivity(db, {
        companyId: agent.companyId,
        actorType: "system",
        actorId: "circuit_breaker",
        action: "circuit_breaker.reset",
        entityType: "agent",
        entityId: agentId,
        agentId,
        details: { previousReason: agent.circuitBreakerTripReason },
      });

      publishLiveEvent({
        companyId: agent.companyId,
        type: "agent.circuit_breaker",
        payload: { agentId, tripped: false },
      });

      logger.info({ agentId }, "circuit breaker reset");
    },

    updateConfig: async (
      agentId: string,
      config: {
        enabled?: boolean;
        maxFailures?: number;
        maxNoProgress?: number;
      },
    ) => {
      const agent = await getAgent(agentId);
      if (!agent) throw notFound("Agent not found");

      const patch: Partial<typeof agents.$inferInsert> = { updatedAt: new Date() };
      if (config.enabled !== undefined) patch.circuitBreakerEnabled = config.enabled;
      if (config.maxFailures !== undefined) patch.circuitBreakerMaxFailures = Math.max(1, config.maxFailures);
      if (config.maxNoProgress !== undefined) patch.circuitBreakerMaxNoProgress = Math.max(1, config.maxNoProgress);

      const updated = await db
        .update(agents)
        .set(patch)
        .where(eq(agents.id, agentId))
        .returning()
        .then((rows) => rows[0] ?? null);

      return updated;
    },

    /**
     * Check if an agent should skip wake due to no actionable input and
     * repeated no-progress runs.
     */
    shouldSkipWake: async (agentId: string): Promise<{ skip: boolean; reason: string | null }> => {
      const agent = await getAgent(agentId);
      if (!agent) return { skip: false, reason: null };
      if (!agent.circuitBreakerEnabled) return { skip: false, reason: null };
      if (agent.circuitBreakerTripped) return { skip: true, reason: "circuit_breaker_tripped" };

      // Skip wake if we've had 2+ consecutive no-progress runs (conservative pre-trip gating)
      const noProgressThreshold = Math.max(2, Math.floor(agent.circuitBreakerMaxNoProgress / 2));
      if (agent.circuitBreakerConsecutiveNoProgress >= noProgressThreshold) {
        return { skip: true, reason: `no_progress_streak_${agent.circuitBreakerConsecutiveNoProgress}` };
      }

      return { skip: false, reason: null };
    },
  };

  async function tripBreaker(agentId: string, companyId: string, reason: string) {
    const now = new Date();
    await db
      .update(agents)
      .set({
        circuitBreakerTripped: true,
        circuitBreakerTrippedAt: now,
        circuitBreakerTripReason: reason,
        status: "paused",
        updatedAt: now,
      })
      .where(eq(agents.id, agentId));

    await logActivity(db, {
      companyId,
      actorType: "system",
      actorId: "circuit_breaker",
      action: "circuit_breaker.tripped",
      entityType: "agent",
      entityId: agentId,
      agentId,
      details: { reason },
    });

    publishLiveEvent({
      companyId,
      type: "agent.circuit_breaker",
      payload: { agentId, tripped: true, reason },
    });

    logger.warn({ agentId, reason }, "circuit breaker tripped — agent paused");
  }
}
