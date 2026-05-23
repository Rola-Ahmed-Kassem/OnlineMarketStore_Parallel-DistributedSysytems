// authMiddleware.js
// function authenticateToken(req, res, next) {
  // PHASE 1 SIMULATION MODE: 
  // We mock a successfully decoded JWT token payload directly onto the request object.
  // Change "USR-999" to whatever user ID you are currently testing in your database tables.
  // req.user = {
  //   userId: "2",
  // };

  // If you want to test how the system reacts when a token is completely missing,
  // uncomment these lines:
  // if (!req.user.userId) {
  //   return res.status(401).json({ error: "Access token is missing (Simulated)" });
  // }

  /* 
  ===========================================================================
  PHASE 2 PRODUCTION CODE (Swap to this once Auth/Gateway services are live)
  ===========================================================================
  const jwt = require("jsonwebtoken");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token is missing" });

  try {
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedPayload;
  } catch (err) {
    return res.status(403).json({ error: "Token is invalid or expired" });
  }
  */

//   next(); // Pass control smoothly to the route handling function below
// }

// module.exports = authenticateToken;