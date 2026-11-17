# Shared FastAPI: implemented route inventory

All runtime records use canonical Prisma PostgreSQL tables; no mutable account/learning MemoryStore. Static Trace catalog caching is not player storage.

| Method / route | Authorization | Persistent effects / reads |
|---|---|---|
| `GET /` | Public | Shared database health counts / service metadata |
| `GET /api/health` | Public | Shared database health counts / service metadata |
| `POST /api/users` | Public | User / AuthSession via canonical Express account service |
| `GET /api/users` | Public | User; public fields only or private /me; own account mutations |
| `POST /api/auth/register` | Public | User / AuthSession via canonical Express account service |
| `POST /api/auth/login` | Public | User / AuthSession via canonical Express account service |
| `POST /api/auth/logout` | Bearer AuthSession | User / AuthSession via canonical Express account service |
| `GET /api/users/me` | Bearer AuthSession | User; public fields only or private /me; own account mutations |
| `PATCH /api/users/me` | Bearer AuthSession | User; public fields only or private /me; own account mutations |
| `GET /api/users/leaderboard` | Public | User; public fields only or private /me; own account mutations |
| `GET /api/users/{user_id}` | Public | User; public fields only or private /me; own account mutations |
| `PATCH /api/users/{user_id}` | Bearer AuthSession | User; public fields only or private /me; own account mutations |
| `DELETE /api/users/{user_id}` | Bearer AuthSession | User; public fields only or private /me; own account mutations |
| `GET /api/users/{user_id}/profile` | Public | User; public fields only or private /me; own account mutations |
| `GET /api/learning/courses` | Public | Published Course / Topic / Lesson |
| `GET /api/learning/progress` | Bearer AuthSession | Own LessonProgress, ProblemCompletion, User |
| `GET /api/learning/lessons/{lesson_id}` | Public | Published Course / Topic / Lesson |
| `POST /api/learning/lessons/{lesson_id}/start` | Bearer AuthSession | Own LessonProgress via canonical service; prerequisite checked; no reward |
| `POST /api/learning/lessons/{lesson_id}/run-example` | Bearer AuthSession | Read Lesson/example configuration; isolated worker; no Submission, progress or reward writes |
| `GET /api/lessons` | Public | Published Course / Topic / Lesson |
| `POST /api/lessons` | Bearer AuthSession | Lesson / Topic / Course; admin+author for content; owned LessonProgress for start |
| `GET /api/lessons/{lesson_id}` | Public | Published Course / Topic / Lesson |
| `PATCH /api/lessons/{lesson_id}` | Bearer AuthSession | Lesson / Topic / Course; admin+author for content; owned LessonProgress for start |
| `DELETE /api/lessons/{lesson_id}` | Bearer AuthSession | Lesson / Topic / Course; admin+author for content; owned LessonProgress for start |
| `GET /api/users/{user_id}/progress` | Bearer AuthSession | Own LessonProgress, ProblemCompletion, User |
| `POST /api/users/{user_id}/progress` | Bearer AuthSession | Own LessonProgress; confirmation from ProblemCompletion; no manual XP |
| `DELETE /api/users/{user_id}/progress/{lesson_id}` | Bearer AuthSession | Own LessonProgress; confirmation from ProblemCompletion; no manual XP |
| `GET /api/problems` | Public | Published Problem / sample-only TestCase |
| `POST /api/problems` | Bearer AuthSession | Problem / TestCase; admin+author, immutable published content |
| `GET /api/problems/my-submissions` | Bearer AuthSession | Own canonical Submission metadata only |
| `GET /api/problems/{problem_id}` | Public | Published Problem / sample-only TestCase |
| `PATCH /api/problems/{problem_id}` | Bearer AuthSession | Problem / TestCase; admin+author, immutable published content |
| `DELETE /api/problems/{problem_id}` | Bearer AuthSession | Problem / TestCase; admin+author, immutable published content |
| `POST /api/problems/{problem_id}/submissions` | Bearer AuthSession | Submission, ProblemCompletion, RewardLedger, User, LessonProgress via canonical service |
| `GET /api/problems/{problem_id}/submissions` | Bearer AuthSession | Owner-only canonical Submission |
| `POST /api/problems/{problem_id}/submit` | Bearer AuthSession | Submission, ProblemCompletion, RewardLedger, User, LessonProgress via canonical service |
| `GET /api/submissions/{submission_id}` | Bearer AuthSession | Owner-only canonical Submission |
| `GET /api/trace/exercises` | Public | Trusted static JSON catalog (no player writes) |
| `GET /api/trace/exercises/{exercise_id}` | Public | Trusted static JSON catalog (no player writes) |
| `POST /api/trace/exercises/{exercise_id}/submit` | Bearer AuthSession | TraceAttempt via canonical Express service |
| `GET /api/copy-exercises` | Public | CopyExercise / own CopyCompletion |
| `GET /api/copy-exercises/progress` | Bearer AuthSession | CopyExercise / own CopyCompletion |
| `GET /api/copy-exercises/{exercise_id}` | Public | CopyExercise / own CopyCompletion |
| `POST /api/copy-exercises/{exercise_id}/submit` | Bearer AuthSession | CopyAttempt, CopyCompletion, RewardLedger, User via canonical service |
| `PATCH /api/users/{user_id}/credentials` | Bearer AuthSession | User email/passwordHash; revoke AuthSession; current password required |
| `GET /api/players/{player_id}/activity` | Bearer AuthSession | Read-only woc_profile_activity view over canonical Submission |
| `GET /api/problems/{problem_id}/comments` | Public | ProblemComment; author from AuthSession; owner-only edit/delete |
| `POST /api/problems/{problem_id}/comments` | Bearer AuthSession | ProblemComment; author from AuthSession; owner-only edit/delete |
| `PATCH /api/problems/{problem_id}/comments/{comment_id}` | Bearer AuthSession | ProblemComment; author from AuthSession; owner-only edit/delete |
| `DELETE /api/problems/{problem_id}/comments/{comment_id}` | Bearer AuthSession | ProblemComment; author from AuthSession; owner-only edit/delete |
