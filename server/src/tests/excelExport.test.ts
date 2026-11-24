import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { app } from '../app';
import { setupTestDB, teardownTestDB } from './setup';
import { User, Department, Proposal, ProposalType, Budget, Role } from '../models';
import { generateToken } from '../middleware/auth';

describe('Item 8: Excel Export Functionality Test Suite', () => {
  let userToken: string;

  beforeAll(async () => {
    await setupTestDB();

    const role = await Role.findOneAndUpdate(
      { name: 'Management' },
      { name: 'Management' },
      { upsert: true, new: true }
    );

    const dept = await Department.create({ name: 'Export Dept', code: 'EXD', isActive: true });
    const user = await User.create({
      name: 'Executive User',
      email: `exec-${Date.now()}@changeflow.com`,
      roleId: role._id,
      roleName: 'Management',
      departmentId: dept._id,
      passwordHash: 'dummyhash',
      isActive: true,
    });

    userToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: 'Management',
      departmentId: dept._id.toString(),
    });

    const propType = await ProposalType.create({ code: 'EXCEL_TEST', name: 'Excel Test Type', isActive: true });

    await Budget.create({
      departmentId: dept._id,
      fiscalYear: 'FY2026-27',
      allocatedAmount: 10000000,
      utilisedAmount: 2000000,
    });

    await Proposal.create({
      proposalNumber: `EXCEL-PRP-${Date.now()}`,
      title: 'Excel Test Machinery',
      proposalTypeId: propType._id,
      departmentId: dept._id,
      initiatorId: user._id,
      totalInvestment: 2000000,
      annualSavings: 800000,
      roiPercent: 40,
      simplePayback: 2.5,
      npv: 1500000,
      irr: 35,
      budgetImpactStatus: 'WITHIN_BUDGET',
      status: 'APPROVED',
    });
  });

  afterAll(async () => {
    await teardownTestDB();
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
