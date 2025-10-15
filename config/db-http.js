// config/db-http.js
const { Neon } = require('@neondatabase/serverless');

// Initialize Neon with your connection details
const neon = new Neon('postgresql://neondb_owner:npg_9LuCZdz7hpRN@ep-withered-haze-ad2517vg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function testNeonHTTP() {
  try {
    console.log('🔍 Testing Neon HTTP API...');
    const result = await neon('SELECT version(), current_database()');
    console.log('✅ Neon HTTP API connected successfully!');
    console.log('Database:', result[0].current_database);
    console.log('Version:', result[0].version);
    return true;
  } catch (error) {
    console.error('❌ Neon HTTP API failed:', error.message);
    return false;
  }
}

module.exports = { neon, testNeonHTTP };