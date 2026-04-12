const config = {
  db: {
    host: globalThis.process.env.DB_HOST,
    user: globalThis.process.env.DB_USER,
    password: globalThis.process.env.DB_PASSWORD,
    database: globalThis.process.env.DB_NAME,
  },
  salt_rounds: 12,
  default_admin_password: "admin",
};

module.exports = config;
