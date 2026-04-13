const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username !== "admin") {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Validate password against hashed ENV value
        const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
        
        if (!isMatch) {
            console.warn(`[Auth] ❌ Failed login attempt from IP: ${req.ip}`);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Create JWT Token
        const token = jwt.sign(
            { username: "admin", role: "administrator" }, 
            process.env.JWT_SECRET, 
            { expiresIn: "24h" }
        );

        console.log(`[Auth] ✅ Successful login from IP: ${req.ip}`);
        return res.json({ success: true, token });

    } catch (error) {
        console.error("[Auth Error]", error);
        return res.status(500).json({ success: false, message: "Server error during login" });
    }
};

module.exports = { login };
