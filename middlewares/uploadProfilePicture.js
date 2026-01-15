import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../public/uploads/profile-pictures");

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Use user ID and timestamp for unique filename
        const userId = req.user?._id || 'unknown';
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `profile-${userId}-${Date.now()}${ext}`);
    },
});

function fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"), false);
    }
    cb(null, true);
}

const uploadProfilePicture = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

export default uploadProfilePicture;
