import express from "express";
import { usersDb } from "../db/users.js";
import { tokensDb } from "../db/tokens.js";
import { authenticate, optionalAuth, logActivity } from "../middleware/auth.js";
import bcrypt from "bcrypt";

const authRouter = express.Router();

// Register route
authRouter.post("/register", async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Username, email and password are required" });
        }

        // Check if user already exists
        const userExists = await usersDb.checkUserExists(username, email);
        if (userExists.exists) {
            return res.status(409).json({
                error: `A user with this ${userExists.field} already exists`
            });
        }

        // Create user (with default role of 'user' - role_id: 2)
        const user = await usersDb.create({ username, email, password });

        // Create token
        const token = await tokensDb.createToken(user.user_id, 24);

        // Set cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Log activity
        logActivity(
            user.user_id, 
            'register', 
            'user', 
            user.user_id, 
            'User registration', 
            req.ip
        );

        res.status(201).json({
            message: "User registered successfully",
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role_name
            },
            token
        });
    } catch (error) {
        next(error);
    }
});

// Login route
authRouter.post("/login", async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Validate credentials
        const user = await usersDb.validateCredentials(username, password);

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Create token
        const token = await tokensDb.createToken(user.user_id, 24);

        // Set cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Log activity
        logActivity(
            user.user_id, 
            'login', 
            'user', 
            user.user_id, 
            'User login', 
            req.ip
        );

        res.json({
            message: "Login successful",
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role_name
            },
            token
        });
    } catch (error) {
        next(error);
    }
});

// Logout route
authRouter.post("/logout", optionalAuth, async (req, res, next) => {
    try {
        const token = req.cookies?.authToken ||
                      req.headers.authorization?.replace('Bearer ', '');

        if (token && req.userId) {
            await tokensDb.invalidateToken(token);
            
            // Log activity
            logActivity(
                req.userId, 
                'logout', 
                'user', 
                req.userId, 
                'User logout', 
                req.ip
            );
        }

        // Clear the cookie
        res.clearCookie('authToken');

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
});

// Get current user
authRouter.get("/me", authenticate, async (req, res, next) => {
    try {
        const user = await usersDb.getById(req.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get user permissions
        const permissions = await usersDb.getUserPermissions(req.userId);

        res.json({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            role_name: user.role_name,
            created_at: user.created_at,
            last_login: user.last_login,
            permissions
        });
    } catch (error) {
        next(error);
    }
});

// Change password
authRouter.post("/change-password", authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }

        // Validate current password
        const user = await usersDb.getByUsername(req.user.username);
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Update password
        await usersDb.updatePassword(req.userId, newPassword);

        // Invalidate all existing tokens for this user
        await tokensDb.invalidateAllUserTokens(req.userId);

        // Create new token
        const token = await tokensDb.createToken(req.userId, 24);

        // Set cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Log activity
        logActivity(
            req.userId, 
            'update', 
            'user', 
            req.userId, 
            'Changed password', 
            req.ip
        );

        res.json({
            message: "Password changed successfully",
            token
        });
    } catch (error) {
        next(error);
    }
});

// Update profile
authRouter.put("/profile", authenticate, async (req, res, next) => {
    try {
        const { username, email } = req.body;

        if (!username && !email) {
            return res.status(400).json({ error: "Either username or email must be provided" });
        }

        // Check if username or email is already taken by another user
        if (username && username !== req.user.username) {
            const existingUser = await usersDb.getByUsername(username);
            if (existingUser && existingUser.user_id !== req.userId) {
                return res.status(409).json({ error: "Username is already taken" });
            }
        }

        if (email && email !== req.user.email) {
            const existingUser = await usersDb.getByEmail(email);
            if (existingUser && existingUser.user_id !== req.userId) {
                return res.status(409).json({ error: "Email is already taken" });
            }
        }

        // Update profile
        await usersDb.updateProfile(req.userId, {
            username: username || req.user.username,
            email: email || req.user.email
        });

        // Get updated user
        const updatedUser = await usersDb.getById(req.userId);

        // Log activity
        logActivity(
            req.userId, 
            'update', 
            'user', 
            req.userId, 
            'Updated profile', 
            req.ip
        );

        res.json({
            message: "Profile updated successfully",
            user: {
                user_id: updatedUser.user_id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role_name
            }
        });
    } catch (error) {
        next(error);
    }
});

export default authRouter;
