import { apiError } from "./responses";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RouteParams = Readonly<Record<string, string>>;

export interface RouteRequest {
  request: Request;
  url: URL;
  params: RouteParams;
  sourceIp: string;
}

export type RouteHandler = (context: RouteRequest) => Response | Promise<Response>;

interface Route {
  method: HttpMethod;
  segments: readonly Segment[];
  handler: RouteHandler;
}

type Segment = { kind: "text"; value: string } | { kind: "parameter"; name: string };

export type RouteMatch =
  | { kind: "found"; handler: RouteHandler; params: RouteParams }
  | { kind: "method"; allowed: HttpMethod[] }
  | { kind: "missing" };

function pathSegments(pathname: string): string[] | null {
  if (!pathname.startsWith("/")) return null;
  const trimmed = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const segments: string[] = [];
  for (const part of trimmed.slice(1).split("/")) {
    try {
      segments.push(decodeURIComponent(part));
    } catch {
      return null;
    }
  }
  return segments;
}

export class Router {
  readonly #routes: Route[] = [];

  add(method: HttpMethod, pattern: string, handler: RouteHandler): this {
    const segments = pattern
      .slice(1)
      .split("/")
      .map(
        (part): Segment =>
          part.startsWith(":") ? { kind: "parameter", name: part.slice(1) } : { kind: "text", value: part },
      );
    if (this.#routes.some((route) => route.method === method && samePattern(route.segments, segments))) {
      throw new Error(`The route ${method} ${pattern} is registered two times.`);
    }
    this.#routes.push({ method, segments, handler });
    return this;
  }

  get(pattern: string, handler: RouteHandler): this {
    return this.add("GET", pattern, handler);
  }

  post(pattern: string, handler: RouteHandler): this {
    return this.add("POST", pattern, handler);
  }

  put(pattern: string, handler: RouteHandler): this {
    return this.add("PUT", pattern, handler);
  }

  patch(pattern: string, handler: RouteHandler): this {
    return this.add("PATCH", pattern, handler);
  }

  delete(pattern: string, handler: RouteHandler): this {
    return this.add("DELETE", pattern, handler);
  }

  patterns(): string[] {
    return this.#routes.map((route) => `${route.method} /${route.segments.map(segmentText).join("/")}`);
  }

  match(requestMethod: string, pathname: string): RouteMatch {
    const method = requestMethod === "HEAD" ? "GET" : requestMethod;
    const segments = pathSegments(pathname);
    if (!segments) return { kind: "missing" };
    const allowed: HttpMethod[] = [];
    let best: { route: Route; params: RouteParams; literals: number } | null = null;
    for (const route of this.#routes) {
      const params = matchSegments(route.segments, segments);
      if (!params) continue;
      if (route.method !== method) {
        if (!allowed.includes(route.method)) allowed.push(route.method);
        continue;
      }
      const literals = route.segments.filter((segment) => segment.kind === "text").length;
      if (!best || literals > best.literals) best = { route, params, literals };
    }
    if (best) return { kind: "found", handler: best.route.handler, params: best.params };
    return allowed.length > 0 ? { kind: "method", allowed } : { kind: "missing" };
  }
}

function segmentText(segment: Segment): string {
  return segment.kind === "text" ? segment.value : `:${segment.name}`;
}

function samePattern(left: readonly Segment[], right: readonly Segment[]): boolean {
  return (
    left.length === right.length &&
    left.every((segment, index) => {
      const other = right[index];
      if (!other || other.kind !== segment.kind) return false;
      return segment.kind === "parameter" || (other.kind === "text" && other.value === segment.value);
    })
  );
}

function matchSegments(pattern: readonly Segment[], segments: readonly string[]): RouteParams | null {
  if (pattern.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (const [index, segment] of pattern.entries()) {
    const value = segments[index];
    if (value === undefined) return null;
    if (segment.kind === "text") {
      if (segment.value !== value) return null;
    } else {
      if (!value) return null;
      params[segment.name] = value;
    }
  }
  return params;
}

export function methodNotAllowed(allowed: readonly HttpMethod[]): Response {
  const response = apiError(405, "method_not_allowed", "This method is not available for this path.");
  response.headers.set("Allow", allowed.join(", "));
  return response;
}

export function notFound(): Response {
  return apiError(404, "not_found", "The account service has no such path.");
}
