import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EMOJI = "\u{1FAF6}";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

function fail(message: string): never {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function codePointsOf(text: string): number[] {
  return Array.from(text, (char) => char.codePointAt(0) as number);
}

function countCharacters(text: string): number {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (
      locale: string,
      options: { granularity: "grapheme" },
    ) => { segment(input: string): Iterable<unknown> };
  }).Segmenter;

  if (typeof Segmenter === "function") {
    return Array.from(
      new Segmenter("en", { granularity: "grapheme" }).segment(text),
    ).length;
  }
  return Array.from(text).length;
}

type EmojiFacts = {
  codePoints: number;
  characters: number;
  bytes: number;
  isSingleEmoji: boolean;
};

function emojiFacts(text: string): EmojiFacts {
  const codePoints = codePointsOf(text);
  const characters = countCharacters(text);
  const bytes = Buffer.from(text, "utf8").length;
  const first = text.codePointAt(0) ?? 0;
  const isSingleEmoji = codePoints.length === 1 && first > 0x2000;

  return {
    codePoints: codePoints.length,
    characters,
    bytes,
    isSingleEmoji,
  };
}

function validateEmoji(text: string): EmojiFacts {
  if (text.trim().length === 0) {
    fail("emoji is empty after trimming");
  }
  if (/[\r\n\u2028\u2029]/.test(text)) {
    fail("emoji contains a newline character");
  }

  const facts = emojiFacts(text);

  if (facts.characters < 1 || facts.characters > 8) {
    fail(`emoji must be 1 to 8 characters, got ${facts.characters}`);
  }
  if (facts.bytes < 1 || facts.bytes > 8) {
    fail(`emoji must be 1 to 8 UTF-8 bytes, got ${facts.bytes}`);
  }
  if (facts.codePoints !== 1) {
    fail(`emoji must be exactly one code point, got ${facts.codePoints}`);
  }
  if (!facts.isSingleEmoji) {
    fail("single code point must be above U+2000 to count as an emoji");
  }

  return facts;
}

const facts = validateEmoji(EMOJI);

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_FILE, `${EMOJI}\n`, "utf8");

const expectedBytes = Buffer.from(`${EMOJI}\n`, "utf8");
const actualBytes = readFileSync(OUTPUT_FILE);
if (!expectedBytes.equals(actualBytes)) {
  fail("entry.txt bytes do not match what was written");
}

const content = readFileSync(OUTPUT_FILE, "utf8");
const trimmed = content.trim();
if (/[\r\n\u2028\u2029]/.test(trimmed)) {
  fail("entry.txt is not exactly one line after trimming");
}

process.stdout.write(`path: ${OUTPUT_FILE}\n`);
process.stdout.write(`code points: ${facts.codePoints}\n`);
process.stdout.write(`characters: ${facts.characters}\n`);
process.stdout.write(`bytes: ${facts.bytes}\n`);
