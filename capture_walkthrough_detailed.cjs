const puppeteer = require('./server/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'demo_captures_detailed');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5000';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('🚀 Launching Chrome for Ultra-Detailed Demonstration Recording...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  let frameIdx = 1;

  async function snap(title, caption) {
    const filename = `frame_${String(frameIdx).padStart(2, '0')}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    await page.screenshot({ path: filepath });
    console.log(`📸 [Frame ${frameIdx}] ${title} -> ${filename}`);
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `frame_${String(frameIdx).padStart(2, '0')}.json`),
      JSON.stringify({ index: frameIdx, title, caption, filename }, null, 2)
    );
    frameIdx++;
  }

  async function loginAs(email, roleName) {
    console.log(`🔑 Logging in as ${roleName} (${email})...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(400);
    await page.evaluate(async (targetEmail) => {
      const res = await fetch('/api/auth/switch-demo-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('changeflow_token', data.token);
        localStorage.setItem('changeflow_user', JSON.stringify(data.user));
      }
    }, email);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(1200);
  }

  try {
    // -------------------------------------------------------------------------
    // ACT 1: PRODUCT OVERVIEW & AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log('\n--- Act 1: Landing Page & Portal ---');
    await page.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await snap(
      'Enterprise Landing Page Hero',
      'ChangeFlow Enterprise hero header featuring high-availability Industry 4.0 architecture.'
    );

    await page.evaluate(() => window.scrollBy({ top: 650, behavior: 'instant' }));
    await sleep(800);
    await snap(
      '4M Framework & Value Pillars',
      'Unified governance across Man, Machine, Material, and Method changes.'
    );

    await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'CAPEX, Workflows & Procurement Engine',
      'Autonomous financial modeling, weighted vendor scoring, and SLA-governed routing.'
    );

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    await snap(
      'Unified Login & 1-Click Role Switcher',
      'Pre-configured demo accounts for all 9 organizational roles with instant switching.'
    );

    // -------------------------------------------------------------------------
    // ACT 2: EXECUTIVE TIER (Management / Board / Admin)
    // -------------------------------------------------------------------------
    console.log('\n--- Act 2: Executive Management Tier ---');
    await loginAs('director@changeflow.com', 'Executive Management (Aditya Birla)');
    await snap(
      'Executive Management Command Center',
      'Real-time overview of approved capital spend, board sanction queues, and enterprise staff compliance.'
    );

    await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Industrial Departments & HOD Assignments',
      'Organizational hierarchy mapping departments to assigned HODs and direct reporting staff.'
    );

    // Open Appoint Manager Modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Appoint Department Manager')
      );
      if (btn) btn.click();
    });
    await sleep(800);
    await snap(
      'Department Manager Appointment Modal',
      'Executive power to designate and appoint Department HODs to oversee departmental operations.'
    );

    // Close Modal and scroll to Low Performers
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button svg.lucide-x')?.parentElement;
      if (closeBtn) closeBtn.click();
    });
    await sleep(500);
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Low Performance Alerts & Disciplinary Enforcement',
      'Automated detection of staff with under 50% checklist adherence, enabling instant Warning Letters.'
    );

    // -------------------------------------------------------------------------
    // ACT 3: DEPARTMENT MANAGER TIER (HOD)
    // -------------------------------------------------------------------------
    console.log('\n--- Act 3: Department Manager Tier ---');
    await loginAs('hod.prod@changeflow.com', 'Production HOD (Rajesh Sharma)');
    await snap(
      'Department HOD Command Center',
      'Dedicated manager dashboard with daily shift governance checklist and department oversight.'
    );

    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Staff Proposals Pending Review Queue',
      'Proposals raised by shopfloor staff awaiting HOD technical and budget review before Board escalation.'
    );

    await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Department Team Monitoring & Warning Controls',
      'Direct monitoring of department team members with one-click formal warning issuance.'
    );

    // -------------------------------------------------------------------------
    // ACT 4: SPECIALIST WORKSPACES
    // -------------------------------------------------------------------------
    console.log('\n--- Act 4: Specialist Workspaces ---');

    // 4.1 Engineer
    await loginAs('eng.tooling@changeflow.com', 'Engineer (Ananya Verma)');
    await snap(
      'Engineering & Tooling Specialist Workspace',
      'CAD schematic review, CPK tolerance validation, ECN pipeline, and specialized shift checklist.'
    );

    // 4.2 Maintenance
    await loginAs('maint.lead@changeflow.com', 'Maintenance Lead (Manoj Kumar)');
    await snap(
      'Plant Maintenance & Equipment Workspace',
      'Preventive maintenance schedules, MTBF/MTTR metrics, critical spares inventory alerts.'
    );

    // 4.3 Finance
    await loginAs('finance.lead@changeflow.com', 'Finance Lead (Vikram Patel)');
    await snap(
      'Finance & CAPEX Viability Workspace',
      'IRR calculations, Discounted Payback, NPV models, and CAPEX budget line audits.'
    );

    // 4.4 Operator / Employee
    await loginAs('operator1@changeflow.com', 'Production Operator (Rahul Singh)');
    await snap(
      'Shop Floor Operator Workspace',
      'Daily 5S safety checklist, batch production milestones, and quick requisition submission to HOD.'
    );

    // -------------------------------------------------------------------------
    // ACT 5: CORE MODULES & OPERATIONS
    // -------------------------------------------------------------------------
    console.log('\n--- Act 5: Enterprise Modules ---');

    // 5.1 New Proposal Requisition Form
    await page.goto(`${BASE_URL}/proposals/new`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await snap(
      'Capital Equipment Requisition Form',
      'Dynamic proposal creation with automated 4M change classification and CAPEX threshold calculation.'
    );

    // 5.2 Proposals Dossier List
    await page.goto(`${BASE_URL}/proposals`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await snap(
      'Enterprise Proposals & Dossier Register',
      'Comprehensive listing of all active CAPEX and equipment requisitions with status badges.'
    );

    // 5.3 4M Change Management Hub
    await page.goto(`${BASE_URL}/changes4m`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await snap(
      '4M Change Management Hub & Risk Matrix',
      'Comprehensive Man, Machine, Material, and Method change register with severity classification.'
    );

    // 5.4 Vendors & Quotation Comparison
    await page.goto(`${BASE_URL}/vendors`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await snap(
      'Procurement & Vendor Evaluation Matrix',
      'Supplier database with RFQ tracking, delivery performance scoring, and quotation comparisons.'
    );

    // 5.5 Deliveries & FAT Verification
    await page.goto(`${BASE_URL}/deliveries`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await snap(
      'Delivery, FAT & Commissioning Tracker',
      'Factory Acceptance Test verification, installation milestones, and asset registration.'
    );

    // 5.6 Audit Logs & Security
    await page.goto(`${BASE_URL}/audit-logs`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await snap(
      'Immutable Audit Logs & Security Records',
      'Tamper-evident trail tracking every approval, proposal creation, and user login.'
    );

    // 5.7 Final Wrap-up
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await snap(
      'ChangeFlow Enterprise Platform Summary',
      'Complete end-to-end industrial governance from shopfloor operators to Boardroom directors.'
    );

    console.log(`\n🎉 Successfully captured ${frameIdx - 1} high-resolution frames!`);
  } catch (err) {
    console.error('❌ Error during capture:', err);
  } finally {
    await browser.close();
  }
}

capture();
