import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantSchema = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ tenantSchema?: string }>();
    const schemaFromRequest = request.tenantSchema;
    if (typeof schemaFromRequest === 'string' && schemaFromRequest.length > 0) {
      return schemaFromRequest;
    }
    return process.env.DEFAULT_SCHEMA || 'public';
  },
);
