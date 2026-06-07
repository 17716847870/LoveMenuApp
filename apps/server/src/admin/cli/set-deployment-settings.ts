import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [scriptPath, workdir, timeoutSeconds, healthUrl] = process.argv.slice(2);

  if (!scriptPath || !workdir || !timeoutSeconds || !healthUrl) {
    throw new Error('Usage: set-deployment-settings <script_path> <workdir> <timeout_seconds> <health_url>');
  }

  const valueJson = {
    script_path: scriptPath,
    workdir,
    timeout_seconds: Number(timeoutSeconds),
    health_url: healthUrl,
  };

  await prisma.systemSetting.upsert({
    where: { key: 'admin.deployment' },
    create: {
      key: 'admin.deployment',
      valueJson,
      description: '后台部署配置',
      updatedBy: 1n,
    },
    update: {
      valueJson,
      updatedBy: 1n,
    },
  });

  console.log('Deployment settings saved');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
