import { Router } from "express";
import { AppError, asyncRoute, badRequest, ensureKeys } from "../lib/errors.js";
import {
  TRACE_DIFFICULTIES,
  findTraceExercise,
  gradeTraceOutput,
  listTraceExercises,
  traceDetail,
} from "./catalog.js";

function getExercise(id) {
  const exercise = findTraceExercise(id);
  if (!exercise) {
    throw new AppError(404, "TRACE_EXERCISE_NOT_FOUND", "Trace exercise does not exist");
  }
  return exercise;
}

function parseFilters(query) {
  if (Object.keys(query).some((key) => !["level", "difficulty", "topic"].includes(key))) {
    throw badRequest("Allowed filters: level, difficulty, topic");
  }
  const { level, difficulty, topic } = query;
  if (level !== undefined && (typeof level !== "string" || !/^[1-5]$/.test(level))) {
    throw badRequest("level must be an integer from 1 to 5");
  }
  if (
    difficulty !== undefined &&
    (typeof difficulty !== "string" || !TRACE_DIFFICULTIES.includes(difficulty))
  ) {
    throw badRequest("Invalid Trace difficulty");
  }
  if (
    topic !== undefined &&
    (typeof topic !== "string" || !/^[a-z0-9-]{1,80}$/i.test(topic))
  ) {
    throw badRequest("Invalid Trace topic");
  }
  return {
    ...(level === undefined ? {} : { level: Number(level) }),
    ...(difficulty === undefined ? {} : { difficulty }),
    ...(topic === undefined ? {} : { topic }),
  };
}

/** Mount under /api with the existing Bearer-session middleware. */
export function createTraceRouter(prisma, requireAuth) {
  const router = Router();

  router.get("/trace/exercises", asyncRoute(async (req, res) => {
    res.json({ exercises: listTraceExercises(parseFilters(req.query)) });
  }));

  router.get("/trace/exercises/:exerciseId", asyncRoute(async (req, res) => {
    res.json({ exercise: traceDetail(getExercise(req.params.exerciseId)) });
  }));

  router.post(
    "/trace/exercises/:exerciseId/attempts",
    requireAuth,
    asyncRoute(async (req, res) => {
      ensureKeys(req.body, ["output"]);
      if (typeof req.body.output !== "string" || req.body.output.length > 2000) {
        throw badRequest("output must be a string of up to 2000 characters");
      }

      // The player supplies only the guessed stdout. Their code is NEVER executed.
      const exercise = getExercise(req.params.exerciseId);
      const { correct, submittedOutput, expectedOutput } = gradeTraceOutput(
        exercise,
        req.body.output,
      );

      // Never trust a userId from JSON; the server-side session owns the attempt.
      // Prisma storage survives reloads, unlike the classroom in-memory API.
      const attempt = await prisma.traceAttempt.create({
        data: {
          userId: req.auth.userId,
          exerciseId: exercise.id,
          submittedOutput,
          isCorrect: correct,
        },
        select: {
          id: true,
          exerciseId: true,
          isCorrect: true,
          submittedOutput: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        attemptId: attempt.id,
        exerciseId: attempt.exerciseId,
        correct: attempt.isCorrect,
        verdict: attempt.isCorrect ? "CORRECT" : "INCORRECT",
        submittedOutput: attempt.submittedOutput,
        expectedOutput,
        explanation: exercise.explanation,
        createdAt: attempt.createdAt,
      });
    }),
  );

  return router;
}
