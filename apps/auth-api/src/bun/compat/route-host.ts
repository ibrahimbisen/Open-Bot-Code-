import type { AccountServices } from "../services";

let current: AccountServices | null = null;
const sourceIps = new WeakMap<Request, string>();

export function bindRouteServices(services: AccountServices): void {
  current = services;
}

export function routeServices(): AccountServices {
  if (!current) throw new Error("The account services are not bound.");
  return current;
}

export function rememberSourceIp(request: Request, sourceIp: string): void {
  sourceIps.set(request, sourceIp);
}

export function rememberedSourceIp(request: Request): string {
  return sourceIps.get(request) ?? "127.0.0.1";
}
