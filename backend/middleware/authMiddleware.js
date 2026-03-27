import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  let token;

  // Check if the authorization header exists and starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add user id to request
      req.user = decoded;

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // If no token is provided
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const superAdminMiddleware = (req, res, next) => {
  // authMiddleware already ran, so req.user exists if the token was valid.
  // We check if the decoded token contains a role that equals 'SuperAdmin'
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    next(); // They are a SuperAdmin, let them proceed to the controller
  } else {
    // 403 Forbidden means "I know who you are, but you aren't allowed here"
    res.status(403).json({ 
      message: 'Access denied. SuperAdmin privileges required.' 
    });
  }
};

export const adminMiddleware = (req, res, next) => {
  // authMiddleware already ran, so req.user exists if the token was valid.
  // We check if the decoded token contains a role that equals 'ADMIN'
  
  if (req.user && req.user.role === 'ADMIN') { // Change 'ADMIN' if your schema uses 'Admin' or something else
    next(); 
  } else {
    res.status(403).json({ 
      message: 'Access denied. Admin privileges required.' 
    });
  }
};

