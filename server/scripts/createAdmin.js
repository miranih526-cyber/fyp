/**
 * Create (or promote) an admin user. Public registration does not allow role "admin".
 *
 * Usage (from server folder):
 *   npm run create-admin -- <email> <password> [displayName]
 *
 * Or set in server/.env then run `npm run create-admin`:
 *   ADMIN_EMAIL=you@example.com
 *   ADMIN_PASSWORD=at_least_6_chars
 *   ADMIN_NAME=Administrator
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const args = process.argv.slice(2);
  let email;
  let password;
  let name;

  if (args.length >= 2) {
    [email, password, name] = args;
  } else {
    email = process.env.ADMIN_EMAIL;
    password = process.env.ADMIN_PASSWORD;
    name = process.env.ADMIN_NAME;
  }

  if (!email || !password) {
    console.error(`
Missing email or password.

Option A — command line:
  cd server
  npm run create-admin -- admin@yourdomain.com YourSecurePassword123 "Admin Name"

Option B — add to server/.env then:
  ADMIN_EMAIL=admin@yourdomain.com
  ADMIN_PASSWORD=YourSecurePassword123
  ADMIN_NAME=Administrator
  npm run create-admin
`);
    process.exit(1);
  }

  if (String(password).length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set in server/.env");
    process.exit(1);
  }

  const emailNorm = String(email).toLowerCase().trim();
  const displayName = (name && String(name).trim()) || "Administrator";

  await mongoose.connect(uri);

  const existing = await User.findOne({ email: emailNorm }).select("+password");
  if (existing) {
    if (existing.role === "admin") {
      console.log(`"${emailNorm}" is already an admin. Nothing to do.`);
      await mongoose.disconnect();
      return;
    }
    existing.role = "admin";
    existing.password = password;
    existing.name = displayName;
    await existing.save();
    console.log(`Promoted "${emailNorm}" to admin and updated password.`);
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name: displayName,
    email: emailNorm,
    password,
    role: "admin",
    rollNo: "",
  });
  console.log(`Created admin user: ${emailNorm}`);
  console.log("Log in at the client with this email and password, then open /admin/dashboard.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
