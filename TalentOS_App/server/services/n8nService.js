import dotenv from 'dotenv';

dotenv.config();

const webhookUrl = process.env.N8N_WEBHOOK_URL;

/**
 * Triggers an n8n webhook workflow for automated processing (e.g., repository commits, candidate CV parsing, skills evaluation)
 * @param {string} action Ingestion trigger action type 
 * @param {object} payload Context details to forward
 */
export const triggerN8nWorkflow = async (action, payload) => {
  if (!webhookUrl) {
    console.warn('[n8nService] N8N_WEBHOOK_URL is missing. Simulating workflow execution.');
    return {
      success: true,
      simulated: true,
      action,
      payload,
      timestamp: new Date().toISOString()
    };
  }

  try {
    console.log(`[n8nService] Sending payload to n8n webhook: ${webhookUrl} for action: ${action}`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        payload
      })
    });

    if (response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = { status: 'OK' };
      }
      console.log('[n8nService] Webhook response received successfully:', data);
      return { success: true, simulated: false, response: data };
    } else {
      const errText = await response.text();
      console.error(`[n8nService] Webhook request failed with status ${response.status}:`, errText);
      return { success: false, status: response.status, error: errText };
    }
  } catch (error) {
    console.error(`[n8nService] Error sending webhook to n8n:`, error.message);
    return { success: false, error: error.message };
  }
};

export default {
  triggerN8nWorkflow
};
