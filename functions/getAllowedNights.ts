/**
 * Calculate allowed nights based on property booking rules
 * @param {Object} property - Property object with day_based_restrictions_enabled and booking_rules
 * @returns {number[]} Array of allowed night values (1-28)
 */
export function getAllowedNights(property) {
  // If no restrictions enabled, allow 1-28
  if (!property?.day_based_restrictions_enabled || !property?.booking_rules) {
    return Array.from({ length: 28 }, (_, i) => i + 1);
  }

  const rules = property.booking_rules;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Collect all fixed days and multiples from enabled days
  const allowedValues = new Set();
  let hasAnyRuleType = false;

  dayNames.forEach(dayName => {
    const dayRule = rules[dayName];
    
    // Skip disabled days
    if (!dayRule || dayRule.enabled === false) {
      return;
    }

    const ruleType = dayRule.rule_type || 'any';

    // If any day uses 'any' rule, we can't restrict
    if (ruleType === 'any') {
      hasAnyRuleType = true;
    }

    // Collect fixed values
    if (dayRule.fixed_values && Array.isArray(dayRule.fixed_values)) {
      dayRule.fixed_values.forEach(val => allowedValues.add(val));
    }

    // Generate multiples
    if (dayRule.multiple_of && Array.isArray(dayRule.multiple_of)) {
      dayRule.multiple_of.forEach(multiplier => {
        for (let i = 1; i * multiplier <= 28; i++) {
          allowedValues.add(i * multiplier);
        }
      });
    }

    // For fixed_or_multiples, handle both fixed and multiples
    if (ruleType === 'fixed_or_multiples') {
      if (dayRule.fixed_values && Array.isArray(dayRule.fixed_values)) {
        dayRule.fixed_values.forEach(val => allowedValues.add(val));
      }
      if (dayRule.multiple_of && Array.isArray(dayRule.multiple_of)) {
        dayRule.multiple_of.forEach(multiplier => {
          for (let i = 1; i * multiplier <= 28; i++) {
            allowedValues.add(i * multiplier);
          }
        });
      }
    }
  });

  // If any day has 'any' rule or no specific values defined, return default range
  if (hasAnyRuleType || allowedValues.size === 0) {
    const minNights = property.minimum_stay || 1;
    return Array.from({ length: 28 - minNights + 1 }, (_, i) => minNights + i);
  }

  // Return sorted allowed values
  return Array.from(allowedValues).sort((a, b) => a - b);
}