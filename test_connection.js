const { Client } = require('pg');

const regions = [
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-2',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
  'ca-central-1', 'sa-east-1'
];
const password = 'Uvbuuvbu4366@';
const projectRef = 'lrnajodxfwegimnwnbdd';

async function testRegions() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:5432/postgres`;
    const client = new Client({ 
      connectionString, 
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log(`Testing region: ${region} (${host})...`);
    try {
      await client.connect();
      console.log(`✅ Success in region: ${region}`);
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`❌ Failed in region ${region}: ${err.message}`);
    }
  }
  process.exit(1);
}

testRegions();
