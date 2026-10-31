import { prisma } from "@/lib/prisma";
import type { ChatterEntry } from "@/components/chatter";

export async function loadChatter(entityName: string, entityId: string): Promise<ChatterEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: { entityName, entityId },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { actor: { select: { firstName: true, lastName: true } } },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    message: log.message,
    createdAt: log.createdAt,
    actorName: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : null,
  }));
}
