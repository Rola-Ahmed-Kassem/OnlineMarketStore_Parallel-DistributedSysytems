// // authMiddleware.js

// const path = require("path");
// require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
// const jwt = require("jsonwebtoken");
// const { JWT_SECRET } = require("./authService");

// /**
//  * Route Guard Middleware to authorize requests
//  */
// function authenticateToken(req, res, next) {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

//     if (!token) {
//         return res.status(401).json({
//             timestamp: new Date().toISOString(),
//             status: 401,
//             error: "Unauthorized",
//             message: "Access token required. Please provide Bearer token in Authorization header",
//             path: req.path
//         });
//     }

//     jwt.verify(token, JWT_SECRET, (err, decoded) => {
//         if (err) {
//             const isExpired = err.name === 'TokenExpiredError';
//             return res.status(isExpired ? 401 : 403).json({
//                 timestamp: new Date().toISOString(),
//                 status: isExpired ? 401 : 403,
//                 error: isExpired ? "Unauthorized" : "Forbidden",
//                 message: isExpired ? "Token has expired. Please login again" : "Invalid token. Please login again",
//                 path: req.path
//             });
//         }
        
//         req.user = {
//             userId: decoded.userId,
//             email: decoded.email,
//             name: decoded.name,
//             userType: decoded.userType
//         };
        
//         next();
//     });
// }

// /**
//  * Access management guard
//  */
// function requireRole(roles) {
//     return (req, res, next) => {
//         if (!req.user || !roles.includes(req.user.userType)) {
//             return res.status(403).json({ message: "Insufficient permissions" });
//         }
//         next();
//     };
// }

// module.exports = {
//     authenticateToken,
//     requireRole
// };
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./authService");

/**
 * Route Guard Middleware to authorize requests
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            timestamp: new Date().toISOString(),
            status: 401,
            error: "Unauthorized",
            message: "Access token required. Please provide Bearer token in Authorization header",
            path: req.path
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            const isExpired = err.name === 'TokenExpiredError';
            return res.status(isExpired ? 401 : 403).json({
                timestamp: new Date().toISOString(),
                status: isExpired ? 401 : 403,
                error: isExpired ? "Unauthorized" : "Forbidden",
                message: isExpired ? "Token has expired. Please login again" : "Invalid token. Please login again",
                path: req.path
            });
        }

        req.user = {
            userId: decoded.userId,
            email:  decoded.email,
            name:   decoded.name,
            userType: decoded.userType
        };

        next();
    });
}

/**
 * Access management guard
 */
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.userType)) {
            return res.status(403).json({ message: "Insufficient permissions" });
        }
        next();
    };
}

module.exports = { authenticateToken, requireRole };