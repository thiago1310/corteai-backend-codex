import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, static as expressStatic, urlencoded } from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const server = app.getHttpAdapter().getInstance();
  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ limit: '30mb', extended: true }));
  app.use('/widget', expressStatic(join(process.cwd(), 'public', 'widget')));
  server.get('/chatbot-teste.html', (_req: unknown, res: { sendFile: (path: string) => void }) => {
    res.sendFile(join(process.cwd(), 'chatbot-teste.html'));
  });
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
