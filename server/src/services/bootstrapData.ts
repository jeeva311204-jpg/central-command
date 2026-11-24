import bcrypt from 'bcryptjs';
import { Role } from '../models/Role';
import { Department } from '../models/Department';
import { User } from '../models/User';
import { ProposalType } from '../models/ProposalType';
import { WorkflowTemplate } from '../models/WorkflowTemplate';

/**
 * Ensures baseline roles, departments, and initial accounts exist
 * when running against a fresh database, so users can log in immediately.
 */
export async function ensureBaselineData(): Promise<void> {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return; // Database already initialized
    }

    console.log('⚡ Initializing baseline roles, departments, and demo users...');

    // 1. Roles
    const rolesData = [
      { name: 'Admin', description: 'Full system configuration, threshold editor & user management' },
      { name: 'Management', description: 'Executive sanctioning for proposals above threshold' },
      { name: 'HOD', description: 'Head of Department - Budget allocation & stage 1 approvals' },
      { name: 'Engineer', description: 'Technical feasibility, engineering validation & CPK' },
      { name: 'Finance', description: 'Financial verification, IRR/NPV evaluation & audit' },
      { name: 'Procurement', description: 'Vendor quotations, weighted scoring & PO issuance' },
      { name: 'Quality', description: 'Quality assurance, 4M inspection & FAT verification' },
      { name: 'Maintenance', description: 'Preventive maintenance, asset register & spare parts' },
      { name: 'Employee', description: 'General operator / initiator for proposals & changes' },
    ];

    const rolesMap = new Map<string, any>();
    for (const r of rolesData) {
      const doc = await Role.findOneAndUpdate(
        { name: r.name },
        { name: r.name, description: r.description },
        { upsert: true, new: true }
      );
      rolesMap.set(r.name, doc);
    }

    // 2. Departments
    const deptsData = [
      { name: 'Production', code: 'PROD', description: 'Manufacturing & Assembly Operations' },
      { name: 'Engineering', code: 'ENG', description: 'Process Engineering & Tooling Design' },
      { name: 'Quality Assurance', code: 'QA', description: 'Quality Control, Metrology & Standards' },
      { name: 'Plant Maintenance', code: 'MAINT', description: 'Equipment Maintenance, Utilities & Facility' },
      { name: 'Supply Chain & Logistics', code: 'SCM', description: 'Procurement, Stores & Vendor Management' },
    ];

    const deptsMap = new Map<string, any>();
    for (const d of deptsData) {
      const doc = await Department.findOneAndUpdate(
        { code: d.code },
        { name: d.name, code: d.code, description: d.description },
        { upsert: true, new: true }
      );
      deptsMap.set(d.code, doc);
    }

    // 3. Demo Users
    const passwordHash = await bcrypt.hash('ChangeFlow2026!', 10);

    const usersData = [
      { name: 'System Admin', email: 'admin@changeflow.com', role: 'Admin', dept: 'ENG' },
      { name: 'Aditya Birla', email: 'director@changeflow.com', role: 'Management', dept: 'PROD' },
      { name: 'Rajesh Sharma', email: 'hod.prod@changeflow.com', role: 'HOD', dept: 'PROD' },
      { name: 'Ananya Verma', email: 'eng.tooling@changeflow.com', role: 'Engineer', dept: 'ENG' },
      { name: 'Vikram Patel', email: 'finance.lead@changeflow.com', role: 'Finance', dept: 'PROD' },
      { name: 'Meera Iyer', email: 'procure.head@changeflow.com', role: 'Procurement', dept: 'SCM' },
      { name: 'Suresh Nair', email: 'qa.lead@changeflow.com', role: 'Quality', dept: 'QA' },
      { name: 'Manoj Kumar', email: 'maint.lead@changeflow.com', role: 'Maintenance', dept: 'MAINT' },
      { name: 'Rahul Singh', email: 'operator1@changeflow.com', role: 'Employee', dept: 'PROD' },
    ];

    for (const u of usersData) {
      const roleDoc = rolesMap.get(u.role);
      const deptDoc = deptsMap.get(u.dept);
      await User.findOneAndUpdate(
        { email: u.email },
        {
          name: u.name,
          email: u.email,
          passwordHash,
          roleId: roleDoc?._id,
          departmentId: deptDoc?._id,
          isActive: true,
        },
        { upsert: true, new: true }
      );
    }

    // 4. Default Proposal Types & Workflows
    const defaultTypes = [
      { name: 'New Machine Purchase', code: 'NEW_MACHINE', description: 'Procurement of brand new capital machinery' },
      { name: 'Machine Replacement', code: 'REPLACEMENT', description: 'Replacing obsolete machinery with high-efficiency units' },
      { name: 'Capacity Expansion', code: 'CAPACITY', description: 'Adding throughput capacity to existing production lines' },
      { name: 'Automation', code: 'AUTOMATION', description: 'Robotic or PLC automation to reduce cycle times' },
    ];

    for (const pt of defaultTypes) {
      const propType = await ProposalType.findOneAndUpdate(
        { code: pt.code },
        { name: pt.name, code: pt.code, description: pt.description, isActive: true },
        { upsert: true, new: true }
      );

      const existingWorkflow = await WorkflowTemplate.findOne({ proposalTypeId: propType._id });
      if (!existingWorkflow) {
        await WorkflowTemplate.create({
          name: `${pt.name} Standard Approval Workflow`,
          proposalTypeId: propType._id,
          description: `Standard multi-tier governance for ${pt.name}`,
          stages: [
            { stageOrder: 1, name: 'HOD Sanction', approverRole: 'HOD', slaDays: 2, isMandatory: true },
            { stageOrder: 2, name: 'Technical & Engineering Review', approverRole: 'Engineer', slaDays: 3, isMandatory: true },
            { stageOrder: 3, name: 'Finance & Viability Audit', approverRole: 'Finance', slaDays: 3, isMandatory: true },
            { stageOrder: 4, name: 'Procurement & Quotation Review', approverRole: 'Procurement', slaDays: 2, conditionAmountMin: 1000000, isMandatory: false },
            { stageOrder: 5, name: 'Management Board Final Sanction', approverRole: 'Management', slaDays: 3, conditionAmountMin: 1000000, isMandatory: false },
          ],
        });
      }
    }

    console.log('✅ Baseline data initialization complete. Ready for instant logins.');
  } catch (error) {
    console.error('⚠️ Baseline data initialization notice:', error);
  }
}
