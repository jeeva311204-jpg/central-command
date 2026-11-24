import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.py', '.php', '.dll', '.bin', '.vbs', '.ps1'];

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum size limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Prohibit blocked/executable extensions
    if (blockedExtensions.includes(ext)) {
      return cb(new Error(`Security block: Executable or script files with extension ${ext} are strictly prohibited.`));
    }

    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`Invalid file extension ${ext}. Allowed formats: ${allowedExtensions.join(', ')}`));
    }

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file MIME type: ${file.mimetype}. Allowed: PDF, Images, Word, Excel, CSV`));
    }
  },
});
