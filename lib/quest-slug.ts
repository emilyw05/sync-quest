/**
 * Short, shareable meetup slugs. Avoids lookalike characters (0/O, 1/l/I) so
 * teammates typing the URL on a phone don't fat-finger their way to a 404.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateQuestSlug(length = 8): string {
  let out = "";
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) {
      out += ALPHABET[buf[i] % ALPHABET.length];
    }
    return out;
  }
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
