import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import type { AutomationRule } from '../models/index.js';

export async function automationRoutes(fastify: FastifyInstance) {
  // List rules
  fastify.get('/', async (request) => {
    const query = request.query as { homeId?: string };
    const homeId = query.homeId || 'home_flurry_1';

    let rawRules = await prisma.automationRule.findMany({
      where: { homeId },
      include: { runs: { take: 5, orderBy: { triggeredAt: 'desc' } } },
    });

    if (rawRules.length === 0) {
      // Seed default baseline safety automation rules
      const rule1 = await prisma.automationRule.create({
        data: {
          id: 'rule_tank_autofill',
          homeId,
          name: 'Overhead Tank Auto-Refill',
          description: 'Starts borewell pump when water level drops below 25%',
          enabled: true,
          status: 'active',
          isSafety: false,
          trigger: JSON.stringify({
            type: 'sensor_value',
            deviceId: 'dev_overhead_tank_1',
            capability: 'level',
            operator: 'lt',
            value: 25,
          }),
          actions: JSON.stringify([
            {
              type: 'set_capability',
              deviceId: 'dev_borewell_pump_1',
              capability: 'power',
              value: true,
            },
          ]),
        },
        include: { runs: true },
      });

      const rule2 = await prisma.automationRule.create({
        data: {
          id: 'rule_tank_overflow_cutoff',
          homeId,
          name: 'Overhead Tank Overflow Cutoff (Safety)',
          description: 'Immediately stops borewell pump when tank level reaches 95%',
          enabled: true,
          status: 'active',
          isSafety: true,
          trigger: JSON.stringify({
            type: 'sensor_value',
            deviceId: 'dev_overhead_tank_1',
            capability: 'level',
            operator: 'gte',
            value: 95,
          }),
          actions: JSON.stringify([
            {
              type: 'set_capability',
              deviceId: 'dev_borewell_pump_1',
              capability: 'power',
              value: false,
            },
          ]),
        },
        include: { runs: true },
      });

      rawRules = [rule1, rule2];
    }

    const rules: AutomationRule[] = rawRules.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      enabled: r.enabled,
      status: r.status as any,
      isSafety: r.isSafety,
      trigger: JSON.parse(r.trigger),
      conditionGroup: r.conditionGroup ? JSON.parse(r.conditionGroup) : undefined,
      actions: JSON.parse(r.actions),
      lastTriggered: r.lastTriggered ? r.lastTriggered.toISOString() : undefined,
      executionHistory: r.runs.map((run) => ({
        ruleId: run.ruleId,
        triggeredAt: run.triggeredAt.toISOString(),
        result: run.result as any,
        description: run.description || undefined,
        error: run.error || undefined,
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return { success: true, rules };
  });

  // Toggle rule
  fastify.patch('/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.automationRule.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ success: false, message: 'Rule not found' });
    }

    const updated = await prisma.automationRule.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });

    return { success: true, rule: updated };
  });

  // Create rule
  fastify.post('/', async (request, reply) => {
    const schema = z.object({
      homeId: z.string().default('home_flurry_1'),
      name: z.string().min(1),
      description: z.string().optional(),
      isSafety: z.boolean().default(false),
      trigger: z.record(z.any()),
      conditionGroup: z.record(z.any()).optional(),
      actions: z.array(z.record(z.any())),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.format() });
    }

    const created = await prisma.automationRule.create({
      data: {
        homeId: parsed.data.homeId,
        name: parsed.data.name,
        description: parsed.data.description,
        isSafety: parsed.data.isSafety,
        trigger: JSON.stringify(parsed.data.trigger),
        conditionGroup: parsed.data.conditionGroup ? JSON.stringify(parsed.data.conditionGroup) : null,
        actions: JSON.stringify(parsed.data.actions),
      },
    });

    return { success: true, rule: created };
  });

  // Delete rule
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.automationRule.delete({ where: { id } });
      return { success: true, message: 'Rule deleted' };
    } catch {
      return reply.status(404).send({ success: false, message: 'Rule not found' });
    }
  });
}
