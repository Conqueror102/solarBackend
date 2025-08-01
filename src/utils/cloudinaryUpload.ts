
/**
 * cloudinaryUpload.js
 * -------------------
 * A helper function to upload files to Cloudinary.
 */
import cloudinary from '../config/cloudinary.js';


/**
 * Uploads an image buffer to Cloudinary in the 'solar-image' folder.
 * @param buffer - The image buffer
 * @param mimetype - The image mimetype (e.g., 'image/jpeg')
 * @returns The Cloudinary upload result
 */
const uploadToCloudinary = async (buffer: Buffer, mimetype: string) => {
    return await cloudinary.uploader.upload(
        `data:${mimetype};base64,${buffer.toString('base64')}`,
        {
            resource_type: 'auto',
            folder: 'solar-image',
        }
    );
};

export default uploadToCloudinary;
