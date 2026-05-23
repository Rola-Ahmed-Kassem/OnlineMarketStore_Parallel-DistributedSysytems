// ============================================================
//  USER ROUTES  — belongs to: Users Service
//  Handles: register, login, logout, profile, password, delete
//  No SQL here — logic is in authService.js and userService.js
// ============================================================

const express    = require("express");
const router     = express.Router();
const rateLimit  = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const { authenticateToken } = require("./authMiddleware");
const authService = require("./authService");
const userService = require("./userService");

// ── Helpers ───────────────────────────────────────────────────────────────────

const HTTP_STATUS_TEXT = {
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
  404: "Not Found",   409: "Conflict",     422: "Unprocessable Entity",
  500: "Internal Server Error",
};

function stdError(res, status, message, path) {
  return res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: HTTP_STATUS_TEXT[status] || "Error",
    message,
    path,
  });
}

function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return stdError(res, 422, errors.array().map(e => e.msg).join(" "), req.path);
      }
      next();
    },
  ];
}

// ── Rate limiters ─────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many accounts created from this IP. Please try again later." },
});

// ── Validation rules ──────────────────────────────────────────────────────────

const registerRules = validate([
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain a number."),
  body("phone").optional().isMobilePhone().withMessage("Invalid phone number."),
]);

const loginRules = validate([
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
]);

const updateProfileRules = validate([
  body("name")
    .optional().trim().notEmpty().withMessage("Name must not be blank if provided.")
    .isLength({ max: 100 }).withMessage("Name must be 100 characters or fewer."),
  body("phone")
    .optional({ nullable: true }).isMobilePhone().withMessage("Invalid phone number."),
]);

const changePasswordRules = validate([
  body("currentPassword").notEmpty().withMessage("Current password is required."),
  body("newPassword")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("New password must contain an uppercase letter.")
    .matches(/[0-9]/).withMessage("New password must contain a number."),
]);

// ── POST /api/v1/auth/register ────────────────────────────────────────────────

router.post("/auth/register", registerLimiter, registerRules, async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    return res.status(201).json({
      message: "Account created successfully",
      userId:  `USR-${result.userId}`,
    });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────

router.post("/auth/login", loginLimiter, loginRules, async (req, res) => {
  try {
    const result = await authService.loginUser(req.body.email, req.body.password);
    return res.status(200).json({
      message:     "Login successful",
      accessToken: result.token,
      user: {
        id:    `USR-${result.userId}`,
        name:  result.name,
        email: result.email,
      },
    });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────

router.post("/auth/logout", authenticateToken, (_req, res) => {
  return res.status(200).json({ message: "Logged out successfully." });
});

// ── GET /api/v1/users/me ──────────────────────────────────────────────────────

router.get("/users/me", authenticateToken, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.userId);
    return res.status(200).json({
      id:         `USR-${user.id}`,
      name:       user.name,
      email:      user.email,
      phone:      user.phone,
      created_at: user.created_at,
    });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── PUT /api/v1/users/me ──────────────────────────────────────────────────────

router.put("/users/me", authenticateToken, updateProfileRules, async (req, res) => {
  const { name, phone } = req.body;
  if (!name && phone === undefined) {
    return stdError(res, 400, "Nothing to update.", req.path);
  }
  try {
    await userService.updateProfile(req.user.userId, { name, phone });
    return res.status(200).json({ message: "Profile updated successfully." });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── PUT /api/v1/users/me/password ────────────────────────────────────────────

router.put("/users/me/password", authenticateToken, changePasswordRules, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    await userService.changePassword(req.user.userId, currentPassword, newPassword);
    return res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── DELETE /api/v1/users/me ───────────────────────────────────────────────────

router.delete("/users/me", authenticateToken, async (req, res) => {
  try {
    await userService.deleteAccount(req.user.userId);
    return res.status(200).json({ message: "Account deleted successfully." });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── GET /api/v1/users/:id ─────────────────────────────────────────────────────

router.get("/users/:id", authenticateToken, async (req, res) => {
  const requestedId = parseInt(req.params.id, 10);
  if (req.user.userId !== requestedId) {
    return stdError(res, 403, "Access denied.", req.path);
  }
  try {
    const user = await userService.getUserById(requestedId);
    return res.status(200).json({
      id:         `USR-${user.id}`,
      name:       user.name,
      email:      user.email,
      phone:      user.phone,
      created_at: user.created_at,
    });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

module.exports = router;
