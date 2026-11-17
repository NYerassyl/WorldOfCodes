# FastAPI сақтау қабаты: бастапқы маршруттар аудиті

#16: 201de23; #18: d970027. Бұл өзгеріске дейінгі жағдай.
#18-де сайт comments/activity ғана canonical Prisma-ға жалғанған. Қалған classroom API жадта; сайт олардың орнына Express API-ін қолданады.

| Маршрут | Сайтта FastAPI қолданыла ма? | Авторизация #16 / #18 | Жазатын кесте #16 / #18 | Жад #16 / #18 |
|---|---|---|---|---|
| `GET /` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `GET /api/health` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `GET /api/users` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `GET /api/users/leaderboard` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `POST /api/users` | Жоқ (docs/demo) | Жоқ | users / MemoryStore | Жоқ / Иә |
| `GET /api/users/{user_id}` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `GET /api/users/{user_id}/profile` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `PATCH /api/users/{user_id}` | Жоқ (docs/demo) | X-User-Id integer | users / MemoryStore | Жоқ / Иә |
| `DELETE /api/users/{user_id}` | Жоқ (docs/demo) | X-User-Id integer | users / MemoryStore | Жоқ / Иә |
| `GET /api/lessons` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `POST /api/lessons` | Жоқ (docs/demo) | X-User-Id integer | lessons / MemoryStore | Жоқ / Иә |
| `GET /api/lessons/{lesson_id}` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `PATCH /api/lessons/{lesson_id}` | Жоқ (docs/demo) | X-User-Id integer | lessons / MemoryStore | Жоқ / Иә |
| `DELETE /api/lessons/{lesson_id}` | Жоқ (docs/demo) | X-User-Id integer | lessons / MemoryStore | Жоқ / Иә |
| `GET /api/users/{user_id}/progress` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `POST /api/users/{user_id}/progress` | Жоқ (docs/demo) | X-User-Id integer | completions + users / MemoryStore | Жоқ / Иә |
| `DELETE /api/users/{user_id}/progress/{lesson_id}` | Жоқ (docs/demo) | X-User-Id integer | completions + users / MemoryStore | Жоқ / Иә |
| `GET /api/problems` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `POST /api/problems` | Жоқ (docs/demo) | X-User-Id integer | problems / MemoryStore | Жоқ / Иә |
| `GET /api/problems/{problem_id}` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `PATCH /api/problems/{problem_id}` | Жоқ (docs/demo) | X-User-Id integer | problems / MemoryStore | Жоқ / Иә |
| `DELETE /api/problems/{problem_id}` | Жоқ (docs/demo) | X-User-Id integer | problems / MemoryStore | Жоқ / Иә |
| `POST /api/problems/{problem_id}/submissions` | Жоқ (docs/demo) | X-User-Id integer | submissions + users / MemoryStore | Жоқ / Иә |
| `GET /api/problems/{problem_id}/submissions` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `GET /api/submissions/{submission_id}` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Иә |
| `GET /api/problems/{problem_id}/comments` | Иә, #18 Express bridge | Жоқ / Жоқ | — / — | Жоқ / Жоқ |
| `POST /api/problems/{problem_id}/comments` | Иә, #18 Express bridge | X-User-Id / Bearer | comments / ProblemComment | Жоқ / Жоқ |
| `PATCH /api/problems/{problem_id}/comments/{comment_id}` | Иә, #18 Express bridge | X-User-Id / Bearer | comments / ProblemComment | Жоқ / Жоқ |
| `DELETE /api/problems/{problem_id}/comments/{comment_id}` | Иә, #18 Express bridge | X-User-Id / Bearer | comments / ProblemComment | Жоқ / Жоқ |
| `GET /api/trace/exercises` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Жоқ |
| `GET /api/trace/exercises/{exercise_id}` | Жоқ (docs/demo) | Жоқ | — / — | Жоқ / Жоқ |
| `POST /api/trace/exercises/{exercise_id}/submit` | Жоқ (docs/demo) | X-User-Id integer | trace_attempts / MemoryStore | Жоқ / Иә |
| `GET /api/players/{player_id}/activity` | Иә, #18 Express bridge | — / Bearer | — / — | — / Жоқ |

Жад бағаны пайдаланушы деректерінің mutable сақтауын көрсетеді. Trace каталогы екі нұсқада да trusted статикалық JSON, пайдаланушы тарихы емес. `/api/players/{player_id}/activity` тек #18-де бар.

## Қалған нақты көшіру жұмысы

1. Classroom integer ID/X-User-Id және MemoryStore runtime-ын алып тастау; canonical string ID және AuthSession Bearer-ге көшіру.
2. Register/login/profile, lessons/progress, problem grading және Trace үшін Express-тің тексерілген canonical операцияларын FastAPI bridge арқылы қолдану. Judge/reward логикасын екінші рет жасамау.
3. Бұрынғы lesson/problem CRUD функциясын canonical Lesson/Problem кестелеріне көшіру; авторды сессиядан алу, seeded контентті кездейсоқ өзгертуден және тапсырылған есептің тесттерін өзгертуден қорғау.
4. Жеке submission/progress оқуларын өз иесіне шектеу. Қолмен completion/XP беруді алып, аяқталуды тек accepted canonical submissions арқылы растау; reset сыйақыны қайта алуға жол ашпасын.
5. /docs арқылы екі аккаунттың success/error/ownership сценарийлері; concurrent/repeat rewards және барлық сервер рестартынан кейін canonical сақталу тесті.
6. #18/#21/#23 регрессияларын бірге орындау. Prisma → Alembic; demo #16 миграциялары shared DB-ға қолданылмайды.
