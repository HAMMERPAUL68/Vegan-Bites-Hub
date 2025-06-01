import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, requireAuth, requireAdmin, hashPassword, comparePasswords, sendPasswordResetEmail } from "./independentAuth";
import { nanoid } from "nanoid";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const resetRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);

  // Auth routes
  app.post('/api/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "registered",
      });

      // Create session
      req.session.user = {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileImageUrl: user.profileImageUrl || undefined,
        role: user.role,
      };

      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user || !await comparePasswords(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      req.session.user = {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileImageUrl: user.profileImageUrl || undefined,
        role: user.role,
      };

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', async (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(parseInt(req.session.user.id));
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = resetRequestSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      const resetToken = nanoid(32);
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.setResetToken(email, resetToken, expiry);
      const emailSent = await sendPasswordResetEmail(email, resetToken);

      if (!emailSent) {
        console.error("Failed to send reset email");
      }

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);

      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, { password: hashedPassword });
      await storage.clearResetToken(user.id);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(400).json({ message: "Password reset failed" });
    }
  });

  // Protected recipe routes (example - rest remain the same)
  app.get('/api/recipes', async (req, res) => {
    try {
      const { search, cuisine, sortBy } = req.query;
      const recipes = await storage.getRecipes({
        search: search as string,
        cuisineId: cuisine ? parseInt(cuisine as string) : undefined,
        sortBy: sortBy as "newest" | "rating" | "popular",
        isApproved: true,
      });
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Admin routes
  app.get('/api/admin/recipes', requireAdmin, async (req, res) => {
    try {
      const recipes = await storage.getRecipes({ isApproved: false });
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching pending recipes:", error);
      res.status(500).json({ message: "Failed to fetch pending recipes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}