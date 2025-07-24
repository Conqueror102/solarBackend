/**
 * cloudinaryUpload.js
 * -------------------
 * A helper function to upload files to Cloudinary.
 */
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
const uploadToCloudinary = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'solar-products'
        });
        fs.unlinkSync(filePath);
        return result.secure_url;
    }
    catch (error) {
        fs.unlinkSync(filePath);
        throw error;
    }
};
export default uploadToCloudinary;
