import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../config/cloudinary.js';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'Zound/products', // Will create this folder in your Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
});

const uploadProductImage = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export default uploadProductImage;
