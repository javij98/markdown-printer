// @vitest-environment node
import { createServer } from "node:http";
import { once } from "node:events";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({ sessions: new Map(), server: null }));

vi.mock("redis", () => ({
  createClient: () => ({
    on() {},
    async connect() {},
    async get(key) { return runtime.sessions.get(key) ?? null; },
    async set(key, value) { runtime.sessions.set(key, value); },
    async del(key) { runtime.sessions.delete(key); },
  }),
}));

vi.mock("express", async () => {
  const { default: express } = await vi.importActual("express");
  return {
    default: Object.assign((...args) => {
      const app = express(...args);
      const listen = app.listen.bind(app);
      app.listen = (...options) => (runtime.server = listen(...options));
      return app;
    }, express),
  };
});

const attachmentId = "90ac18e4-a7ac-44e8-82e3-905380cc686f";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
let outline;
let outlineUrl;
let studioUrl;
let grantedScope;
let attachmentStatus;
let attachmentLocation;
let signedRequestAuthorization;

beforeEach(() => {
  runtime.sessions.clear();
  attachmentStatus = 302;
  attachmentLocation = undefined;
  signedRequestAuthorization = undefined;
});

beforeAll(async () => {
  outline = createServer((req, res) => {
    const url = new URL(req.url, outlineUrl);
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/oauth/token") {
      res.end(JSON.stringify({ access_token: "test-access-token", refresh_token: "test-refresh-token", expires_in: 3600, scope: grantedScope }));
      return;
    }
    if (req.headers.authorization !== "Bearer test-access-token" && url.pathname !== "/api/files.get") {
      res.writeHead(403).end("{}");
      return;
    }
    if (url.pathname === "/api/auth.info") {
      res.end(JSON.stringify({ data: { user: { id: "user-1", name: "Test" }, team: { id: "team-1", name: "Test" } } }));
      return;
    }
    if (url.pathname === "/api/attachments.redirect") {
      if (!grantedScope.split(" ").includes("/api/attachments.redirect")) {
        res.writeHead(403).end("{}");
        return;
      }
      res.writeHead(attachmentStatus, attachmentStatus === 302 ? {
        Location: attachmentLocation ?? `${outlineUrl}/api/files.get?sig=test-signature`,
      } : {}).end();
      return;
    }
    if (url.pathname === "/api/files.get" && url.searchParams.get("sig") === "test-signature") {
      signedRequestAuthorization = req.headers.authorization;
      res.writeHead(200, { "Content-Type": "image/png" }).end(png);
      return;
    }
    res.writeHead(404).end("{}");
  }).listen(0, "127.0.0.1");
  await once(outline, "listening");
  outlineUrl = `http://127.0.0.1:${outline.address().port}`;
  const environment = {
    PORT: "0", REDIS_URL: "redis://unused", OUTLINE_TEAM_ID: "team-1",
    OUTLINE_PUBLIC_URL: outlineUrl, OUTLINE_INTERNAL_URL: outlineUrl,
    OUTLINE_AUTHORIZATION_URL: `${outlineUrl}/oauth/authorize`,
    OUTLINE_CLIENT_ID: "test-client", OUTLINE_CLIENT_SECRET: "test-secret",
    OUTLINE_REDIRECT_URI: "https://studio.test/print/auth/callback",
  };
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  await import("./server.mjs");
  if (!runtime.server.listening) await once(runtime.server, "listening");
  studioUrl = `http://127.0.0.1:${runtime.server.address().port}`;
});

afterAll(async () => {
  await Promise.all([runtime.server, outline].filter(Boolean).map(server => new Promise(resolve => server.close(resolve))));
  vi.unstubAllEnvs();
});

async function authenticate() {
  const login = await fetch(`${studioUrl}/print/auth/login`, { redirect: "manual" });
  const authorization = new URL(login.headers.get("location"));
  grantedScope = authorization.searchParams.get("scope");
  const callback = await fetch(`${studioUrl}/print/auth/callback?code=test-code&state=${authorization.searchParams.get("state")}`, { redirect: "manual" });
  expect(callback.status).toBe(302);
  return callback.headers.get("set-cookie").split(";")[0];
}

describe("private Outline images", () => {
  it("loads an image with only the Print Studio session cookie", async () => {
    const cookie = await authenticate();
    const response = await fetch(`${studioUrl}/print/api/attachments/${attachmentId}`, {
      headers: { Cookie: cookie }, redirect: "manual",
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("location")).toBe(`${outlineUrl}/api/files.get?sig=test-signature`);
    const image = await fetch(response.headers.get("location"));
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await image.arrayBuffer())).toEqual(png);
    expect(signedRequestAuthorization).toBeUndefined();
  });

  it.each(["read", undefined])("requests authorization again for an existing session with scope %s", async (scope) => {
    const cookie = await authenticate();
    for (const [key, value] of runtime.sessions) {
      if (key.startsWith("printstudio:session:")) {
        runtime.sessions.set(key, JSON.stringify({ ...JSON.parse(value), scope }));
      }
    }
    const response = await fetch(`${studioUrl}/print/auth/me`, { headers: { Cookie: cookie }, redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/^\/print\/auth\/login\?/);
  });

  it("rejects an OAuth grant without attachment access", async () => {
    const login = await fetch(`${studioUrl}/print/auth/login`, { redirect: "manual" });
    const authorization = new URL(login.headers.get("location"));
    grantedScope = "read";
    const callback = await fetch(`${studioUrl}/print/auth/callback?code=test-code&state=${authorization.searchParams.get("state")}`, { redirect: "manual" });
    expect(callback.status).toBe(403);
    expect(callback.headers.get("set-cookie")).toBeNull();
  });

  it.each([403, 404])("preserves Outline's attachment denial (%s)", async (status) => {
    const cookie = await authenticate();
    attachmentStatus = status;
    const response = await fetch(`${studioUrl}/print/api/attachments/${attachmentId}`, { headers: { Cookie: cookie }, redirect: "manual" });
    expect(response.status).toBe(status);
    expect(response.headers.get("location")).toBeNull();
  });

  it("rejects invalid attachment identifiers", async () => {
    const cookie = await authenticate();
    const response = await fetch(`${studioUrl}/print/api/attachments/not-an-id`, { headers: { Cookie: cookie }, redirect: "manual" });
    expect(response.status).toBe(400);
  });

  it("requires a Print Studio session to request an attachment", async () => {
    const response = await fetch(`${studioUrl}/print/api/attachments/${attachmentId}`, { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/^\/print\/auth\/login\?/);
  });

  it("rejects a non-HTTP redirect from Outline", async () => {
    const cookie = await authenticate();
    attachmentLocation = "javascript:alert(1)";
    const response = await fetch(`${studioUrl}/print/api/attachments/${attachmentId}`, { headers: { Cookie: cookie }, redirect: "manual" });
    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
  });
});
