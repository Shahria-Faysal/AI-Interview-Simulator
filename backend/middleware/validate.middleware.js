/**
 * middleware/validate.middleware.js
 * Reusable express-validator chains for request body validation.
 * Each function returns an array of validator checks to be used as
 * route-level middleware, followed by the runValidation handler.
 */

const { body, validationResult } = require("express-validator");

/**
 * Checks the result of prior validation chains and returns 422 if any
 * validation errors were found.  Must be placed AFTER the check() chains.
 */
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Validation rule sets ─────────────────────────────────────────────────────

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required."),
];

const sessionValidation = [
  body("role")
    .notEmpty()
    .withMessage("Role is required.")
    .isIn([
      "FRONTEND_DEVELOPER",
      "BACKEND_DEVELOPER",
      "FULL_STACK_DEVELOPER",
      "DATA_ANALYST",
    ])
    .withMessage("Invalid role selected."),

  body("difficulty")
    .notEmpty()
    .withMessage("Difficulty is required.")
    .isIn(["EASY", "MEDIUM", "HARD"])
    .withMessage("Invalid difficulty selected."),
];

module.exports = {
  runValidation,
  registerValidation,
  loginValidation,
  sessionValidation,
};
