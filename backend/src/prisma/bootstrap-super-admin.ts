import { isAbsolute } from 'node:path';
import { PrismaService } from './prisma.service.js';

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  const database = process.env.NEXORA_RUNTIME_DATABASE_URL;
  if (
    process.env.NODE_ENV !== 'development' ||
    !email ||
    process.argv.length !== 3 ||
    !database?.startsWith('file:') ||
    !isAbsolute(database.slice(5))
  ) {
    throw new Error(
      'Use development mode, an explicit absolute runtime SQLite URL, and one existing administrator email.',
    );
  }

  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    await prisma.$transaction(async (tx) => {
      // Obtain the SQLite write lock before inspecting role invariants.
      await tx.$executeRaw`
        UPDATE "User" SET "sessionVersion" = "sessionVersion"
        WHERE "email" = ${email}
      `;
      const user = await tx.user.findUnique({
        where: { email },
        include: { role: true },
      });
      if (!user || user.status !== 'ACTIVE' || user.mustChangePassword) {
        throw new Error('Choose an active administrator who completed password setup.');
      }
      if (user.role.name === 'SUPER_ADMIN') return;
      if (user.role.name !== 'ADMIN') {
        throw new Error('Only an existing Administrator may be bootstrapped.');
      }
      const existing = await tx.user.count({
        where: {
          role: { name: 'SUPER_ADMIN' },
          status: 'ACTIVE',
          mustChangePassword: false,
        },
      });
      if (existing > 0) {
        throw new Error('A usable Super Admin already exists. Use staff management.');
      }
      const role = await tx.role.upsert({
        where: { name: 'SUPER_ADMIN' },
        update: {},
        create: { name: 'SUPER_ADMIN', description: 'System owner' },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { roleId: role.id, sessionVersion: { increment: 1 } },
      });
      const now = new Date();
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.staffSetupToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });
      await tx.auditLog.create({
        data: {
          action: 'staff.super_admin.bootstrapped',
          entityType: 'User',
          entityId: user.id,
          detailsJson: JSON.stringify({
            version: 1,
            source: 'owner_cli',
            previousRole: 'ADMIN',
            role: 'SUPER_ADMIN',
            sessionsRevoked: true,
          }),
        },
      });
    });
    console.log('Super Admin is configured. Sign in again.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Bootstrap failed.');
  process.exitCode = 1;
});
