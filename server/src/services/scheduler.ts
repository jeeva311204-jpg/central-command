import cron from 'node-cron';
import { runSLACheckAndEscalations } from './workflowEngine';

let slaTask: any = null;

/**
 * Initialize background scheduled tasks
 */
export function startScheduler() {
  const cronExpression = process.env.SLA_CRON_SCHEDULE || '0 * * * *'; // Default: every hour
  
  console.log(`⏰ Initializing SLA Escalation Cron with expression: "${cronExpression}"`);
  
  slaTask = cron.schedule(cronExpression, async () => {
    console.log('⏰ Running automated SLA check and escalation routine...');
    try {
      const results = await runSLACheckAndEscalations();
      console.log(`✅ Automated SLA check completed. ${results.length} proposals escalated.`);
    } catch (error) {
      console.error('❌ Error executing automated SLA check cron:', error);
    }
  });

  return slaTask;
}

/**
 * Stop background scheduled tasks
 */
export function stopScheduler() {
  if (slaTask) {
    slaTask.stop();
    slaTask = null;
    console.log('🛑 SLA Escalation Cron stopped.');
  }
}
