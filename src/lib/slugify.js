'use strict';

// precompile for speed
var HTML_TAGS_REGEX = /<[^>]*>/g;                 // anything contained in < > tags
var FORBIDDEN_CHARS_REGEX = /[\\/:*?"<>|$%&!@#~.^`'(){}[\],=+;]/g; // Characters in the set: \/:*?"<>|$%&!@#~.^`'(){}[],=+;
var CONTROL_CHARS_REGEX = /\p{Cc}/gu; // Unicode control characters

var UNICODE_REPLACEMENT_CHAR_REGEX = /�/g;        // U+FFFD, the Unicode replacement character
var WHITESPACE_REGEX = /\s+/g;

var WORD_SEP_CHAR = '-';                                                       // character used to separate words (replaces whitespace)
var _WORD_SEP_ESCAPED = WORD_SEP_CHAR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
var WORD_SEP_CHARS_REGEX = new RegExp(_WORD_SEP_ESCAPED + '{3,}', 'g');         // three or more consecutive word separator chars
var TRAILING_WORD_SEP_CHAR_REGEX = new RegExp(_WORD_SEP_ESCAPED + '$', 'g');    // trailing word separator char

// Safely under the limit for most filesystems
var DEFAULT_MAX_LEN = 60;

/**
 * Coerce a string to well-formed UTF-16, by replacing any unpaired surrogates
 * with the replacement character U+FFFD.
 *
 * Uses the native String.prototype.toWellFormed (ES2024) when available, and
 * otherwise falls back to TextEncoder/TextDecoder, which has the same effect.
 */
function toWellFormed(str) {
    if(typeof str.toWellFormed === 'function') return str.toWellFormed();
    return new TextDecoder().decode(new TextEncoder().encode(str));
}

/**
 * slugify: turn an arbitrary string into a lowercase, hyphenated,
 * filesystem-safe token (e.g. for use as a filename). Whitespace is replaced
 * with hyphens, and Unicode letters (accents, CJK, etc.) are preserved.
 * Returns a valid Unicode string.
 *
 * @param {string} str
 * @param {number} [maxLen] max length in code points (default 60)
 * @return {string}
 */
module.exports = function slugify(str, maxLen = DEFAULT_MAX_LEN) {
    var slug = toWellFormed(str ?? '')                 // Guarantee well-formed Unicode text
        .replace(UNICODE_REPLACEMENT_CHAR_REGEX, '')   // Drop Unicode replacement chars left by previous step
        .replace(HTML_TAGS_REGEX, ' ')                 // Remove < > tags, such as <br> (replace with space)
        .replace(FORBIDDEN_CHARS_REGEX, '')            // Remove forbidden filename characters
        .toLowerCase()                                 // Lowercase everything
        .trim()                                        // Strip leading/trailing whitespace
        .replace(WHITESPACE_REGEX, WORD_SEP_CHAR)      // Replace any remaining whitespace with the word sep char
        .replace(CONTROL_CHARS_REGEX, '')              // Remove control characters (after whitespace)
        .replace(WORD_SEP_CHARS_REGEX, WORD_SEP_CHAR); // Replace multiple word sep chars with a single one

    if (slug.length <= maxLen) return slug;
    // Apply maxLen to the resulting string. Use Array.from().slice() instead of String.prototype.split()
    // to avoid splitting in the middle of a surrogate pair.
    return Array.from(slug).slice(0, maxLen).join('').replace(TRAILING_WORD_SEP_CHAR_REGEX, '');
};
