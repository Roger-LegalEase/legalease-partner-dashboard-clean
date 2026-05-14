import { prisma } from "@/lib/prisma";

export async function findCheckrCasesMissingCompletedReports(thresholdHours = 24) {
  const threshold = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  return prisma.shieldCase.findMany({
    where: {
      status: "IN_REVIEW",
      providerInvitations: {
        some: {
          status: "completed",
          updatedAt: {
            lt: threshold
          }
        }
      },
      providerReports: {
        none: {
          status: "complete"
        }
      }
    },
    select: {
      id: true,
      ownerId: true,
      displayName: true,
      updatedAt: true
    }
  });
}

export async function alertOnCheckrCasesMissingCompletedReports() {
  const cases = await findCheckrCasesMissingCompletedReports();

  if (cases.length > 0) {
    console.warn("Checkr cases missing report.completed webhook", {
      count: cases.length,
      caseIds: cases.map((item) => item.id)
    });
  }

  return cases;
}
