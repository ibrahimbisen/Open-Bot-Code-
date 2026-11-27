import { type AdminDecoder, adminRoute, fields, type OptionalRouteCodec } from "./admin-wire";
import type { TeamProtocolV2Json } from "./webrtc-framing";

const MAX_DEPTH = 24;
const MAX_NODES = 50_000;

function plainJson(value: unknown, budget: { nodes: number }, depth: number): TeamProtocolV2Json {
  budget.nodes += 1;
  if (budget.nodes > MAX_NODES || depth > MAX_DEPTH) throw new Error("Invalid payload.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item) => plainJson(item, budget, depth + 1));
  if (typeof value === "object") {
    const decoded: Record<string, TeamProtocolV2Json> = {};
    for (const [key, item] of Object.entries(value)) decoded[key] = plainJson(item, budget, depth + 1);
    return decoded;
  }
  throw new Error("Invalid payload.");
}

const payload: AdminDecoder = (value) => plainJson(value, { nodes: 0 }, 0);
const request = fields({}, { input: payload });

export function jsonPayloadCodecs(routes: Readonly<Record<string, string>>): ReadonlyMap<string, OptionalRouteCodec> {
  return new Map(Object.values(routes).map((path) => [path, adminRoute(request, payload)]));
}

export function directJsonPayloadCodecs(
  routes: Readonly<Record<string, string>>,
): ReadonlyMap<string, OptionalRouteCodec> {
  return new Map(Object.values(routes).map((path) => [path, adminRoute(payload, payload)]));
}
