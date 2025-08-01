import multer from 'multer';

// Configure Multer for memory storage (no disk usage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
        files: 5 // max 5 files
    }
});

export default upload; 