const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "bus-easy-dev-secret";

const authenticate = (req, res, next) => {
  try {
    const token = req.header("auth-token");

    if (!token) {
      return res.status(401).send({ msg: "Authentication required" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch (error) {
    return res.status(401).send({ msg: "Invalid token" });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).send({ msg: "You do not have access to this resource" });
  }

  next();
};

module.exports = { authenticate, authorize, JWT_SECRET };
