import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Zound/brand-logos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const uploadBrandLogo = multer({ storage });

export default uploadBrandLogo;
