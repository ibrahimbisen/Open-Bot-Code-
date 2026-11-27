const IPV4_MAPPED_PREFIX = "::ffff:";

export function normalizeSourceIp(address: string | null | undefined): string {
  const value = (address ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  const unmapped =
    value.startsWith(IPV4_MAPPED_PREFIX) && value.includes(".") ? value.slice(IPV4_MAPPED_PREFIX.length) : value;
  return unmapped.includes(":") ? ipv6Network(unmapped) : unmapped;
}

function ipv6Network(address: string): string {
  const [body = ""] = address.split("%", 1);
  const halves = body.split("::");
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves[1] ? halves[1].split(":") : [];
  const gap = 8 - head.length - tail.length;
  const groups = halves.length === 2 && gap > 0 ? [...head, ...Array<string>(gap).fill("0"), ...tail] : head;
  if (halves.length > 2 || groups.length !== 8 || !groups.every((group) => /^[0-9a-f]{1,4}$/u.test(group))) {
    return address;
  }
  return `${groups
    .slice(0, 4)
    .map((group) => Number.parseInt(group, 16).toString(16))
    .join(":")}::/64`;
}

export function requestSourceIp(request: Request, socketAddress: string | null, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = request.headers.get("X-Forwarded-For");
    const last = forwarded?.split(",").at(-1)?.trim();
    if (last) return normalizeSourceIp(last);
  }
  return normalizeSourceIp(socketAddress);
}
