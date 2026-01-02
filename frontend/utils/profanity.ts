/**
 * Profanity Filter Utility
 * Filters out inappropriate words and replaces them with censored versions
 */

// List of profanity and inappropriate words to filter
// This is a basic list - can be expanded as needed
const PROFANITY_WORDS = [
  // Common profanity
  /\b(ass|asshole|bastard|bitch|damn|darn|dick|fuck|fucking|hell|shit|shitting|piss|pissing)\b/gi,
  // Variations with common substitutions
  /\b(f\*ck|f\*\*k|sh\*t|sh\*\*t|a\*s|a\*\*s|b\*tch|b\*\*ch|d\*ck|d\*\*ck)\b/gi,
  // Slurs and offensive terms (basic list)
  /\b(n\*gga|n\*gger|retard|retarded|gay|fag|faggot)\b/gi,
];

// Replacement function - replaces with asterisks
function replaceProfanity(text: string): string {
  let filtered = text;
  
  PROFANITY_WORDS.forEach(pattern => {
    filtered = filtered.replace(pattern, (match) => {
      // Replace with asterisks, keeping first and last character if word is long enough
      if (match.length > 3) {
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
      }
      return '*'.repeat(match.length);
    });
  });
  
  return filtered;
}

/**
 * Filter profanity from text
 * @param text - The text to filter
 * @returns Filtered text with profanity replaced
 */
export function filterProfanity(text: string): string {
  if (!text) return text;
  return replaceProfanity(text);
}

