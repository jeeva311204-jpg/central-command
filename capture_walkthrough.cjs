const puppeteer = require('./server/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'demo_captures');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5000';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('🚀 Launching Chrome for Automated Demonstration Recording...');
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

  try {
    // 1. Landing Page
    console.log('Navigating to Landing Page...');
    await page.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await snap(
      'Modern Landing Page Hero',
      'Unified 4M Change Management, CAPEX & Procurement Automation Platform hero section.'
    );

    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Enterprise Architecture Pillars',
      'The 4 core pillars: 4M Change Control, Workflow Engine, Financial DCF/NPV, and Procurement.'
    );

    // 2. Login Screen
    console.log('Navigating to Login Page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    await snap(
      'Login Screen & 1-Click Demo Personas',
      'Instant access to all 9 industrial roles: Management, HOD, Engineers, Maintenance, Finance, and Operators.'
    );

    // Helper for demo login
    async function loginAs(email, roleName) {
      console.log(`Logging in as ${roleName} (${email})...`);
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
      await sleep(500);
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
      await sleep(1500);
    }

    // 3. Executive / Management
    await loginAs('director@changeflow.com', 'Executive Management (Aditya Birla)');
    await snap(
      'Executive Management Command Center',
      'High-level visibility over total approved spend, high-value sanctions, and enterprise checklist stats.'
    );

    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Industrial Departments & Assigned HODs Matrix',
      'Management appoints department managers (HODs) who oversee staff and operational compliance.'
    );

    await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Low Performance Staff & Disciplinary Warning System',
      'Automated flagging of low checklist compliance (<50%) with 1-click Warning / Termination notice issuance.'
    );

    // 4. Department Manager (HOD)
    await loginAs('hod.prod@changeflow.com', 'Department Manager / HOD (Rajesh Sharma)');
    await snap(
      'Department Manager Command Center & Checklists',
      'Manager daily shift checklist, reviewing shift handovers, team performance, and EHS safety.'
    );

    await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'instant' }));
    await sleep(800);
    await snap(
      'Department Staff Proposals Review Queue',
      'Requisitions raised by department staff (Operators, Engineers) queued for HOD review before board escalation.'
    );

    // 5. Specialist: Shopfloor Operator / Employee
    await loginAs('operator1@changeflow.com', 'Shopfloor Operator (Rahul Singh)');
    await snap(
      'Shopfloor Operator Workspace & Daily Shift Checklist',
      'Daily operational checklist: Job Done, Milestone, Cycle Time analysis, and 5S safety signoff.'
    );

    // 6. Specialist: Engineering
    await loginAs('eng.tooling@changeflow.com', 'Engineering Specialist (Ananya Verma)');
    await snap(
      'Engineering Specialist Workspace & CAD/Dev Checklist',
      'Daily engineering checklist: CAD modeling, technical feasibility, CPK tolerances, and prototype trials.'
    );

    // 7. Specialist: Plant Maintenance
    await loginAs('maint.lead@changeflow.com', 'Plant Maintenance Specialist (Manoj Kumar)');
    await snap(
      'Plant Maintenance Workspace & PM Schedules',
      'Preventive maintenance schedules, breakdown logs, sensor calibrations, and critical spare parts.'
    );

    // 8. Specialist: Finance Controller
    await loginAs('finance.lead@changeflow.com', 'Finance Controller (Vikram Patel)');
    await snap(
      'Finance Controller Workspace & DCF/NPV Viability',
      'Daily financial audit checklist: CAPEX line allocation, DCF/NPV calculations, and quotation variance.'
    );

    // 9. 4M Change Control
    await page.goto(`${BASE_URL}/changes4m`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await snap(
      '4M Change Management & Dynamic Risk Matrix',
      'Logging Man, Machine, Material & Method modifications with 5x5 severity/probability risk scoring.'
    );

    // 10. Multi-Vendor Quotation Comparison
    await page.goto(`${BASE_URL}/procurement/comparison`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await snap(
      'Multi-Vendor Quotation Comparison & Weighted Scoring',
      'Side-by-side bid comparison across price, warranty, capacity, power kW, and vendor rating.'
    );

    // 11. Machine Matrix
    await page.goto(`${BASE_URL}/procurement/machine-matrix`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await snap(
      'Machine Comparison Matrix with Row Value Highlights',
      'Direct specification benchmarks across competing industrial machinery.'
    );

    // 12. Asset Register
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await snap(
      'Commissioned Asset Register & Maintenance Schedules',
      'Auto-registered equipment post-commissioning with serial numbers, warranty alerts, and preventive maintenance.'
    );

    console.log(`✅ All ${frameIdx - 1} frames captured successfully!`);
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

capture();
