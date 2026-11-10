/** Mount these routers under /api in GPT 1's main application. */
export { createAuthRouter, makeRequireAuth } from './auth/router.js';
export { createLearningRouter } from './learning/router.js';
export { createProblemsRouter } from './problems/router.js';
export { createCopyRouter } from './copy/router.js';
export { submitProblem, getPublicProblemBank, getJudgableProblem } from './problems/service.js';
export { judgePython } from './problems/dockerJudge.js';

export { resolveAuthSession } from './auth/session.js';

export { createTraceRouter } from "./trace/router.js";
