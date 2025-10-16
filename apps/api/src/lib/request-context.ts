import { AsyncLocalStorage } from 'node:async_hooks';

type Ctx = {
  userId?: string;
  tenantId?: string;
  email?: string;
  role?: string;
};

export const requestContext = new AsyncLocalStorage<Ctx>();

export function setRequestContext(ctx: Ctx) {
  const store = requestContext.getStore() || {};
  Object.assign(store, ctx);
}

export function getRequestContext(): Ctx {
  return requestContext.getStore() || {};
}
