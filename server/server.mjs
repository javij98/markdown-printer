import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "redis";

const requiredEnv = [
  "OUTLINE_PUBLIC_URL",
  "OUTLINE_INTERNAL_URL",
  "OUTLINE_AUTHORIZATION_URL",
  "OUTLINE_CLIENT_ID",
  "OUTLINE_CLIENT_SECRET",
  "OUTLINE_REDIRECT_URI",
  "OUTLINE_TEAM_ID",
  "REDIS_URL",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const {
  OUTLINE_PUBLIC_URL,
  OUTLINE_INTERNAL_URL,
  OUTLINE_AUTHORIZATION_URL,
  OUTLINE_CLIENT_ID,
  OUTLINE_CLIENT_SECRET,
  OUTLINE_REDIRECT_URI,
  OUTLINE_TEAM_ID,
  REDIS_URL,
} = process.env;

const PORT = Number(process.env.PORT || 3000);

const SESSION_COOKIE = "outline_print_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const STATE_TTL_SECONDS = 10 * 60;
const WORKSPACE_REVALIDATE_SECONDS = 5 * 60;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const redis = createClient({
  url: REDIS_URL,
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

await redis.connect();

const app = express();

app.set("trust proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie;

  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header.split(";").map((part) => {
      const index = part.indexOf("=");

      if (index === -1) {
        return [part.trim(), ""];
      }

      return [
        part.slice(0, index).trim(),
        decodeURIComponent(part.slice(index + 1)),
      ];
    })
  );
}

function sanitizeReturnTo(value) {
  if (
    typeof value === "string" &&
    value.startsWith("/print/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/print/";
}

function sessionKey(sessionId) {
  return `printstudio:session:${hashToken(sessionId)}`;
}

function stateKey(state) {
  return `printstudio:oauth-state:${hashToken(state)}`;
}

async function saveSession(sessionId, session) {
  await redis.set(sessionKey(sessionId), JSON.stringify(session), {
    EX: SESSION_TTL_SECONDS,
  });
}

async function getSession(sessionId) {
  if (!sessionId) {
    return null;
  }

  const value = await redis.get(sessionKey(sessionId));

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function deleteSession(sessionId) {
  if (sessionId) {
    await redis.del(sessionKey(sessionId));
  }
}

async function requestToken(params) {
  const response = await fetch(`${OUTLINE_INTERNAL_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Outline token error:", response.status, data);
    throw new Error("Unable to obtain OAuth token");
  }

  return data;
}

async function refreshAccessToken(session) {
  if (!session.refreshToken) {
    throw new Error("Missing refresh token");
  }

  const token = await requestToken({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
    client_id: OUTLINE_CLIENT_ID,
    client_secret: OUTLINE_CLIENT_SECRET,
  });

  return {
    ...session,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || session.refreshToken,
    expiresAt:
      Date.now() + Number(token.expires_in || 3600) * 1000,
  };
}

async function getOutlineIdentity(accessToken) {
  const response = await fetch(`${OUTLINE_INTERNAL_URL}/api/auth.info`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error(`auth.info failed with ${response.status}`);
  }

  const payload = await response.json();

  const user = payload?.data?.user;
  const team = payload?.data?.team;

  if (!user?.id || !team?.id) {
    throw new Error("Invalid auth.info response");
  }

  return {
    user,
    team,
  };
}

async function validateSession(sessionId) {
  let session = await getSession(sessionId);

  if (!session) {
    return null;
  }

  try {
    if (!session.expiresAt || session.expiresAt < Date.now() + 60_000) {
      session = await refreshAccessToken(session);
    }

    const needsWorkspaceValidation =
      !session.validatedAt ||
      Date.now() - session.validatedAt >
        WORKSPACE_REVALIDATE_SECONDS * 1000;

    if (needsWorkspaceValidation) {
      const identity = await getOutlineIdentity(session.accessToken);

      if (identity.team.id !== OUTLINE_TEAM_ID) {
        await deleteSession(sessionId);
        return null;
      }

      session.user = {
        id: identity.user.id,
        name: identity.user.name,
        email: identity.user.email,
      };

      session.team = {
        id: identity.team.id,
        name: identity.team.name,
      };

      session.validatedAt = Date.now();
    }

    await saveSession(sessionId, session);

    return session;
  } catch (error) {
    console.error("Session validation failed:", error);
    await deleteSession(sessionId);
    return null;
  }
}

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/print",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/print",
  });
}

async function requireSession(req, res, next) {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];

  const session = await validateSession(sessionId);

  if (!session) {
    const returnTo = sanitizeReturnTo(req.originalUrl);

    return res.redirect(
      302,
      `/print/auth/login?return=${encodeURIComponent(returnTo)}`
    );
  }

  req.printSession = session;
  req.printSessionId = sessionId;

  next();
}

app.get("/health", (_req, res) => {
  res.type("text/plain").send("ok");
});

app.get("/print/auth/login", async (req, res) => {
  const returnTo = sanitizeReturnTo(req.query.return);

  const state = randomToken();

  await redis.set(
    stateKey(state),
    JSON.stringify({
      returnTo,
      createdAt: Date.now(),
    }),
    {
      EX: STATE_TTL_SECONDS,
    }
  );

  const authorizationUrl = new URL(OUTLINE_AUTHORIZATION_URL);

  authorizationUrl.searchParams.set("client_id", OUTLINE_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", OUTLINE_REDIRECT_URI);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "read");
  authorizationUrl.searchParams.set("state", state);

  res.redirect(302, authorizationUrl.toString());
});

app.get("/print/auth/callback", async (req, res) => {
  const code =
    typeof req.query.code === "string" ? req.query.code : null;

  const state =
    typeof req.query.state === "string" ? req.query.state : null;

  if (!code || !state) {
    return res.status(400).send("Missing OAuth code or state");
  }

  const storedState = await redis.get(stateKey(state));

  if (!storedState) {
    return res.status(400).send("Invalid or expired OAuth state");
  }

  await redis.del(stateKey(state));

  let stateData;

  try {
    stateData = JSON.parse(storedState);
  } catch {
    return res.status(400).send("Invalid OAuth state");
  }

  try {
    const token = await requestToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: OUTLINE_REDIRECT_URI,
      client_id: OUTLINE_CLIENT_ID,
      client_secret: OUTLINE_CLIENT_SECRET,
    });

    const identity = await getOutlineIdentity(token.access_token);

    if (identity.team.id !== OUTLINE_TEAM_ID) {
      return res
        .status(403)
        .send("This Outline workspace is not authorized for Print Studio");
    }

    const sessionId = randomToken();

    const session = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt:
        Date.now() + Number(token.expires_in || 3600) * 1000,

      user: {
        id: identity.user.id,
        name: identity.user.name,
        email: identity.user.email,
      },

      team: {
        id: identity.team.id,
        name: identity.team.name,
      },

      validatedAt: Date.now(),
      createdAt: Date.now(),
    };

    await saveSession(sessionId, session);

    setSessionCookie(res, sessionId);

    return res.redirect(
      302,
      sanitizeReturnTo(stateData.returnTo)
    );
  } catch (error) {
    console.error("OAuth callback failed:", error);

    return res
      .status(500)
      .send("Unable to authenticate with Outline");
  }
});

app.get("/print/auth/me", requireSession, (req, res) => {
  res.json({
    authenticated: true,
    user: req.printSession.user,
    team: req.printSession.team,
  });
});

app.post("/print/auth/logout", requireSession, async (req, res) => {
  const session = req.printSession;
  const sessionId = req.printSessionId;

  try {
    if (session.accessToken) {
      await fetch(`${OUTLINE_INTERNAL_URL}/oauth/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token: session.accessToken,
        }),
      });
    }

    if (session.refreshToken) {
      await fetch(`${OUTLINE_INTERNAL_URL}/oauth/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token: session.refreshToken,
        }),
      });
    }
  } catch (error) {
    console.error("Token revoke failed:", error);
  }

  await deleteSession(sessionId);

  clearSessionCookie(res);

  res.status(204).end();
});

app.use(
  "/print",
  requireSession,
  express.static(publicDir, {
    index: false,
  })
);

app.get("/print/{*path}", requireSession, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/", (_req, res) => {
  res.redirect(302, "/print/");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Outline Print Studio listening on :${PORT}`);
  console.log(`Outline public URL: ${OUTLINE_PUBLIC_URL}`);
});
