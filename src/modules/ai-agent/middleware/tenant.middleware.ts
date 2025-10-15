import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContextService } from '../tenant/tenant-context.service';

declare module 'express-serve-static-core' {
  interface Request {
    tenantSchema?: string;
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers['x-tenant-schema'];
    const schema = Array.isArray(header) ? header[0] : header;

    this.tenantContext.run(schema || '', () => {
      req.tenantSchema = this.tenantContext.getCurrentSchema();
      next();
    });
  }
}
