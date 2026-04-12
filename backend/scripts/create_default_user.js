/* eslint-disable no-undef */

const mysql = require("mysql2");
const config = require("../config");
const bcrypt = require("bcrypt");

async function main() {
  const db = mysql.createConnection(config.db).promise();

  try {
    // Check if there is at least one user
    const [users] = await db.query("SELECT 1 FROM users LIMIT 1;");

    if (users.length > 0) {
      console.log("Users already exist. Skipping default admin creation.");
      return;
    }

    const password_hash = await bcrypt.hash(
      config.default_admin_password,
      config.salt_rounds,
    );

    const [result] = await db.query(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
      ["admin", password_hash, "super_admin"],
    );

    console.debug("Rows affected: " + result.affectedRows);
    console.log("Created default Super Admin with:");
    console.log(" Username: admin");
    console.log(" Password:", config.default_admin_password);
  } catch (err) {
    console.error("Error creating default user:", err);
    process.exitCode = 1;
  } finally {
    // Ensure connection is closed
    try {
      await db.end();
    } catch {
      // ignore close errors
    }
  }
}

main();
