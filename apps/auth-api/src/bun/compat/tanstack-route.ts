export interface RouteContext {
  request: Request;
  params: Record<string, string>;
}

export type CapturedHandler = (context: RouteContext) => Response | Promise<Response>;

export interface CapturedRoute {
  path: string;
  handlers: Partial<Record<string, CapturedHandler>>;
}

interface RouteOptions {
  server?: { handlers?: Partial<Record<string, CapturedHandler>> };
}

const captured: CapturedRoute[] = [];

export function createFileRoute(path: string) {
  return (options: RouteOptions): RouteOptions => {
    captured.push({ path, handlers: options.server?.handlers ?? {} });
    return options;
  };
}

export function takeCapturedRoutes(): CapturedRoute[] {
  return captured.splice(0, captured.length);
}
