import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'crypto';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function promptValue(question: string) {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const username = process.argv[2] || (await promptValue('Admin username: '));
  const displayName = process.argv[3] || username;
  const password = process.argv[4] || randomBytes(12).toString('base64url');

  if (!username) {
    throw new Error('Admin username is required');
  }

  const admin = await prisma.adminUser.upsert({
    where: { username },
    create: {
      username,
      displayName,
      passwordHash: hashPassword(password),
      status: 'active',
    },
    update: {
      displayName,
      passwordHash: hashPassword(password),
      status: 'active',
    },
  });

  console.log(`Admin user ready: ${admin.username}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
