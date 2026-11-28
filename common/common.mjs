// @ts-check

/** @import {RuleOrLiteral} from '@willbooster/web-tree-sitter/dsl' */

// The CLI injects the DSL before loading the grammar that imports this module.
const { alias, optional, repeat, seq } = /** @type {typeof globalThis & import('@willbooster/web-tree-sitter/dsl').DSL} */ (
  globalThis
);

// SQL keywords are ASCII words that match without regard to case. A pattern with the `i` flag would also match the
// Unicode characters that fold to an ASCII letter (e.g. U+212A KELVIN SIGN for `k`), which SQL dialects read as an
// identifier, so each letter lists its two ASCII cases instead.
/** @param {string} word */
export const keywordPattern = (word) =>
  new RegExp(word.replaceAll(/[A-Za-z]/g, (letter) => `[${letter.toUpperCase()}${letter.toLowerCase()}]`));

/**
 * A keyword token, which appears in the tree as an anonymous node named after the keyword in upper case.
 *
 * @param {string} word
 */
export const keyword = (word) => alias(keywordPattern(word), word.toUpperCase());

/**
 * A sequence of keywords separated by spaces in `phrase`, such as `'PRIMARY KEY'`.
 *
 * @param {string} phrase
 */
export const keywords = (phrase) => seq(...phrase.split(' ').map(keyword));

/** @param {RuleOrLiteral} rule */
export const commaSep1 = (rule) => seq(rule, repeat(seq(',', rule)));

/** @param {RuleOrLiteral} rule */
export const commaSep = (rule) => optional(commaSep1(rule));
