#!/usr/bin/env node

/**
 * Cron Runner Script
 * 
 * This script is called by Render's cron job service to trigger
 * the daily reminder/notification tasks.
 * 
 * Environment variables:
 * - WEB_HOST: The hostname of the web service (e.g., "myapp.onrender.com")
 * - CRON_SECRET: Secret token for authentication
 */

const https = require('https');

const WEB_HOST = process.env.WEB_HOST;
const CRON_SECRET = process.env.CRON_SECRET;

if (!WEB_HOST) {
  console.error('❌ Error: WEB_HOST environment variable is not set');
  process.exit(1);
}

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET environment variable is not set');
  process.exit(1);
}

const endpoints = [
  '/api/cron/reminders/send',
];

async function callEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `https://${WEB_HOST}${path}`;
    console.log(`📡 Calling: ${url}`);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Success (${res.statusCode}): ${path}`);
          try {
            const json = JSON.parse(data);
            console.log(`   Response:`, JSON.stringify(json, null, 2));
          } catch {
            console.log(`   Response: ${data.substring(0, 200)}`);
          }
          resolve({ path, success: true, status: res.statusCode });
        } else {
          console.error(`❌ Failed (${res.statusCode}): ${path}`);
          console.error(`   Response: ${data.substring(0, 500)}`);
          resolve({ path, success: false, status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error calling ${path}:`, error.message);
      resolve({ path, success: false, error: error.message });
    });

    req.setTimeout(30000, () => {
      console.error(`❌ Timeout calling ${path}`);
      req.destroy();
      resolve({ path, success: false, error: 'Timeout' });
    });

    req.end();
  });
}

async function main() {
  console.log('🕐 Cron job started at:', new Date().toISOString());
  console.log(`   Target host: ${WEB_HOST}`);
  console.log('');

  const results = [];
  for (const endpoint of endpoints) {
    const result = await callEndpoint(endpoint);
    results.push(result);
  }

  console.log('');
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('');
  console.log('🏁 Cron job completed at:', new Date().toISOString());

  // Exit with error if any endpoint failed
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
