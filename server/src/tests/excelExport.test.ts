import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { app } from '../app';
import { prisma } from '../db';
import { generateToken } from '../middleware/auth';

describe('Item 8: Excel Export Functionality Test Suite', () => {
  let userToken: string;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({
      where: { role: { name: 'Management' } },
      include: { role: true },
    });
    userToken = generateToken(user);
  });

  it('exports CAPEX Dashboard to multi-sheet Excel workbook', async () => {
    const res = await request(app)
      .get('/api/capex/export/excel')
      .set('Authorization', `Bearer ${userToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('ChangeFlow-CAPEX-Dashboard.xlsx');

    // Parse the generated workbook buffer to verify integrity
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);

    expect(workbook.worksheets.length).toBe(3);
    const summarySheet = workbook.getWorksheet('Executive Summary');
    const deptSheet = workbook.getWorksheet('Department Budgets');
    const propSheet = workbook.getWorksheet('Proposals Breakdown');

    expect(summarySheet).toBeDefined();
    expect(deptSheet).toBeDefined();
    expect(propSheet).toBeDefined();
    expect(summarySheet?.rowCount).toBeGreaterThan(5);
  });

  it('exports Proposal List to Excel with all 16 financial and betterment columns', async () => {
    const res = await request(app)
      .get('/api/proposals/export/excel')
      .set('Authorization', `Bearer ${userToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('ChangeFlow-Proposals-Register.xlsx');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);

    const sheet = workbook.getWorksheet('Proposals Register');
    expect(sheet).toBeDefined();
    expect(sheet?.columns.length).toBe(16);
    expect(sheet?.rowCount).toBeGreaterThan(1);
  });
});
