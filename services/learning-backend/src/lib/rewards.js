/** Literal Unicode-codepoint comparison: whitespace and final newline matter. */
export const codeMatchesExactly = (input, sample) => typeof input === 'string' && input === sample;
