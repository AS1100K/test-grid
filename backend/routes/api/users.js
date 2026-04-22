const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../../services/db");
const config = require("../../config");
const { hasPermissions } = require("../../utils");

const router = express.Router();

const USER_HEADERS = [
  { key: "username", label: "username" },
  { key: "role", label: "role" },
  { key: "name", label: "name" },
  { key: "roll_number", label: "roll_number" },
  { key: "dob", label: "dob" },
  { key: "email_id", label: "email_id" },
  { key: "phone_number", label: "phone_number" },
  { key: "assigned_exam_id", label: "assigned_exam_id" },
];

function sanitizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

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

function parseCsvLines(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];

    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && csvText[i + 1] === "\n") {
        i += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeRole(permissionRole, role) {
  if (role == null || role === "") {
    return "student";
  }

  if (typeof role !== "string") {
    return null;
  }

  const normalized = role.trim();

  if (normalized !== "student" && normalized !== "admin") {
    return null;
  }

  if (permissionRole === "admin" && normalized !== "student") {
    return null;
  }

  return normalized;
}

function parseAssignedExamId(rawAssignedExamId, role) {
  if (role !== "student") {
    return null;
  }

  if (rawAssignedExamId == null || rawAssignedExamId === "") {
    return null;
  }

  const parsed = Number(rawAssignedExamId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
}

function normalizeStudentFields(rawFields) {
  const fields = {
    name: sanitizeText(rawFields.name),
    roll_number: sanitizeText(rawFields.roll_number),
    dob: sanitizeText(rawFields.dob),
    email_id: sanitizeText(rawFields.email_id),
    phone_number: sanitizeText(rawFields.phone_number),
  };

  return fields;
}

function validateStudentFields(fields, role) {
  if (role !== "student") {
    return null;
  }

  if (!fields.name) {
    return "Student name is required.";
  }

  if (!fields.roll_number) {
    return "Student roll number is required.";
  }

  if (!fields.dob) {
    return "Student DOB is required.";
  }

  if (!fields.email_id || !fields.email_id.includes("@")) {
    return "Valid student email_id is required.";
  }

  if (!fields.phone_number) {
    return "Student phone number is required.";
  }

  return null;
}

async function parseAndValidateUser(reqBody, permissionRole, opts = {}) {
  const username = sanitizeText(reqBody.username);
  const role = normalizeRole(permissionRole, reqBody.role);
  const studentFields = normalizeStudentFields(reqBody);

  if (!username || username.includes(" ")) {
    return {
      ok: false,
      status: 400,
      message: "Valid username is required and cannot contain spaces.",
    };
  }

  if (!role) {
    return {
      ok: false,
      status: 400,
      message: "Invalid role. Valid roles are `student` and `admin`.",
    };
  }

  const studentValidationMessage = validateStudentFields(studentFields, role);
  if (studentValidationMessage) {
    return {
      ok: false,
      status: 400,
      message: studentValidationMessage,
    };
  }

  const assignedExamId = parseAssignedExamId(reqBody.assigned_exam_id, role);
  if (Number.isNaN(assignedExamId)) {
    return {
      ok: false,
      status: 400,
      message: "`assigned_exam_id` must be a positive integer when provided.",
    };
  }

  if (role !== "student") {
    studentFields.name = null;
    studentFields.roll_number = null;
    studentFields.dob = null;
    studentFields.email_id = null;
    studentFields.phone_number = null;
  }

  let password = sanitizeText(reqBody.password);
  if (!password && role === "student") {
    password = studentFields.email_id;
  }

  if (opts.requirePassword && !password) {
    return {
      ok: false,
      status: 400,
      message: "Password is required.",
    };
  }

  let existingUserName = null;
  let existingRole = null;

  if (opts.currentUsername) {
    const [existingRows] = await pool.query(
      "SELECT username, role FROM users WHERE username=? LIMIT 1;",
      [opts.currentUsername],
    );

    if (existingRows.length !== 1) {
      return {
        ok: false,
        status: 404,
        message: "User not found.",
      };
    }

    existingUserName = existingRows[0].username;
    existingRole = existingRows[0].role;

    if (
      permissionRole === "admin" &&
      (existingRole !== "student" || role !== "student")
    ) {
      return {
        ok: false,
        status: 403,
        message: "Forbidden: admin can only update students.",
      };
    }

    if (username !== existingUserName) {
      const [usernameTakenRows] = await pool.query(
        "SELECT 1 FROM users WHERE username=? LIMIT 1;",
        [username],
      );
      if (usernameTakenRows.length > 0) {
        return {
          ok: false,
          status: 409,
          message: "Username already exists.",
        };
      }
    }
  }

  return {
    ok: true,
    data: {
      username,
      password,
      role,
      assigned_exam_id: assignedExamId,
      ...studentFields,
      existingUserName,
    },
  };
}

router.get("/", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const allowedRoles =
    permission.data.role === "super_admin" ? ["admin", "student"] : ["student"];

  const [rows] = await pool.query(
    "SELECT username, role, assigned_exam_id, name, roll_number, dob, email_id, phone_number FROM users WHERE role IN (?) ORDER BY role ASC, username ASC;",
    [allowedRoles],
  );

  return res.status(200).send({
    status: 200,
    success: true,
    data: rows,
  });
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
    "SELECT username, role, name, roll_number, dob, email_id, phone_number, assigned_exam_id FROM users WHERE role='student' ORDER BY username ASC;",
  );

  const csv = toCsv(USER_HEADERS, rows);
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="students.xls"');
  return res.status(200).send(csv);
});

