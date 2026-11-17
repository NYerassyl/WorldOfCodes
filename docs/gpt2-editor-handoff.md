# Shared editor handoff

Reuses the existing `feat/editor-auto-pairs-gpt4` helper (audited commit
`fe065d947ae8655ceb972524475236450c7b93f2`) and its 14 regression cases.
Six additional regressions cover language indentation, comment/string punctuation,
selection boundaries, a leading newline and IME composition. Existing JetBrains
Mono styling is retained.

Smart editing is explicitly enabled for Challenges, server lesson practice,
editable Python/SQL lesson examples, local language Code labs and the legacy
Algorithms view. It pairs brackets/quotes, moves Tab past a closer, indents Enter
according to language/current text, and supports Esc then Tab to leave the field.
This is a line-based typing helper, not a full syntax parser.

Both actual `#copy` (ServerCopy inside ServerPractice.tsx) and legacy Copy disable
smart editing entirely. A typed opener stays one character; Enter adds no spaces.
No automatically generated character can count as player transcription.

Arena is unchanged. Shared Editor defaults to smartEditing=false, matching its
previous behavior. The user will provide GPT3 agreement later; enabling Arena is
intentionally pending that agreement.

Validation: `npm test`, `npm run build`, and
`python scripts/verify-editor-browser.py` against migrated/seeded test PostgreSQL,
FastAPI and Express. The browser checks real key presses, caret movement, computed
monospace font, composition, focus escape, strict Copy and unchanged rewards.
Screenshots/logs are uploaded by `.github/workflows/shared-editor-gpt2.yml`.

Manual paths: Challenges → Two Sum; Lessons → Python → Variables practice;
Lessons → SQL → workshop example; Lessons → JavaScript → Basics → Code lab;
Copy → any exercise. Type `(`, press Tab, then Enter after a block opener.
In Copy, verify `(` remains unpaired and Enter inserts only a newline.
