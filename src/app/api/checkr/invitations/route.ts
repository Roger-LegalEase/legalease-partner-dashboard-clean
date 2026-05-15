import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import {
  createCandidate,
  createInvitation,
  createLegalEaseCandidateCustomId
} from "@/lib/checkr";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

type InvitationRequestBody = {
  caseId?: string;
};

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json().catch(() => ({}))) as InvitationRequestBody;

  await prisma.user.upsert({
    where: { email: user.email },
    create: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    update: {
      role: user.role
    }
  });

  const shieldCase = body.caseId
    ? await prisma.shieldCase.findFirst({
        where: {
          id: body.caseId,
          owner: { email: user.email }
        },
        include: {
          providerInvitations: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      })
    : await prisma.shieldCase.findFirst({
        where: {
          owner: { email: user.email }
        },
        include: {
          providerInvitations: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { createdAt: "desc" }
      });

  if (!shieldCase) {
    return NextResponse.json({ error: "No case was found for this user." }, { status: 404 });
  }

  const existingInvitation = shieldCase.providerInvitations[0];

  if (existingInvitation?.invitationUrl) {
    return NextResponse.json({
      invitationUrl: existingInvitation.invitationUrl,
      providerInvitationId: existingInvitation.providerInvitationId
    });
  }

  const paidOrder = await prisma.productOrder.findFirst({
    where: {
      status: "PAID",
      productKey: { in: [shieldCase.productKey, "record_check"] },
      OR: [{ userId: user.id }, { email: user.email }]
    },
    orderBy: { paidAt: "desc" }
  });

  if (!paidOrder) {
    return NextResponse.json({ error: "A paid RecordShield case is required." }, { status: 402 });
  }

  if (!env.CHECKR_PACKAGE_SLUG) {
    return NextResponse.json({ error: "Checkr invitations are not configured." }, { status: 503 });
  }

  const customId = createLegalEaseCandidateCustomId(shieldCase.id);
  const existingCandidate = await prisma.providerCandidate.findUnique({
    where: { customId }
  });

  const candidate =
    existingCandidate ??
    (await persistCandidate({
      caseId: shieldCase.id,
      customId,
      email: user.email,
      userId: user.id
    }));

  const invitation = await createInvitation({
    candidateId: candidate.providerCandidateId,
    packageSlug: env.CHECKR_PACKAGE_SLUG,
    nodeCustomId: env.CHECKR_NODE_CUSTOM_ID
  });

  const providerInvitation = await prisma.providerInvitation.upsert({
    where: { providerInvitationId: invitation.id },
    create: {
      provider: "checkr",
      providerInvitationId: invitation.id,
      providerCandidateId: candidate.id,
      caseId: shieldCase.id,
      packageSlug: env.CHECKR_PACKAGE_SLUG,
      invitationUrl: invitation.invitation_url,
      status: invitation.status ?? "created",
      expiresAt: parseCheckrDate(invitation.expires_at),
      completedAt: parseCheckrDate(invitation.completed_at)
    },
    update: {
      invitationUrl: invitation.invitation_url,
      status: invitation.status ?? "created",
      expiresAt: parseCheckrDate(invitation.expires_at),
      completedAt: parseCheckrDate(invitation.completed_at)
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorUserId: user.id,
      actorEmail: user.email,
      action: "checkr.invitation.created",
      targetType: "ProviderInvitation",
      targetId: providerInvitation.id,
      metadata: {
        caseId: shieldCase.id,
        provider: "checkr",
        providerCandidateId: candidate.providerCandidateId,
        providerInvitationId: providerInvitation.providerInvitationId,
        packageSlug: env.CHECKR_PACKAGE_SLUG
      } satisfies Prisma.InputJsonValue
    }
  });

  return NextResponse.json(
    {
      invitationUrl: providerInvitation.invitationUrl,
      providerInvitationId: providerInvitation.providerInvitationId
    },
    { status: 201 }
  );
}

async function persistCandidate(input: {
  caseId: string;
  customId: string;
  email: string;
  userId: string;
}) {
  const candidate = await createCandidate({
    email: input.email,
    customId: input.customId
  });

  return prisma.providerCandidate.create({
    data: {
      provider: "checkr",
      providerCandidateId: candidate.id,
      customId: input.customId,
      email: input.email,
      userId: input.userId,
      caseId: input.caseId
    }
  });
}

function parseCheckrDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}
