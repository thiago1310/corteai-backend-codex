import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CustomNamingStrategy } from './CustomNamingstrategy';

export default function databaseConfig(): TypeOrmModuleOptions {
  const defaultSchema = process.env.DEFAULT_SCHEMA || 'public';
  const url = process.env.DATABASE_URL;

  if (url) {
    return {
      type: 'postgres',
      url,
      schema: defaultSchema,
      entities: [__dirname + '/../**/*.entity{.js,.ts}'],
      synchronize: true,
      namingStrategy: new CustomNamingStrategy(),
    };
  }

  return {
    type: (process.env.DB_TYPE as 'postgres') || 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    schema: defaultSchema,
    entities: [__dirname + '/../**/*.entity{.js,.ts}'],
    synchronize: true,
    namingStrategy: new CustomNamingStrategy(),
  };
}

