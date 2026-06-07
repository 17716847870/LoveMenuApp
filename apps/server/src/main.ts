import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AdminDeploymentsRealtimeService } from './admin/deployments/admin-deployments-realtime.service';
import { ApiErrorLoggingFilter } from './common/api-error-logging.filter';
import { requestIdMiddleware } from './common/request-context';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigin = process.env.ADMIN_ALLOWED_ORIGIN;

  app.setGlobalPrefix('api');
  app.use(requestIdMiddleware);
  app.enableCors({
    origin: allowedOrigin ? [allowedOrigin] : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiErrorLoggingFilter(app.get(PrismaService)));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  const realtimeService = app.get(AdminDeploymentsRealtimeService);
  app.getHttpServer().on('upgrade', (request, socket, head) => {
    const handled = realtimeService.handleUpgrade(request, socket, head);
    if (!handled) {
      socket.destroy();
    }
  });

  console.log(`LoveMenu server running at http://localhost:${port}/api`);
}

bootstrap();
