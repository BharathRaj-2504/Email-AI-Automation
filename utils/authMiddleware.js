const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        // Retrieve the token from 'Authorization: Bearer <token>'
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn(`[Auth] ❌ Unauthorized access attempt without Bearer token from IP: ${req.ip}`);
            return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
        }

        const token = authHeader.split(" ")[1];

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the decoded user payload to request for downstream usage
        req.user = decoded;

        next();
    } catch (error) {
        console.error(`[Auth] ❌ Invalid token attempt from IP: ${req.ip}. Error:`, error.message);
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }
};

module.exports = authMiddleware;
