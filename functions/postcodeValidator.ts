// UK Postcode validation and normalization

/**
 * Validates if a string is a valid UK postcode format
 * UK postcodes follow the pattern: [A-Z]{1,2}[0-9]{1,2} [0-9][A-Z]{2}
 * @param {string} postcode
 * @returns {boolean}
 */
export function isValidPostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') return false;
  
  const normalized = postcode.trim().toUpperCase();
  // UK Postcode regex pattern (simplified but comprehensive)
  const pattern = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;
  return pattern.test(normalized);
}

/**
 * Normalizes a postcode (uppercase, trim, add space if needed)
 * @param {string} postcode
 * @returns {string|null}
 */
export function normalizePostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') return null;
  
  let normalized = postcode.trim().toUpperCase();
  
  // Remove existing spaces
  normalized = normalized.replace(/\s/g, '');
  
  // Add space before last 3 chars (inward code)
  if (normalized.length === 6) {
    normalized = normalized.slice(0, -3) + ' ' + normalized.slice(-3);
  } else if (normalized.length === 7) {
    normalized = normalized.slice(0, -3) + ' ' + normalized.slice(-3);
  }
  
  return isValidPostcode(normalized) ? normalized : null;
}

/**
 * Extracts postcode area (outward code) from full postcode
 * Example: PL13 2JE → PL
 * @param {string} postcode
 * @returns {string|null}
 */
export function extractPostcodeArea(postcode) {
  const normalized = normalizePostcode(postcode);
  if (!normalized) return null;
  
  // Extract alphabetic part only
  const match = normalized.match(/^[A-Z]+/);
  return match ? match[0] : null;
}

/**
 * Extracts postcode district from full postcode
 * Example: PL13 2JE → PL13
 * @param {string} postcode
 * @returns {string|null}
 */
export function extractPostcodeDistrict(postcode) {
  const normalized = normalizePostcode(postcode);
  if (!normalized) return null;
  
  // Extract everything before the space
  return normalized.split(' ')[0];
}