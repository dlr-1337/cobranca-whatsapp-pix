import { describe, expect, it } from "vitest";

import { loadNodeEnv, loadWorkerEnv } from "./env";

describe("config env loaders", () => {
  it("parses the required node env contract", () => {
    expect(
      loadNodeEnv({
        DATABASE_URL: "postgresql://cobrazap:cobrazap@localhost:5432/cobrazap",
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toMatchObject({
      NODE_ENV: "development",
      SESSION_COOKIE_NAME: "czp_session",
    });
  });

  it("derives the worker redis connection", () => {
    expect(
      loadWorkerEnv({
        DATABASE_URL: "postgresql://cobrazap:cobrazap@localhost:5432/cobrazap",
        REDIS_URL: "redis://localhost:6380",
      }).redisConnection,
    ).toEqual({
      host: "localhost",
      port: 6380,
    });
  });
});
