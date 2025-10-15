import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomNamingStrategy } from "./CustomNamingstrategy";



export default function databaseConfig(): TypeOrmModule {
  return {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: [__dirname + '/../**/*.entity{.js,.ts}'],
    synchronize: true,
    namingStrategy: new CustomNamingStrategy()
  }
}

