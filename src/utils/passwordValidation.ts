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
      errors.push('Your password needs to be at least 10 characters long. Try adding more words or characters.');
    } else {
      score += Math.min(30, password.length * 2);
    }

    // Uppercase check (15 points)
    if (!/[A-Z]/.test(password)) {
      errors.push('Please include at least one capital letter (A-Z) to make your password stronger.');
    } else {
      score += 15;
    }

    // Lowercase check (15 points)
    if (!/[a-z]/.test(password)) {
      errors.push('Please include at least one lowercase letter (a-z) in your password.');
    } else {
      score += 15;
    }

    // Number check (15 points)
    if (!/\d/.test(password)) {
      errors.push('Add at least one number (0-9) to strengthen your password.');
    } else {
      score += 15;
    }

    // Special character check (15 points)
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Include at least one special character like @, $, !, %, *, ?, or & to secure your password.');
    } else {
      score += 15;
    }

    // Consecutive characters check (10 points)
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Avoid using the same character more than twice in a row (like "aaa" or "111").');
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

  static formatPasswordErrors(errors: string[]): string {
    if (errors.length === 0) return '';
    
    if (errors.length === 1) {
      return `Password requirement: ${errors[0]}`;
    }
    
    const lastError = errors.pop();
    const formattedErrors = errors.join(', ');
    
    return `Password requirements: ${formattedErrors}, and ${lastError}`;
  }
}
