const pool = require("./services/db");
const jwt = require("jsonwebtoken");

async function verifyAccessToken(token) {
  if (typeof token != "string") {
    return {
      status: 400,
      success: false,
      message: "The Access Token is required in the body.",
    };
  }

  try {
    var decoded = jwt.verify(token, process.env.JWT_SECRET, { complete: true });
    var payload = decoded.payload;

    if (
      typeof payload.username != "string" ||
      typeof payload.role != "string"
    ) {
      return {
        status: 401,
        success: false,
        message: "Invalid Access Token Payload.",
      };
    }

    var [result, _] = await pool.query(
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

    var user = result[0];
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

module.exports = { verifyAccessToken };
