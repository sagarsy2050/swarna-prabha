import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../utils/asyncHandler.js';
import { fileService, MAX_UPLOAD_BYTES } from '../services/file.service.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../middleware/schemas.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

router.use(authenticate);

// multipart/form-data; field name "file"; optional "purpose" field.
// Replaces Base44 Core.UploadFile — response includes `file_url` for compatibility.
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const data = await fileService.upload(
      { ...req.file, purpose: req.body?.purpose },
      { user: req.user },
    );
    res.status(201).json({ data });
  }),
);

router.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const data = await fileService.remove(req.params.id, { user: req.user });
    res.json({ data });
  }),
);

export default router;
