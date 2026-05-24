// authService.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../usersDb");

const JWT_SECRET = process.env.JWT_SECRET || "failed-jwt";
const JWT_EXPIRES_IN = "7d";

/**
 * Validates basic text and format restrictions 
 */
function validateRegistrationInputs(name, email, password) {
    if (!name || !email || !password) {
        throw new Error("Name, email and password are required");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new Error("Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number");
    }
}

/**
 * Internal helper to issue a secure JWT payload
 */
function generateToken(userId, email, name, userType = 'USER') {
    return jwt.sign(
        { userId, email, name, userType, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Handles the database registration sequence
 */
async function registerUser({ name, email, password, phone }) {
    validateRegistrationInputs(name, email, password);

    // Verify system constraints safely
    const [existingUsers] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
        const err = new Error("User with this email already exists");
        err.statusCode = 409;
        throw err;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [result] = await db.query(
        `INSERT INTO users (name, email, password_hash, phone, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [name, email, passwordHash, phone || null]
    );

    const token = generateToken(result.insertId, email, name);

    return { userId: result.insertId, name, email, token };
}

/**
 * Validates credentials and handles the login mapping
 */
async function loginUser(email, password) {
    if (!email || !password) {
        const err = new Error("Email and password are required");
        err.statusCode = 400;
        throw err;
    }

    const [users] = await db.query("SELECT id, name, email, password_hash FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
    }

    const token = generateToken(user.id, user.email, user.name);

    return { userId: user.id, name: user.name, email: user.email, token };
}

module.exports = {
    registerUser,
    loginUser,
    JWT_SECRET
};