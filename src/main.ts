import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ limit: '30mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const shutdown = async (signal?: string) => {
    if (signal) {
      console.log(`\nReceived ${signal}, closing Nest application...`);
    }
    await app.close();
    process.exit(0);
  };

  ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGBREAK', 'SIGUSR2', 'SIGHUP'].forEach((signal) => {
    try {
      process.on(signal as NodeJS.Signals, () => void shutdown(signal));
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes('Unknown signal')
      ) {
        throw error;
      }
    }
  });
}
bootstrap();
