const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../../services/db");
const config = require("../../config");
const { hasPermissions } = require("../../utils");
const { default: OfficeParser } = require("officeparser");

const router = express.Router();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const rateLimitStore = new Map();

router.use((req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).send({
      status: 429,
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  current.count += 1;
  return next();
});

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
    return {
      valid: true,
      value: null,
    };
  }
  const num = Number(value);
  return {
    valid: Number.isInteger(num) && num > 0,
    value: Number.isInteger(num) && num > 0 ? num : null,
  };
}

function normalizeDob(value) {
  const dob = normalizeString(value);
  if (dob == null) {
    return null;
  }

  // Attempt to parse Excel serial dates (e.g., "38972.0")
  if (/^\d+(\.\d+)?$/.test(dob)) {
    const excelDate = parseFloat(dob);
    // Excel base date is December 30, 1899
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  // Attempt to parse as DD-MM-YYYY (or DD/MM/YYYY, DD MM YYYY)
  // This order takes precedence to explicitly handle DD-MM-YYYY formats,
  // preventing potential ambiguity with general Date parsing which can be locale-dependent.
  const dd_mm_yyyy_match = dob.match(/^(\d{1,2})[/\- ](\d{1,2})[/\- ](\d{4})$/);
  if (dd_mm_yyyy_match) {
    const day = parseInt(dd_mm_yyyy_match[1], 10);
    const month = parseInt(dd_mm_yyyy_match[2], 10); // 1-indexed month
    const year = parseInt(dd_mm_yyyy_match[3], 10);

    if (day < 1 || day > 31 || month < 1 || month > 12) {
      return null;
    }

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date.toISOString().slice(0, 10);
    } else {
      return null;
    }
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

function parseUserCell(kind, value) {
  switch (kind) {
    case "username":
    case "name":
    case "email_id":
    case "phone_number":
      return normalizeString(value);
    case "roll_number":
    case "assigned_exam_id": {
      const integer = Number(value);
      if (Number.isNaN(integer) || !Number.isInteger(integer) || integer < 0) {
        throw new Error("Invalid " + kind);
      }

      return integer;
    }
    case "dob":
      return normalizeDob(value);
    default:
      throw new Error("Invalid Cell kind.");
  }
}

async function parseUsersList(content) {
  const ast = await OfficeParser.parseOffice(content);

  if (ast.type !== "xlsx") {
    throw new Error("The bulk users list must be in a `.xlsx` file only.");
  }

  if (ast.content.length !== 1) {
    throw new Error("There must be only one sheet in the Excel file.");
  }

  const sheet = ast.content[0];

  if (sheet.children.length < 2) {
    throw new Error("No data found. There must be at least one row.");
  }

  const users = [];
  const headerMap = {};

  for (const headerCell of sheet.children[0].children) {
    const header = headerCell.text.toLowerCase().replaceAll(" ", "_");

    if (
      [
        "username",
        "name",
        "roll_number",
        "email_id",
        "phone_number",
        "dob",
        "assigned_exam_id",
      ].includes(header)
    ) {
      headerMap[headerCell.metadata.col] = header;
    }
  }

  for (const row of sheet.children.slice(1)) {
    const entry = {};

    for (const cell of row.children) {
      if (headerMap[cell.metadata.col]) {
        entry[headerMap[cell.metadata.col]] = parseUserCell(
          headerMap[cell.metadata.col],
          cell.text,
        );
      }
    }

    if (Object.keys(entry).length > 0) {
      users.push(entry);
    }
  }

  return users;
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
    const assignedExam = normalizeExamId(req.body.assigned_exam_id);

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

    if (!assignedExam.valid || assignedExam.value !== null) {
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
        assigned_exam_id: assignedExam.value,
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
  const assignedExam = normalizeExamId(req.body.assigned_exam_id);
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

  if (!assignedExam.valid) {
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
      assigned_exam_id: assignedExam.value,
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
      ["dob", normalizeDob(req.body.dob)],
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
      const assignedExam = normalizeExamId(req.body.assigned_exam_id);
      if (!assignedExam.valid) {
        return res.status(400).send({
          status: 400,
          success: false,
          message:
            "`assigned_exam_id` must be a positive number or null for `student` role.",
        });
      }
      updates.push("assigned_exam_id=?");
      params.push(assignedExam.value);
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
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE username=?`,
      params,
    );
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

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="students-list.csv"',
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

  let users = [];
  try {
    users = await parseUsersList(req.files.users_sheet.data);
  } catch (err) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Failed to parse Excel File: " + err.message,
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const user of users) {
      const roll_number = user.roll_number;
      if (typeof roll_number !== "number") {
        throw new Error("Invalid Roll Number");
      }

      const name = user.name;
      if (!name) {
        throw new Error("Invalid Student name");
      }

      const email_id = user.email_id;
      if (email_id === "") {
        throw new Error("Invalid Student Email ID");
      }

      const phone_number = user.phone_number;
      if (
        phone_number === "" ||
        phone_number.length < 10 ||
        phone_number.length > 20
      ) {
        throw new Error("Invalid Phone Number");
      }

      const dob = user.dob;
      if (!dob) {
        throw new Error("Invalid Student DOB.");
      }

      const assigned_exam_id = user.assigned_exam_id;
      if (typeof assigned_exam_id !== "number") {
        throw new Error("Invalid Assigned Exam ID");
      }

      const username = user.username || roll_number;
      const password = user.password || dob;

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
    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message,
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
// module.exports.parseCsv = parseCsv;
module.exports.normalizeDob = normalizeDob;
