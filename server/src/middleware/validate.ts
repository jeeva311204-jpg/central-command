import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err: any) {
      const issues = err?.issues || err?.errors || [];
      return res.status(400).json({
        error: 'Validation failed',
        details: Array.isArray(issues) && issues.length > 0
          ? issues.map((e: any) => ({
              field: Array.isArray(e.path) ? e.path.join('.') : 'body',
              message: e.message || 'Validation error',
            }))
          : [{ field: 'body', message: err?.message || 'Invalid payload' }],
      });
    }
  };
}

// Common Zod schemas
export const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password cannot be empty'),
});

export const workflowActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_REVISION', 'DELEGATE'], {
    message: 'Action must be APPROVE, REJECT, REQUEST_REVISION, or DELEGATE',
  }),
  comments: z.string().optional(),
  checklistResponses: z.any().optional(),
  delegatedToId: z.string().optional(),
  expectedStageId: z.string().optional(),
});

export const stageUpdateSchema = z.object({
  name: z.string().optional(),
  approverRole: z.string().optional(),
  slaDays: z.number().int().positive().optional(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  conditionExpr: z.string().nullable().optional(),
});

export const proposalCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  proposalTypeId: z.string().min(1, 'Proposal type ID is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  machineName: z.string().optional(),
  purchasePrice: z.union([z.number(), z.string()]).transform(val => Number(val)).optional(),
  annualSavings: z.union([z.number(), z.string()]).transform(val => Number(val)).optional(),
  allowOverrun: z.boolean().optional(),
}).passthrough();

export const change4mCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  changeCategory: z.enum(['MAN', 'MACHINE', 'MATERIAL', 'METHOD'], {
    message: 'changeCategory must be MAN, MACHINE, MATERIAL, or METHOD',
  }),
  departmentId: z.string().min(1, 'Department ID is required'),
  reasonForChange: z.string().optional(),
  riskImpactLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
}).passthrough();
