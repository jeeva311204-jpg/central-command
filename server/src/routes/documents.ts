import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List documents
router.get('/', authenticateToken, async (req, res) => {
  const { proposalId, entityType } = req.query;
  const where: any = {};
  if (proposalId) where.proposalId = String(proposalId);
  if (entityType) where.entityType = String(entityType);

  const docs = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
      proposal: { select: { id: true, proposalNumber: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(docs);
});

// Upload document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { proposalId, entityType, entityId } = req.body;

    const doc = await prisma.document.create({
      data: {
        proposalId: proposalId || null,
        entityType: entityType || 'GENERAL',
        entityId: entityId || null,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: `/uploads/${req.file.filename}`,
        uploadedById: req.user!.id,
      },
      include: { uploadedBy: true },
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'DOCUMENT',
      entityId: doc.id,
      action: 'CREATE',
      after: { fileName: doc.fileName, size: doc.fileSize },
      ipAddress: req.ip,
    });

    return res.status(201).json(doc);
  } catch (err: any) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

export default router;
