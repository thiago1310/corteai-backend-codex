import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

export class CustomNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    const prefix = process.env.PREFIX_DB || '';
    console.log(prefix)
    const tableName = userSpecifiedName ? userSpecifiedName : snakeCase(targetName);
    const finalTableName = tableName.startsWith(prefix) ? tableName : `${prefix}${tableName}`;
    return finalTableName;
  }
}
