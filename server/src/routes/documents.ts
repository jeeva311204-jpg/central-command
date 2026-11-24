import { Router } from 'express';
import mongoose from 'mongoose';
import { DocumentModel } from '../models';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { proposalId, entityType } = req.query;
    const query: any = {};
    if (proposalId) query.proposalId = new mongoose.Types.ObjectId(String(proposalId));
    if (entityType) query.entityType = String(entityType);

    const docs = await DocumentModel.find(query)
      .populate('uploadedBy', 'name role')
      .populate('proposal', 'proposalNumber title')
      .sort({ createdAt: -1 });

    const result = docs.map((d) => {
      const obj = d.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Upload document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { proposalId, entityType, entityId } = req.body;

    const doc = await DocumentModel.create({
      proposalId: proposalId ? new mongoose.Types.ObjectId(String(proposalId)) : undefined,
      entityType: entityType || 'GENERAL',
      entityId: entityId || undefined,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `/uploads/${req.file.filename}`,
      uploadedById: new mongoose.Types.ObjectId(req.user!.id),
    });

    const populated = await DocumentModel.findById(doc._id).populate('uploadedBy');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'DOCUMENT',
      entityId: doc._id.toString(),
      action: 'CREATE',
      after: { fileName: doc.fileName, size: doc.fileSize },
      ipAddress: req.ip,
    });

    const obj = populated!.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.status(201).json(obj);
  } catch (err: any) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

export default router;
