import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { importRecipesFromCSV } from "./csvImport";
import multer from "multer";
import { insertRecipeSchema, insertReviewSchema, insertFavoriteSchema } from "@shared/schema";
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

console.log("S3 Configuration:", {
  region: s3Config.region,
  bucket: process.env.AWS_S3_BUCKET_NAME?.trim(),
  hasAccessKey: !!s3Config.credentials.accessKeyId,
  hasSecretKey: !!s3Config.credentials.secretAccessKey
});

const s3 = new S3Client(s3Config);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Auth middleware
  await setupAuth(app);

  // Test S3 connection endpoint
  app.get('/api/test-s3', async (req, res) => {
    try {
      console.log("Testing S3 configuration...");
      console.log("Region:", process.env.AWS_S3_REGION);
      console.log("Bucket:", process.env.AWS_S3_BUCKET_NAME);
      
      // Test S3 connection by listing bucket contents
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
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // Recipe routes
  app.get('/api/recipes', async (req, res) => {
    try {
      const { search, cuisine, tags, sortBy, isApproved = "true" } = req.query;
      
      const filters = {
        search: search as string,
        cuisine: cuisine as string,
        tags: tags ? (tags as string).split(',') : undefined,
        sortBy: sortBy as "newest" | "rating" | "popular",
        isApproved: isApproved === "true",
      };

      const recipes = await storage.getRecipes(filters);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recipe = await storage.getRecipe(id);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post('/api/recipes', isAuthenticated, upload.array('images', 10), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "home_cook" && user.role !== "admin")) {
        return res.status(403).json({ message: "Only home cooks can create recipes" });
      }

      console.log("Form data received:", req.body);
      console.log("Files received:", req.files?.length || 0);

      // Parse form data
      const formData = {
        title: req.body.title,
        description: req.body.description,
        ingredients: req.body.ingredients,
        instructions: req.body.instructions,
        helpfulNotes: req.body.helpfulNotes || null,
        cuisineId: req.body.cuisineId ? parseInt(req.body.cuisineId) : null,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        featuredImage: null as string | null,
        images: [] as string[],
      };

      // Handle image uploads if files are present
      if (req.files && req.files.length > 0) {
        console.log("Attempting to upload images...");
        try {
          // Check if S3 configuration is valid
          if (!process.env.AWS_S3_REGION || !process.env.AWS_S3_BUCKET_NAME) {
            console.log("AWS S3 not configured, skipping image upload");
          } else {
            const uploadPromises = req.files.map(async (file: any) => {
              const key = `recipes/${Date.now()}-${file.originalname}`;
              
              const uploadParams = {
                Bucket: process.env.AWS_S3_BUCKET_NAME!.trim(),
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
              };

              await s3.send(new PutObjectCommand(uploadParams));
              return `https://${process.env.AWS_S3_BUCKET_NAME!.trim()}.s3.${process.env.AWS_S3_REGION!.trim()}.amazonaws.com/${key}`;
            });

            const imageUrls = await Promise.all(uploadPromises);
            formData.featuredImage = imageUrls[0];
            formData.images = imageUrls;
            console.log("Images uploaded successfully:", imageUrls);
          }
        } catch (uploadError) {
          console.error("Image upload failed - continuing without images:", uploadError);
          // Continue without images when S3 upload fails
        }
      }

      console.log("Parsed form data:", formData);

      const recipeData = insertRecipeSchema.parse(formData);
      const recipe = await storage.createRecipe(recipeData, userId);
      
      res.status(201).json(recipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid recipe data", errors: error.errors });
      }
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.patch('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      // Check if user owns the recipe or is admin
      if (recipe.authorId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to edit this recipe" });
      }

      const updateData = insertRecipeSchema.partial().parse(req.body);
      const updatedRecipe = await storage.updateRecipe(id, updateData);
      
      res.json(updatedRecipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recipe data", errors: error.errors });
      }
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.patch('/api/recipes/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Only admins can approve recipes" });
      }

      const approvedRecipe = await storage.approveRecipe(id);
      if (!approvedRecipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.json(approvedRecipe);
    } catch (error) {
      console.error("Error approving recipe:", error);
      res.status(500).json({ message: "Failed to approve recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      // Check if user owns the recipe or is admin
      if (recipe.authorId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this recipe" });
      }

      const deleted = await storage.deleteRecipe(id);
      if (!deleted) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
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

  app.post('/api/recipes/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const reviewData = insertReviewSchema.parse({ ...req.body, recipeId });
      const review = await storage.createReview(reviewData, userId);
      
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.delete('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // For simplicity, allowing users to delete their own reviews or admins to delete any
      // In a real app, you'd check review ownership
      if (user?.role !== "admin") {
        // Add review ownership check here
      }

      const deleted = await storage.deleteReview(id);
      if (!deleted) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Favorite routes
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteData = insertFavoriteSchema.parse(req.body);
      
      const favorite = await storage.addFavorite(favoriteData, userId);
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete('/api/favorites/:recipeId', isAuthenticated, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const userId = req.user.claims.sub;
      
      const removed = await storage.removeFavorite(recipeId, userId);
      if (!removed) {
        return res.status(404).json({ message: "Favorite not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get('/api/favorites/:recipeId/check', isAuthenticated, async (req: any, res) => {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const userId = req.user.claims.sub;
      
      const isFavorite = await storage.isFavorite(recipeId, userId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Admin routes
  app.get('/api/admin/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const recipes = await storage.getRecipes({ isApproved: false });
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching pending recipes:", error);
      res.status(500).json({ message: "Failed to fetch pending recipes" });
    }
  });

  // User profile update
  app.patch('/api/profile/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!["registered", "home_cook"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        role,
        updatedAt: new Date(),
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // CSV Import route (admin only)
  app.post('/api/admin/import-csv', isAuthenticated, upload.single('csvFile'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      if (user?.role !== "admin") {
        return res.status(403).json({ message: 'Admin access required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No CSV file uploaded' });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const result = await importRecipesFromCSV(csvData, userId);
      
      res.json({
        message: 'CSV import completed',
        success: result.success,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error importing CSV:', error);
      res.status(500).json({ message: 'Failed to import CSV' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
