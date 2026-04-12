const pool = require("./services/db");
const jwt = require("jsonwebtoken");

async function hasPermissions(authorization_header, allowed_role) {
  if (
    typeof authorization_header !== "string" ||
    typeof allowed_role !== "string"
  ) {
    return {
      status: 400,
      success: false,
      message:
        "Internal Server Error: Invalid datatype of either header or role.",
    };
  }

  if (!authorization_header.startsWith("Bearer ")) {
    return {
      status: 401,
      success: false,
      message:
        "Invalid Authorization Header. Expected format: 'Bearer <token>'.",
    };
  }

  const token = authorization_header.slice(7);
  const verification = await verifyAccessToken(token);

  if (!verification || verification.success !== true) {
    return (
      verification || {
        status: 401,
        success: false,
        message: "Invalid Access Token.",
      }
    );
  }

  const { role } = verification.data;
  if (role !== allowed_role) {
    return {
      status: 403,
      success: false,
      message: "Forbidden: User does not have the required role.",
    };
  }

  return {
    status: 200,
    success: true,
    data: verification.data,
  };
}

async function verifyAccessToken(token) {
  if (typeof token !== "string") {
    return {
      status: 400,
      success: false,
      message: "The Access Token is required in the body.",
    };
  }

  try {
    const decoded = jwt.verify(token, globalThis.process.env.JWT_SECRET, {
      complete: true,
    });
    const payload = decoded.payload;

    if (
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      return {
        status: 401,
        success: false,
        message: "Invalid Access Token Payload.",
      };
    }

    const [result, _] = await pool.query(
      "SELECT role, assigned_exam_id from users WHERE username=?",
      [payload.username],
    );

    if (result.length > 1) {
      return {
        status: 500,
        success: false,
        message:
          "Internal Server Error. Found multiple entries of same username.",
      };
    }

    const user = result[0];
    if (
      (user.role === payload.role,
      user.assigned_exam_id === payload.assigned_exam_id)
    ) {
      return {
        status: 201,
        success: true,
        data: {
          username: payload.username,
          role: payload.role,
          assigned_exam_id: payload.assigned_exam_id,
        },
      };
    }

    return {
      status: 401,
      success: false,
      message: "Invalid Access Token.",
    };
  } catch (error) {
    return {
      status: 401,
      success: false,
      message: `Invalid Access Token. ${error.message}`,
    };
  }
}

module.exports = { hasPermissions, verifyAccessToken };
