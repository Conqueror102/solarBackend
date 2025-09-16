/**
 * Password validation service
 * Provides utilities for password validation and strength checking
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
}

export class PasswordValidationService {
  static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check (up to 30 points)
    if (password.length < 10) {
      errors.push('Password must be at least 10 characters long');
    } else {
      score += Math.min(30, password.length * 2);
    }

    // Uppercase check (15 points)
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 15;
    }

    // Lowercase check (15 points)
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 15;
    }

    // Number check (15 points)
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 15;
    }

    // Special character check (15 points)
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    } else {
      score += 15;
    }

    // Consecutive characters check (10 points)
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain more than 2 consecutive identical characters');
    } else {
      score += 10;
    }

    // Additional checks for stronger passwords
    const hasMultipleNumbers = (password.match(/\d/g) || []).length > 1;
    const hasMultipleSpecialChars = (password.match(/[@$!%*?&]/g) || []).length > 1;
    
    if (hasMultipleNumbers) score += 5;
    if (hasMultipleSpecialChars) score += 5;

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(100, score)
    };
  }

  static getPasswordStrengthLabel(score: number): string {
    if (score >= 90) return 'Very Strong';
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Moderate';
    if (score >= 30) return 'Weak';
    return 'Very Weak';
  }

  static suggestStrongerPassword(currentPassword: string): string {
    const suggestions: string[] = [];
    const result = this.validatePassword(currentPassword);

    if (!/[A-Z]/.test(currentPassword)) {
      suggestions.push('Add uppercase letters');
    }
    if (!/[a-z]/.test(currentPassword)) {
      suggestions.push('Add lowercase letters');
    }
    if (!/\d/.test(currentPassword)) {
      suggestions.push('Add numbers');
    }
    if (!/[@$!%*?&]/.test(currentPassword)) {
      suggestions.push('Add special characters (@$!%*?&)');
    }
    if (currentPassword.length < 10) {
      suggestions.push('Make it longer (at least 10 characters)');
    }
    if (/(.)\1{2,}/.test(currentPassword)) {
      suggestions.push('Avoid repeating characters more than twice in a row');
    }

    return suggestions.join(', ');
  }
}
