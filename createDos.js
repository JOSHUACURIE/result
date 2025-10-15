const dotenv = require("dotenv");
const { sequelize } = require("./config/db");
const User = require("./models/User");

dotenv.config();

const createDos = async () => {
  try {
    console.log("🔄 Connecting to PostgreSQL...");
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL successfully");

    // Sync User model
    await User.sync(); 

    const email = "principal@school.com";
    const password = "principal123";
    const fullname = " Principal of Studies";

    // Check if DOS user already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      console.log("ℹ️ DOS user already exists:");
      console.log("   📧 Email:", existingUser.email);
      console.log("   🏷️ Role:", existingUser.role);
      console.log("   ✅ Status:", existingUser.is_active ? "Active" : "Inactive");
      return;
    }

    // Create DOS user
    const dosUser = await User.create({
      fullname: fullname,
      email: email.toLowerCase(),
      password_hash: password, // Will be hashed by the model hook
      role: "principal",
      is_active: true
    });

    console.log("🎉 DOS user created successfully!");
    console.log("   👤 Name:", dosUser.fullname);
    console.log("   📧 Email:", dosUser.email);
    console.log("   🏷️ Role:", dosUser.role);
    console.log("   🔐 Password:", password);
    console.log("   ✅ Status: Active");

  } catch (error) {
    console.error("❌ Failed to create DOS user:");
    console.error("   Error:", error.message);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error("   ℹ️ User with this email already exists");
    }
    
  } finally {
    await sequelize.close();
    console.log("🔒 Database connection closed");
  }
};

// Create additional default users if needed
const createDefaultUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log("🔄 Creating default users...");

    const defaultUsers = [
      {
        fullname: "School Principal",
        email: "principal@school.com",
        password: "principal123",
        role: "principal",
        description: "School Principal Account"
      },
      {
        fullname: "Demo Teacher",
        email: "teacher@demo.com", 
        password: "teacher123",
        role: "teacher",
        description: "Demo Teacher Account"
      }
    ];

    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      
      if (!existingUser) {
        const user = await User.create({
          fullname: userData.fullname,
          email: userData.email.toLowerCase(),
          password_hash: userData.password,
          role: userData.role,
          is_active: true
        });
        console.log(`✅ ${userData.description} created: ${user.email}`);
      } else {
        console.log(`ℹ️ ${userData.description} already exists: ${existingUser.email}`);
      }
    }

  } catch (error) {
    console.error("❌ Failed to create default users:", error.message);
  } finally {
    await sequelize.close();
  }
};

// Run the script
const initializeDefaultAccounts = async () => {
  console.log("🎯 Initializing Default System Accounts...");
  console.log("===========================================");
  
  await createDos();
  
  console.log("\n📋 Optional: Create additional default users?");
  console.log("   Uncomment createDefaultUsers() in the script if needed");
  
  // Uncomment the line below if you want to create additional default users
  // await createDefaultUsers();
};

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--all-users')) {
  initializeDefaultAccounts().then(() => {
    console.log("\n🎊 All default accounts initialized successfully!");
  });
} else {
  createDos().then(() => {
    console.log("\n🎊 DOS account initialization completed!");
  });
}

module.exports = { createDos, createDefaultUsers };