import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, readSelfHostedSignalOrigin } from "./content-security-policy";

describe("buildContentSecurityPolicy", () => {
  it("allows no analytics endpoint in a packaged app", () => {
    const connect = buildContentSecurityPolicy(true)
      .split("; ")
      .find((directive) => directive.startsWith("connect-src "));

    expect(connect).toBe("connect-src 'self' codebot-attachment: codebot-remote-attachment: ws://127.0.0.1:*");
    expect(connect).not.toContain("analytics");
    expect(connect).not.toContain("localhost");
  });

  it.each([true, false])("allows no https: source in connect-src when packaged=%s", (packaged) => {
    const connect = buildContentSecurityPolicy(
      packaged,
      "ws://192.168.1.143:3101/v1/signal",
      "wss://signal.example.com",
    )
      .split("; ")
      .find((directive) => directive.startsWith("connect-src "));

    expect(connect).not.toContain("https:");
    expect(connect).not.toContain("analytics");
  });

  it.each([true, false])("allows loopback viewer frames when packaged=%s", (packaged) => {
    const directives = buildContentSecurityPolicy(packaged).split("; ");
    expect(directives.find((directive) => directive.startsWith("frame-src "))).toBe(
      "frame-src 'self' codebot-attachment: codebot-remote-attachment: codebot-visual: codebot-remote-visual: http://127.0.0.1:* http://localhost:*",
    );
    expect(directives.find((directive) => directive.startsWith("script-src "))).toBe("script-src 'self'");
  });

  it("lets the renderer play an attachment recording, but only from the attachment schemes", () => {
    const policy = buildContentSecurityPolicy(true);

    expect(policy).toContain("media-src 'self' blob: codebot-attachment: codebot-remote-attachment:");
    expect(policy).not.toContain("media-src 'self' blob: codebot-attachment: codebot-remote-attachment: https:");
  });

  it("keeps local development sources", () => {
    const policy = buildContentSecurityPolicy(false, "ws://192.168.1.143:3101/v1/signal");

    expect(policy).toContain("http://localhost:*");
    expect(policy).toContain("ws://localhost:*");
    expect(policy).toContain("ws://192.168.1.143:3101");
  });

  it("does not add public or production Signal origins through the development option", () => {
    expect(buildContentSecurityPolicy(false, "ws://signal.example.com/v1/signal")).not.toContain(
      "ws://signal.example.com",
    );
    expect(buildContentSecurityPolicy(true, "ws://192.168.1.143:3101/v1/signal")).not.toContain(
      "ws://192.168.1.143:3101",
    );
  });

  it("adds only the origin of a self-hosted Signal to connect-src", () => {
    const origin = readSelfHostedSignalOrigin("https://api.example.com", "wss://signal.example.com:8443/v1/signal");
    const connect = buildContentSecurityPolicy(true, undefined, origin)
      .split("; ")
      .find((directive) => directive.startsWith("connect-src "));

    expect(origin).toBe("wss://signal.example.com:8443");
    expect(connect).toContain(" wss://signal.example.com:8443");
    expect(readSelfHostedSignalOrigin(undefined, undefined)).toBeNull();
  });

  it.each([
    [undefined, "wss://signal.example.com/v1/signal", "CODEBOT_REMOTE_SIGNAL_URL needs CODEBOT_AUTH_API_URL."],
    ["https://api.example.com", "ws://signal.example.com/v1/signal", "must be a wss: URL"],
    ["https://api.example.com", "https://signal.example.com/v1/signal", "must be a wss: URL"],
    ["https://api.example.com", "wss://user:pass@signal.example.com/v1/signal", "must be a wss: URL"],
  ])("refuses a self-hosted Signal URL with auth API %s and Signal %s", (authApiUrl, signalUrl, message) => {
    expect(() => readSelfHostedSignalOrigin(authApiUrl, signalUrl)).toThrow(message);
  });
});
