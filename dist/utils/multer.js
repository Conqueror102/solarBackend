import multer from 'multer';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from './imageValidation.js';
// File filter function
const fileFilter = (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type. Only ${ALLOWED_IMAGE_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')} are allowed.`));
    }
};
// Configure Multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_SIZE, // 2MB limit
        files: 5 // max 5 files
    },
    fileFilter: fileFilter
});
// Single file upload (for brand logos)
export const uploadSingle = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 1
    },
    fileFilter: fileFilter
});
// Multiple files upload (for product images)
export const uploadMultiple = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 5
    },
    fileFilter: fileFilter
});
export default upload;
