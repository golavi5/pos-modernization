/**
 * Single source of truth for the password policy. Used by the class-validator
 * DTOs (registration, admin create/reset, change password) and mirrored by the
 * service-level `validatePasswordStrength` (auth.constants PASSWORD.*).
 */
export const PASSWORD_MIN_LENGTH = 10;

// Requires lowercase, uppercase, a number, and a special character (@$!%*?&).
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

export const PASSWORD_RULE_MESSAGE =
  `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include ` +
  `uppercase, lowercase, a number, and a special character (@$!%*?&)`;
