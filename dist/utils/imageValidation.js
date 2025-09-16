// Image validation constants
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
// Image validation function
export const validateImageFile = (file) => {
    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return {
            isValid: false,
            error: 'Invalid file type. Only JPEG, PNG, and WEBP are allowed.'
        };
    }
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
        return {
            isValid: false,
            error: 'File too large. Max size is 2MB.'
        };
    }
    return { isValid: true };
};
// Validate multiple files
export const validateImageFiles = (files) => {
    for (const file of files) {
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            return validation;
        }
    }
    return { isValid: true };
};
// Get file type error message
export const getFileTypeError = () => {
    return `Invalid file type. Only ${ALLOWED_IMAGE_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')} are allowed.`;
};
// Get file size error message
export const getFileSizeError = () => {
    return `File too large. Max size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`;
};
