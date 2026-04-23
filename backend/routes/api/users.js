const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../../services/db");
const config = require("../../config");
const { hasPermissions } = require("../../utils");

const router = express.Router();

function toCsvSafeValue(value) {
  if (value == null) {
    return "";
  }

  const str = String(value);
  const trimmed = str.trimStart();
  const requiresEscaping =
    /^[=+\-@]/.test(trimmed) || str.startsWith("\t") || str.startsWith("\r");
  const safe = requiresEscaping ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  const headerLine = headers.map((h) => toCsvSafeValue(h.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => toCsvSafeValue(row[h.key])).join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeRole(value) {
  const role = normalizeString(value);
  if (role == null) {
    return null;
  }
  return role.toLowerCase();
}

function normalizeExamId(value) {
  if (value == null || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : Number.NaN;
}

function normalizeDob(value) {
  const dob = normalizeString(value);
  if (dob == null) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return dob;
  }

  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function canManageRole(actorRole, targetRole) {
  if (actorRole === "super_admin") {
    return targetRole === "admin" || targetRole === "student";
  }
  return actorRole === "admin" && targetRole === "student";
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        value += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") {
        i++;
      }
      row.push(value.trim());
      value = "";
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    value += ch;
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }
  return rows;
}

async function insertUser(conn, payload) {
  const passwordHash = await bcrypt.hash(payload.password, config.salt_rounds);
  await conn.query(
    "INSERT INTO users (username, password_hash, role, assigned_exam_id, name, roll_number, dob, email_id, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
    [
      payload.username,
      passwordHash,
      payload.role,
      payload.assigned_exam_id,
      payload.name,
      payload.roll_number,
      payload.dob,
      payload.email_id,
      payload.phone_number,
    ],
  );
}

router.get("/", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const roleFilter =
    permission.data.role === "admin"
      ? "WHERE role='student'"
      : "WHERE role IN ('admin', 'student')";
  const [rows] = await pool.query(
    `SELECT username, role, assigned_exam_id, name, roll_number, dob, email_id, phone_number FROM users ${roleFilter} ORDER BY role ASC, username ASC`,
  );

  return res.status(200).send({
    status: 200,
    success: true,
    data: rows,
  });
});

router.post("/", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const role = normalizeRole(req.body.role);
  if (role !== "student" && role !== "admin") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid role. Valid roles are `student` and `admin`.",
    });
  }

  if (!canManageRole(permission.data.role, role)) {
    return res.status(401).send({
      status: 401,
      success: false,
      message:
        "Unauthorised user creation request. The user can only be student.",
    });
  }

  if (role === "admin") {
    const username = normalizeString(req.body.username);
    const password = normalizeString(req.body.password);
    const assigned_exam_id = normalizeExamId(req.body.assigned_exam_id);

    if (username == null || password == null) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid username or password.",
      });
    }

    if (username.includes(" ")) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Spaces are not allowed in username.",
      });
    }

    if (assigned_exam_id !== null && !Number.isNaN(assigned_exam_id)) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "`assigned_exam_id` is only required for `student` role.",
      });
    }

    try {
      const [existing] = await pool.query(
        "SELECT 1 FROM users WHERE username = ? LIMIT 1;",
        [username],
      );
      if (existing.length > 0) {
        return res.status(409).send({
          status: 409,
          success: false,
          message: "Username already exists.",
        });
      }

      await insertUser(pool, {
        username,
        password,
        role,
        assigned_exam_id: null,
        name: null,
        roll_number: null,
        dob: null,
        email_id: null,
        phone_number: null,
      });

      return res.status(201).send({
        status: 201,
        success: true,
      });
    } catch (err) {
      return res.status(500).send({
        status: 500,
        success: false,
        message: err.message,
      });
    }
  }

  const name = normalizeString(req.body.name);
  const roll_number = normalizeString(req.body.roll_number);
  const dob = normalizeDob(req.body.dob);
  const email_id = normalizeString(req.body.email_id);
  const phone_number = normalizeString(req.body.phone_number);
  const assigned_exam_id = normalizeExamId(req.body.assigned_exam_id);
  const username = normalizeString(req.body.username) || email_id;
  const password = normalizeString(req.body.password) || email_id;

  if (
    name == null ||
    roll_number == null ||
    dob == null ||
    email_id == null ||
    phone_number == null ||
    username == null ||
    password == null
  ) {
    return res.status(400).send({
      status: 400,
      success: false,
      message:
        "For student users, `name`, `roll_number`, `dob`, `email_id`, and `phone_number` are required.",
    });
  }

  if (username.includes(" ")) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Spaces are not allowed in username.",
    });
  }

  if (assigned_exam_id !== null && Number.isNaN(assigned_exam_id)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message:
        "`assigned_exam_id` must be a positive number or null for `student` role.",
    });
  }

  try {
    const [existing] = await pool.query(
      "SELECT 1 FROM users WHERE username = ? LIMIT 1;",
      [username],
    );
    if (existing.length > 0) {
      return res.status(409).send({
        status: 409,
        success: false,
        message: "Username already exists.",
      });
    }

    await insertUser(pool, {
      username,
      password,
      role,
      assigned_exam_id,
      name,
      roll_number,
      dob,
      email_id,
      phone_number,
    });

    return res.status(201).send({
      status: 201,
      success: true,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).send({
        status: 409,
        success: false,
        message: "Duplicate email id or roll number found.",
      });
    }

    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message,
    });
  }
});

