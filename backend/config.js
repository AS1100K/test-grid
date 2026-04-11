const config = {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  salt_rounds: 12,
  default_admin_password: "admin",
};

module.exports = config;
