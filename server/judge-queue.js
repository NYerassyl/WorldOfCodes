import { AppError } from "../services/learning-backend/src/lib/errors.js";
// Single-process integration queue. Production replicas require a shared worker queue.
export function createJudgeQueue(
  judge,
  { concurrency = 2, maxQueued = 20 } = {},
) {
  let active = 0;
  const waiting = [];
  function pump() {
    while (active < concurrency && waiting.length) {
      const job = waiting.shift();
      active++;
      Promise.resolve()
        .then(() => judge(job.input))
        .then(job.resolve, job.reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  }
  return (input) =>
    new Promise((resolve, reject) => {
      if (active >= concurrency && waiting.length >= maxQueued)
        return reject(
          new AppError(
            503,
            "JUDGE_BUSY",
            "The judge is busy. Please retry shortly.",
          ),
        );
      waiting.push({ input, resolve, reject });
      pump();
    });
}
