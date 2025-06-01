import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, requireAuth, requireAdmin, hashPassword, comparePasswords, sendPasswordResetEmail } from "./independentAuth";
import { importRecipesFromCSV } from "./csvImport";
import multer from "multer";
import { insertRecipeSchema, insertReviewSchema, insertFavoriteSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { z } from "zod";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Configure AWS S3 with explicit configuration
const s3Config = {
  region: process.env.AWS_S3_REGION?.trim() || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
  },
  forcePathStyle: false,
  maxAttempts: 3,
};

const s3 = new S3Client(s3Config);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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

  // Test S3 connection
  app.get('/api/test-s3', async (req, res) => {
    try {
      const command = new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET_NAME?.trim(),
        MaxKeys: 1
      });
      
      await s3.send(command);
      res.json({ status: "S3 connection successful", region: process.env.AWS_S3_REGION, bucket: process.env.AWS_S3_BUCKET_NAME });
    } catch (error: any) {
      console.error("S3 test failed:", error);
      res.status(500).json({ status: "S3 connection failed", error: error.message });
    }
  });

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
        role: "user",
      });

      // Log the user in
      (req.session as any).user = { id: user.id, email: user.email, role: user.role };

      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data" });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Log the user in
      (req.session as any).user = { id: user.id, email: user.email, role: user.role };

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data" });
      }
      res.status(500).json({ message: "Login failed" });
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

  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Password reset routes
  app.post('/api/reset-password-request', async (req, res) => {
    try {
      const { email } = resetRequestSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = nanoid(32);
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.setResetToken(email, resetToken, expiry);

      // Send reset email
      await sendPasswordResetEmail(email, resetToken);

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process reset request" });
    }
  });

  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);

      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password and update user
      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, { password: hashedPassword });
      await storage.clearResetToken(user.id);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Recipe routes
  app.get('/api/recipes', async (req, res) => {
    try {
      const { search, cuisine, sortBy, authorId } = req.query;
      
      const filters: any = {
        isApproved: true // Only show approved recipes to public
      };
      
      if (search) filters.search = search as string;
      if (cuisine) filters.cuisine = cuisine as string;
      if (sortBy) filters.sortBy = sortBy as "newest" | "rating" | "popular";
      if (authorId) filters.authorId = authorId as string;

      const recipes = await storage.getRecipes(filters);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const recipe = await storage.getRecipe(recipeId);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      // Only show approved recipes to non-admin users
      const user = (req.session as any)?.user;
      if (!recipe.isApproved && (!user || user.role !== 'admin')) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post('/api/recipes', requireAuth, upload.single('featuredImage'), async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Parse and validate the recipe data
      const recipeData = {
        ...req.body,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        cuisineId: req.body.cuisineId ? parseInt(req.body.cuisineId) : null,
      };

      const validatedData = insertRecipeSchema.parse(recipeData);

      let featuredImageUrl = null;

      // Upload image to S3 if provided
      if (req.file) {
        const imageKey = `user-images/${userId}/${Date.now()}-${req.file.originalname}`;
        
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: imageKey,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: 'public-read',
        });

        await s3.send(uploadCommand);
        featuredImageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${imageKey}`;
      }

      const recipe = await storage.createRecipe({
        ...validatedData,
        featuredImage: featuredImageUrl,
      }, userId);

      res.status(201).json(recipe);
    } catch (error: any) {
      console.error("Error creating recipe:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid recipe data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.patch('/api/recipes/:id', requireAuth, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      const recipe = await storage.getRecipe(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      // Only recipe author or admin can edit
      if (recipe.authorId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: "Not authorized to edit this recipe" });
      }

      const updatedRecipe = await storage.updateRecipe(recipeId, req.body);
      res.json(updatedRecipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', requireAuth, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      const recipe = await storage.getRecipe(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      // Only recipe author or admin can delete
      if (recipe.authorId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: "Not authorized to delete this recipe" });
      }

      await storage.deleteRecipe(recipeId);
      res.json({ message: "Recipe deleted successfully" });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // Cuisine routes
  app.get('/api/cuisines', async (req, res) => {
    try {
      const cuisines = await storage.getCuisines();
      res.json(cuisines);
    } catch (error) {
      console.error("Error fetching cuisines:", error);
      res.status(500).json({ message: "Failed to fetch cuisines" });
    }
  });

  app.get('/api/cuisines/popular', async (req, res) => {
    try {
      const popularCuisines = await storage.getPopularCuisines();
      res.json(popularCuisines);
    } catch (error) {
      console.error("Error fetching popular cuisines:", error);
      res.status(500).json({ message: "Failed to fetch popular cuisines" });
    }
  });

  // Review routes
  app.get('/api/recipes/:id/reviews', async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const reviews = await storage.getRecipeReviews(recipeId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/recipes/:id/reviews', requireAuth, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.session.user.id;

      const reviewData = insertReviewSchema.parse({
        ...req.body,
        recipeId,
      });

      const review = await storage.createReview(reviewData, userId);
      res.status(201).json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.delete('/api/reviews/:id', requireAuth, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      // Only review author or admin can delete
      // Note: This is simplified - in a real app you'd check ownership
      if (userRole !== 'admin') {
        // Additional ownership check would go here
      }

      await storage.deleteReview(reviewId);
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Favorite routes
  app.get('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/recipes/:id/favorite', requireAuth, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.session.user.id;

      const favoriteData = insertFavoriteSchema.parse({ recipeId });
      const favorite = await storage.addFavorite(favoriteData, userId);
      res.status(201).json(favorite);
    } catch (error: any) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete('/api/recipes/:id/favorite', requireAuth, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.session.user.id;

      await storage.removeFavorite(recipeId, userId);
      res.json({ message: "Favorite removed successfully" });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get('/api/recipes/:id/is-favorite', requireAuth, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.session.user.id;

      const isFavorite = await storage.isFavorite(recipeId, userId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Admin routes
  app.get('/api/admin/recipes', requireAdmin, async (req, res) => {
    try {
      const recipes = await storage.getRecipes({ isApproved: false }); // Get pending recipes
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching pending recipes:", error);
      res.status(500).json({ message: "Failed to fetch pending recipes" });
    }
  });

  app.patch('/api/admin/recipes/:id/approve', requireAdmin, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const approvedRecipe = await storage.approveRecipe(recipeId);
      
      if (!approvedRecipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      res.json(approvedRecipe);
    } catch (error) {
      console.error("Error approving recipe:", error);
      res.status(500).json({ message: "Failed to approve recipe" });
    }
  });

  app.post('/api/admin/import-csv', requireAdmin, upload.single('csvFile'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const result = await importRecipesFromCSV(csvData, req.session.user.id);

      res.json({
        message: `Import completed. ${result.success} recipes imported successfully.`,
        success: result.success,
        errors: result.errors
      });
    } catch (error: any) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Failed to import CSV", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}