router.post("/", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  try {
    const parsed = await parseAndValidateUser(req.body, permission.data.role, {
      requirePassword: false,
    });

    if (!parsed.ok) {
      return res.status(parsed.status).send({
        status: parsed.status,
        success: false,
        message: parsed.message,
      });
    }

    const [existing] = await pool.query(
      "SELECT 1 FROM users WHERE username = ? LIMIT 1;",
      [parsed.data.username],
    );
    if (existing.length > 0) {
      return res.status(409).send({
        status: 409,
        success: false,
        message: "Username already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, config.salt_rounds);

    await pool.query(
      "INSERT INTO users (username, password_hash, role, assigned_exam_id, name, roll_number, dob, email_id, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
      [
        parsed.data.username,
        passwordHash,
        parsed.data.role,
        parsed.data.assigned_exam_id,
        parsed.data.name,
        parsed.data.roll_number,
        parsed.data.dob,
        parsed.data.email_id,
        parsed.data.phone_number,
      ],
    );

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
});

router.put("/:username", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  try {
    const parsed = await parseAndValidateUser(req.body, permission.data.role, {
      requirePassword: false,
      currentUsername: req.params.username,
    });

    if (!parsed.ok) {
      return res.status(parsed.status).send({
        status: parsed.status,
        success: false,
        message: parsed.message,
      });
    }

    let passwordHash = null;
    if (parsed.data.password) {
      passwordHash = await bcrypt.hash(parsed.data.password, config.salt_rounds);
    }

    if (passwordHash) {
      await pool.query(
        "UPDATE users SET username=?, password_hash=?, role=?, assigned_exam_id=?, name=?, roll_number=?, dob=?, email_id=?, phone_number=? WHERE username=?;",
        [
          parsed.data.username,
          passwordHash,
          parsed.data.role,
          parsed.data.assigned_exam_id,
          parsed.data.name,
          parsed.data.roll_number,
          parsed.data.dob,
          parsed.data.email_id,
          parsed.data.phone_number,
          parsed.data.existingUserName,
        ],
      );
    } else {
      await pool.query(
        "UPDATE users SET username=?, role=?, assigned_exam_id=?, name=?, roll_number=?, dob=?, email_id=?, phone_number=? WHERE username=?;",
        [
          parsed.data.username,
          parsed.data.role,
          parsed.data.assigned_exam_id,
          parsed.data.name,
          parsed.data.roll_number,
          parsed.data.dob,
          parsed.data.email_id,
          parsed.data.phone_number,
          parsed.data.existingUserName,
        ],
      );
    }

    return res.status(200).send({
      status: 200,
      success: true,
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message,
    });
  }
});

router.post("/import", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  if (!(req.files && req.files.users_file)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing `users_file` in form-data.",
    });
  }

  const csvText = req.files.users_file.data.toString("utf8");
  const rows = parseCsvLines(csvText);

  if (rows.length < 2) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Upload must include a header row and at least one data row.",
    });
  }

  const header = rows[0].map((cell) => cell.trim());
  const indexedRows = rows.slice(1).map((cells, rowIndex) => {
    const rowObj = {};
    for (let i = 0; i < header.length; i += 1) {
      rowObj[header[i]] = cells[i] ?? "";
    }
    return { rowObj, rowNumber: rowIndex + 2 };
  });

  let created = 0;
  const errors = [];

  for (const row of indexedRows) {
    const parsed = await parseAndValidateUser(row.rowObj, permission.data.role, {
      requirePassword: false,
    });

    if (!parsed.ok) {
      errors.push(`Row ${row.rowNumber}: ${parsed.message}`);
      continue;
    }

    const [existing] = await pool.query(
      "SELECT 1 FROM users WHERE username=? LIMIT 1;",
      [parsed.data.username],
    );

    if (existing.length > 0) {
      errors.push(`Row ${row.rowNumber}: Username already exists.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, config.salt_rounds);

    await pool.query(
      "INSERT INTO users (username, password_hash, role, assigned_exam_id, name, roll_number, dob, email_id, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
      [
        parsed.data.username,
        passwordHash,
        parsed.data.role,
        parsed.data.assigned_exam_id,
        parsed.data.name,
        parsed.data.roll_number,
        parsed.data.dob,
        parsed.data.email_id,
        parsed.data.phone_number,
      ],
    );

    created += 1;
  }

  return res.status(200).send({
    status: 200,
    success: errors.length === 0,
    message:
      errors.length === 0
        ? `Successfully imported ${created} users.`
        : `Imported ${created} users with ${errors.length} skipped rows.`,
    data: {
      created,
      errors,
    },
  });
});

module.exports = router;
