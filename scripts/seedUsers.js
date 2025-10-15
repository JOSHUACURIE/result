const dotenv = require('dotenv');
dotenv.config();

const { sequelize } = require('../config/db');
const User = require('../models/User');

async function ensureUser({ full_name, email, password, roles }) {
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`ℹ️ User exists: ${email} [${existing.roles.join(', ')}]`);
    return existing;
  }
  const created = await User.create({ full_name, email: email.toLowerCase(), password, roles });
  console.log(`✅ Created user: ${email} [${roles.join(', ')}]`);
  return created;
}

async function run() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected');

    await User.sync();

    await ensureUser({
      full_name: 'System Administrator',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@school.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
      roles: ['Admin']
    });

    await ensureUser({
      full_name: 'Director of Studies',
      email: process.env.SEED_DOS_EMAIL || 'dos@school.com',
      password: process.env.SEED_DOS_PASSWORD || 'Dos@123',
      roles: ['DOS']
    });

    await ensureUser({
      full_name: 'School Principal',
      email: process.env.SEED_PRINCIPAL_EMAIL || 'principal@school.com',
      password: process.env.SEED_PRINCIPAL_PASSWORD || 'Principal@123',
      roles: ['Principal']
    });

    await ensureUser({
      full_name: 'Sample Teacher',
      email: process.env.SEED_TEACHER_EMAIL || 'teacher@school.com',
      password: process.env.SEED_TEACHER_PASSWORD || 'Teacher@123',
      roles: ['Teacher']
    });

    console.log('🎉 Seeding complete');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await sequelize.close();
    console.log('🔒 Connection closed');
  }
}

run();