router.put("/:username", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const username = normalizeString(req.params.username);
  if (username == null) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid username.",
    });
  }

  const [users] = await pool.query(
    "SELECT username, role FROM users WHERE username=? LIMIT 1;",
    [username],
  );
  if (users.length !== 1) {
    return res.status(404).send({
      status: 404,
      success: false,
      message: "User not found.",
    });
  }

  const target = users[0];
  if (!canManageRole(permission.data.role, target.role)) {
    return res.status(403).send({
      status: 403,
      success: false,
      message: "Forbidden: User does not have the required role.",
    });
  }

  const updates = [];
  const params = [];

  if (target.role === "student") {
    const studentFields = [
      ["name", normalizeString(req.body.name)],
      ["roll_number", normalizeString(req.body.roll_number)],
      ["dob", req.body.dob == null ? null : normalizeDob(req.body.dob)],
      ["email_id", normalizeString(req.body.email_id)],
      ["phone_number", normalizeString(req.body.phone_number)],
    ];

    for (const [field, value] of studentFields) {
      if (Object.hasOwn(req.body, field)) {
        if (value == null) {
          return res.status(400).send({
            status: 400,
            success: false,
            message: `Invalid value for ${field}.`,
          });
        }
        updates.push(`${field}=?`);
        params.push(value);
      }
    }

    if (Object.hasOwn(req.body, "assigned_exam_id")) {
      const assigned_exam_id = normalizeExamId(req.body.assigned_exam_id);
      if (assigned_exam_id !== null && Number.isNaN(assigned_exam_id)) {
        return res.status(400).send({
          status: 400,
          success: false,
          message:
            "`assigned_exam_id` must be a positive number or null for `student` role.",
        });
      }
      updates.push("assigned_exam_id=?");
      params.push(assigned_exam_id);
    }
  }

  if (Object.hasOwn(req.body, "password")) {
    const password = normalizeString(req.body.password);
    if (password == null) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid password.",
      });
    }
    const passwordHash = await bcrypt.hash(password, config.salt_rounds);
    updates.push("password_hash=?");
    params.push(passwordHash);
  }

  if (updates.length === 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "No valid fields provided for update.",
    });
  }

  params.push(username);
  try {
    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE username=?`, params);
    return res.status(200).send({
      status: 200,
      success: true,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).send({
        status: 409,
        success: false,
        message: "Duplicate email id or roll number found.",
      });
    }
    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message,
    });
  }
});

router.get("/export/students", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const [rows] = await pool.query(
    "SELECT username, name, roll_number, dob, email_id, phone_number, assigned_exam_id FROM users WHERE role='student' ORDER BY username ASC;",
  );
  const csv = toCsv(
    [
      { key: "username", label: "Username" },
      { key: "name", label: "Name" },
      { key: "roll_number", label: "Roll Number" },
      { key: "dob", label: "DOB" },
      { key: "email_id", label: "Email ID" },
      { key: "phone_number", label: "Phone Number" },
      { key: "assigned_exam_id", label: "Assigned Exam ID" },
    ],
    rows,
  );

  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="students-list.xls"',
  );
  return res.status(200).send(csv);
});

router.post("/import/students", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  if (!req.files || !req.files.users_sheet) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing `users_sheet` file in form data.",
    });
  }

  const csvRaw = req.files.users_sheet.data.toString("utf-8");
  const rows = parseCsv(csvRaw);
  if (rows.length < 2) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "The import sheet must contain at least one data row.",
    });
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const values = rows.slice(1);
  const toRecord = (line) => {
    const rec = {};
    for (let i = 0; i < header.length; i++) {
      rec[header[i]] = line[i] ?? "";
    }
    return rec;
  };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const line of values) {
      const rec = toRecord(line);
      const role = normalizeRole(rec.role || "student");
      if ((role !== "student" && role !== "admin") || !canManageRole(permission.data.role, role)) {
        throw new Error("Invalid role found in sheet.");
      }

      if (role === "admin") {
        const username = normalizeString(rec.username);
        const password = normalizeString(rec.password) || username;
        if (username == null || password == null || username.includes(" ")) {
          throw new Error("Invalid admin row in sheet.");
        }
        await insertUser(conn, {
          username,
          password,
          role: "admin",
          assigned_exam_id: null,
          name: null,
          roll_number: null,
          dob: null,
          email_id: null,
          phone_number: null,
        });
        continue;
      }

      const email_id = normalizeString(rec["email id"] || rec.email_id);
      const username = normalizeString(rec.username) || email_id;
      const password = normalizeString(rec.password) || email_id;
      const name = normalizeString(rec.name);
      const roll_number = normalizeString(rec["roll number"] || rec.roll_number);
      const dob = normalizeDob(rec.dob);
      const phone_number = normalizeString(
        rec["phone number"] || rec.phone_number,
      );
      const assigned_exam_id = normalizeExamId(
        rec["assigned exam id"] || rec.assigned_exam_id,
      );

      if (
        name == null ||
        roll_number == null ||
        dob == null ||
        email_id == null ||
        phone_number == null ||
        username == null ||
        password == null ||
        username.includes(" ") ||
        (assigned_exam_id !== null && Number.isNaN(assigned_exam_id))
      ) {
        throw new Error("Invalid student row in sheet.");
      }

      await insertUser(conn, {
        username,
        password,
        role: "student",
        assigned_exam_id,
        name,
        roll_number,
        dob,
        email_id,
        phone_number,
      });
    }

    await conn.commit();
    return res.status(201).send({
      status: 201,
      success: true,
    });
  } catch (err) {
    await conn.rollback();
    return res.status(400).send({
      status: 400,
      success: false,
      message: err.code === "ER_DUP_ENTRY" ? "Duplicate user data found in sheet." : err.message,
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
module.exports.parseCsv = parseCsv;
module.exports.normalizeDob = normalizeDob;
