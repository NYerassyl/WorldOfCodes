export function intSetting(value, fallback, min = 1, max = 1000000) {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error("Invalid numeric server configuration");
  return n;
}
export function readConfig(env = process.env) {
  return {
    port: intSetting(env.PORT, 4001, 1, 65535),
    host: env.HOST || "127.0.0.1",
    origins: (
      env.CORS_ORIGINS ||
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4001,http://127.0.0.1:4001"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    trustProxyHops: intSetting(env.TRUST_PROXY_HOPS, 0, 0, 5),
    bodyLimit: env.REQUEST_BODY_LIMIT || "32kb",
    authLimit: intSetting(env.AUTH_RATE_LIMIT, 20),
    authWindow: intSetting(env.AUTH_WINDOW_MS, 900000),
    submissionLimit: intSetting(env.SUBMISSION_RATE_LIMIT, 30),
    submissionWindow: intSetting(env.SUBMISSION_WINDOW_MS, 60000),
    judgeConcurrency: intSetting(env.JUDGE_CONCURRENCY, 2, 1, 8),
    judgeQueueLimit: intSetting(env.JUDGE_QUEUE_LIMIT, 20, 0, 100),
  };
}
