const puppeteer = require('./server/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'demo_captures_extended');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5000';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('🎬 Launching Chrome for Extended Master Video Walkthrough Recording...');
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
    await sleep(300);
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
    await sleep(800);
  }

  try {
    // -------------------------------------------------------------------------
    // ACT 1: PRODUCT OVERVIEW & AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log('\n--- Act 1: Landing Page & Portal ---');
    await page.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    await snap(
      'Enterprise Landing Page Hero',
      'ChangeFlow Enterprise hero header featuring high-availability Industry 4.0 architecture.'
    );

    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'instant' }));
    await sleep(600);
    await snap(
      '4M Framework & Value Pillars',
      'Unified governance across Man, Machine, Material, and Method industrial changes.'
    );

    await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'instant' }));
    await sleep(600);
    await snap(
      'Financial Engine, SLA Workflows & Procurement',
      'Automated financial modeling, discounted cash flow metrics, and SLA-governed routing.'
    );

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Unified Login & 1-Click Demo Personas',
      'Pre-configured demo accounts for all 9 organizational roles with instant switching.'
    );

    // -------------------------------------------------------------------------
    // ACT 2: EXECUTIVE TIER (Management / Board / Admin)
    // -------------------------------------------------------------------------
    console.log('\n--- Act 2: Executive Management Tier ---');
    await loginAs('director@changeflow.com', 'Executive Management (Aditya Birla)');
    await snap(
      'Executive Management Command Center',
      'Company-wide visibility over total approved spend, board sanction queues, and staff compliance.'
    );

    await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'instant' }));
    await sleep(600);
    await snap(
      'Industrial Departments & HOD Assignments Matrix',
      'Organizational hierarchy mapping departments to assigned HODs and direct reporting staff.'
    );

    // Open Appoint Manager Modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Appoint Department Manager')
      );
      if (btn) btn.click();
    });
    await sleep(600);
    await snap(
      'Department Manager Appointment Modal',
      'Executive modal to designate and appoint Department HODs to oversee departmental operations.'
    );

    // Close Modal and scroll to Low Performers
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button svg.lucide-x')?.parentElement;
      if (closeBtn) closeBtn.click();
    });
    await sleep(400);
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'instant' }));
    await sleep(600);
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
      'Department HOD Command Center & Governance',
      'Dedicated manager dashboard with daily shift governance checklist and department oversight.'
    );

    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
    await sleep(600);
    await snap(
      'Staff Proposals Pending Review Queue',
      'Proposals raised by shopfloor staff awaiting HOD technical and budget review before Board escalation.'
    );

    await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'instant' }));
    await sleep(600);
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
      'CAD schematic vault, CPK tolerance validation (1.67 Six Sigma), ECN pipeline, and dev checklist.'
    );

    // 4.2 Maintenance
    await loginAs('maint.lead@changeflow.com', 'Maintenance Lead (Manoj Kumar)');
    await snap(
      'Plant Maintenance & Equipment Workspace',
      'Preventive maintenance schedules (94.2%), MTBF/MTTR metrics, critical spares inventory alerts.'
    );

    // 4.3 Finance
    await loginAs('finance.lead@changeflow.com', 'Finance Lead (Vikram Patel)');
    await snap(
      'Finance & CAPEX Viability Workspace',
      'IRR calculations (24.8%), Discounted Payback, NPV models, and CAPEX budget line audits.'
    );

    // 4.4 Operator / Employee
    await loginAs('operator1@changeflow.com', 'Production Operator (Rahul Singh)');
    await snap(
      'Shop Floor Operator Workspace',
      'Daily 5S safety checklist, batch production milestones, and quick requisition submission to HOD.'
    );

    // -------------------------------------------------------------------------
    // ACT 5: CORE ENTERPRISE MODULES
    // -------------------------------------------------------------------------
    console.log('\n--- Act 5: Enterprise Modules ---');

    // 5.1 New Proposal Requisition Form
    await page.goto(`${BASE_URL}/proposals/new`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Capital Equipment Requisition Dossier',
      'Dynamic proposal creation with automated 4M change classification and CAPEX threshold calculation.'
    );

    // 5.2 Proposals Dossier List
    await page.goto(`${BASE_URL}/proposals`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Enterprise Proposals & Dossier Register',
      'Comprehensive listing of all active CAPEX and equipment requisitions with status badges.'
    );

    // 5.3 4M Change Management Hub
    await page.goto(`${BASE_URL}/changes4m`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      '4M Change Management Hub & Risk Matrix',
      'Comprehensive Man, Machine, Material, and Method change register with 5x5 severity classification.'
    );

    // 5.4 Quotation Comparison Matrix
    await page.goto(`${BASE_URL}/procurement/comparison`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Quotation Comparison & Weighted Scoring',
      'Supplier quotation comparison with technical specifications, delivery terms, and weighted scoring.'
    );

    // 5.5 Machine Comparison Matrix
    await page.goto(`${BASE_URL}/procurement/machine-matrix`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Machinery Comparison & Technical Matrix',
      'Side-by-side technical evaluation of industrial equipment, OEM specifications, and power consumption.'
    );

    // 5.6 Purchase Orders
    await page.goto(`${BASE_URL}/procurement/orders`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Purchase Orders Lifecycle & PO Dispatch',
      'Purchase order creation, status tracking, payment terms, and vendor dispatch milestone tracking.'
    );

    // 5.7 Delivery & FAT Verification
    await page.goto(`${BASE_URL}/delivery`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Delivery, FAT & Commissioning Tracker',
      'Factory Acceptance Test verification, delivery milestones, installation signoffs, and asset tagging.'
    );

    // 5.8 Asset Register & AMC
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Asset Register & AMC Maintenance Schedule',
      'Complete machinery inventory with asset codes, installation dates, warranty status, and AMC logs.'
    );

    // 5.9 Staff Checklist Performance Analytics
    await page.goto(`${BASE_URL}/staff-performance`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Staff Checklist Performance & Compliance Analytics',
      'Enterprise-wide checklist completion analytics, department compliance rates, and shift trends.'
    );

    // 5.10 Workflow Rules & Thresholds Admin
    await page.goto(`${BASE_URL}/workflows/admin`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Workflow Rules & Threshold Gate Editor',
      'Configurable approval stage templates, SLA day allocations, and multi-tier CAPEX thresholds.'
    );

    // 5.11 Audit Logs & Security
    await page.goto(`${BASE_URL}/audit-logs`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'Immutable Audit Logs & Security Trail',
      'Tamper-evident trail tracking every approval, proposal creation, and user login with IP addresses.'
    );

    // -------------------------------------------------------------------------
    // ACT 6: MOBILE RESPONSIVE EXPERIENCE
    // -------------------------------------------------------------------------
    console.log('\n--- Act 6: Mobile Experience ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(800);
    // Open Mobile Drawer
    await page.evaluate(() => {
      const btn = document.querySelector('header button');
      if (btn) btn.click();
    });
    await sleep(600);
    await snap(
      'Mobile Responsive View & Slide-Over Drawer',
      'Full mobile optimization featuring slide-over navigation drawer, touch controls, and bottom quick actions.'
    );

    // -------------------------------------------------------------------------
    // ACT 7: CONCLUSION
    // -------------------------------------------------------------------------
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(800);
    await snap(
      'ChangeFlow Enterprise Platform Conclusion',
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
