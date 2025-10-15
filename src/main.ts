import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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

  ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGBREAK'].forEach((signal) => {
    process.on(signal as NodeJS.Signals, () => void shutdown(signal));
  });
}
bootstrap();
