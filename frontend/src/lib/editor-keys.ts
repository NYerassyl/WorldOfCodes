// IDE-style editing helpers for the plain-text code editors: auto-closing
// bracket/quote pairs, overtyping closers, Tab/Shift+Tab indentation and
// bracket-aware Enter. The key logic is pure so it can be tested without a DOM.

export type EditorKeyInput = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

export type EditorEdit = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export const DEFAULT_INDENT = "  ";

// Follow the indentation the file already uses so Python starters written with
// four spaces keep a consistent block structure.
export function detectIndent(value: string): string {
  const match = /^([ \t]+)\S/m.exec(value);
  if (!match) return DEFAULT_INDENT;
  if (match[1].startsWith("\t")) return "\t";
  return match[1].length >= 4 ? "    " : DEFAULT_INDENT;
}

const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};
const CLOSERS = new Set([")", "]", "}", '"', "'", "`"]);
const QUOTES = new Set(['"', "'", "`"]);
const WORD_CHAR = /[A-Za-z0-9_$]/;
// Lines ending with one of these characters open a block for the next line.
const BLOCK_END = /[:{(\[]$/;

const lineStart = (value: string, pos: number) =>
  value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
const lineEnd = (value: string, pos: number) => {
  const index = value.indexOf("\n", pos);
  return index === -1 ? value.length : index;
};
const lineIndent = (value: string, pos: number) =>
  /^[ \t]*/.exec(value.slice(lineStart(value, pos), pos))?.[0] ?? "";
const leadingDrop = (line: string, unit: string) => {
  const whitespace = /^[ \t]*/.exec(line)?.[0] ?? "";
  if (unit === "\t") return whitespace.startsWith("\t") ? 1 : 0;
  return Math.min(unit.length, whitespace.length);
};

const editAt = (value: string, selectionStart: number, selectionEnd = selectionStart): EditorEdit => ({
  value,
  selectionStart,
  selectionEnd,
});

function indentLines(value: string, start: number, end: number, unit: string): EditorEdit {
  const from = lineStart(value, start);
  const to = lineEnd(value, end);
  const lines = value.slice(from, to).split("\n");
  const endsAtLineStart = end > from && value[end - 1] === "\n";
  const added = unit.length * (endsAtLineStart ? lines.length - 1 : lines.length);
  return {
    value: value.slice(0, from) + lines.map((line) => unit + line).join("\n") + value.slice(to),
    selectionStart: start + unit.length,
    selectionEnd: end + added,
  };
}

function dedentLines(value: string, start: number, end: number, unit: string): EditorEdit {
  const from = lineStart(value, start);
  const to = lineEnd(value, end);
  const lines = value.slice(from, to).split("\n");
  let removedStart = 0;
  let removedEnd = 0;
  let offset = from;
  const text = lines
    .map((line) => {
      const drop = leadingDrop(line, unit);
      if (offset < start) removedStart += drop;
      if (offset < end) removedEnd += drop;
      offset += line.length + 1;
      return line.slice(drop);
    })
    .join("\n");
  return {
    value: value.slice(0, from) + text + value.slice(to),
    selectionStart: Math.max(from, start - removedStart),
    selectionEnd: Math.max(from, end - removedEnd),
  };
}

function autoPair(value: string, start: number, end: number, open: string): EditorEdit | null {
  const close = PAIRS[open];
  if (start !== end) {
    return {
      value: value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end),
      selectionStart: start + 1,
      selectionEnd: end + 1,
    };
  }
  const next = value[start] ?? "";
  if (next && WORD_CHAR.test(next)) return null;
  return {
    value: value.slice(0, start) + open + close + value.slice(start),
    selectionStart: start + 1,
    selectionEnd: start + 1,
  };
}

function newline(value: string, start: number, end: number, unit: string): EditorEdit | null {
  if (start !== end) return null;
  const indent = lineIndent(value, start);
  const before = value[start - 1];
  const after = value[start];
  if (before && PAIRS[before] && PAIRS[before] === after) {
    const inner = indent + unit;
    const insert = `\n${inner}\n${indent}`;
    return {
      value: value.slice(0, start) + insert + value.slice(start),
      selectionStart: start + 1 + inner.length,
      selectionEnd: start + 1 + inner.length,
    };
  }
  const text = value.slice(lineStart(value, start), start).trimEnd();
  const insert = `\n${indent}${BLOCK_END.test(text) ? unit : ""}`;
  return {
    value: value.slice(0, start) + insert + value.slice(start),
    selectionStart: start + insert.length,
    selectionEnd: start + insert.length,
  };
}

function backspace(value: string, start: number, end: number): EditorEdit | null {
  if (start !== end || start === 0) return null;
  const before = value[start - 1];
  if (!PAIRS[before] || PAIRS[before] !== value[start]) return null;
  if (QUOTES.has(before) && value[start - 2] === "\\") return null;
  return {
    value: value.slice(0, start - 1) + value.slice(start + 1),
    selectionStart: start - 1,
    selectionEnd: start - 1,
  };
}

export function applyEditorKey(input: EditorKeyInput): EditorEdit | null {
  if (input.ctrlKey || input.metaKey || input.altKey) return null;
  const { value, key } = input;
  const start = Math.min(input.selectionStart, input.selectionEnd);
  const end = Math.max(input.selectionStart, input.selectionEnd);

  const unit = detectIndent(value);
  if (key === "Tab") {
    if (input.shiftKey) return dedentLines(value, start, end, unit);
    if (start === end && CLOSERS.has(value[start] ?? "")) return editAt(value, start + 1);
    return indentLines(value, start, end, unit);
  }
  if (key === "Enter" && !input.shiftKey) return newline(value, start, end, unit);
  if (key === "Backspace") return backspace(value, start, end);
  if (CLOSERS.has(key) && start === end && value[start] === key) {
    // Overtype the automated closer unless the quote is escaped.
    return QUOTES.has(key) && value[start - 1] === "\\" ? null : editAt(value, start + 1);
  }
  if (PAIRS[key]) return autoPair(value, start, end, key);
  return null;
}

export function handleEditorKeyDown(
  event: {
    currentTarget: HTMLTextAreaElement;
    key: string;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    preventDefault(): void;
  },
  value: string,
  onChange: (next: string) => void,
): boolean {
  const target = event.currentTarget;
  const next = applyEditorKey({
    value,
    selectionStart: target.selectionStart,
    selectionEnd: target.selectionEnd,
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
  });
  if (!next) return false;
  event.preventDefault();
  if (next.value !== value) {
    target.value = next.value;
    onChange(next.value);
  }
  target.setSelectionRange(next.selectionStart, next.selectionEnd);
  return true;
}
