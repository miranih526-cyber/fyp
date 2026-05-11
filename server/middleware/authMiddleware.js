const jwt = require("jsonwebtoken");

/**
 * Verifies JWT from Authorization: Bearer <token>
 * Attaches decoded payload to req.user
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

/**
 * Requires req.user.role to be one of the allowed roles (after verifyToken)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
