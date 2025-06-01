import {
  users,
  cuisines,
  recipes,
  reviews,
  favorites,
  type User,
  type UpsertUser,
  type Cuisine,
  type InsertCuisine,
  type Recipe,
  type InsertRecipe,
  type Review,
  type InsertReview,
  type Favorite,
  type InsertFavorite,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, and, sql, avg, count, isNotNull, ne } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations for independent authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: {
    email: string;
    password: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
  }): Promise<User>;
  updateUser(id: number, user: Partial<{
    email?: string;
    password?: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: string;
  }>): Promise<User | undefined>;
  setResetToken(email: string, token: string, expiry: Date): Promise<boolean>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearResetToken(userId: number): Promise<boolean>;
  
  // Cuisine operations
  getCuisines(): Promise<Cuisine[]>;
  getPopularCuisines(): Promise<{ cuisine: string; recipeCount: number; featuredImage?: string }[]>;
  createCuisine(cuisine: InsertCuisine): Promise<Cuisine>;
  updateCuisine(id: number, cuisine: Partial<InsertCuisine>): Promise<Cuisine | undefined>;
  deleteCuisine(id: number): Promise<boolean>;
  
  // Recipe operations
  getRecipes(filters?: {
    search?: string;
    cuisineId?: number;
    tags?: string[];
    authorId?: string;
    isApproved?: boolean;
    sortBy?: "newest" | "rating" | "popular";
  }): Promise<(Recipe & { author: User; cuisine?: Cuisine; avgRating: number; reviewCount: number })[]>;
  getRecipe(id: number): Promise<(Recipe & { author: User; cuisine?: Cuisine; avgRating: number; reviewCount: number }) | undefined>;
  createRecipe(recipe: InsertRecipe, authorId: string): Promise<Recipe>;
  updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined>;
  approveRecipe(id: number): Promise<Recipe | undefined>;
  deleteRecipe(id: number): Promise<boolean>;
  
  // Review operations
  getRecipeReviews(recipeId: number): Promise<(Review & { user: User })[]>;
  createReview(review: InsertReview, userId: string): Promise<Review>;
  deleteReview(id: number): Promise<boolean>;
  
  // Favorite operations
  getUserFavorites(userId: string): Promise<(Favorite & { recipe: Recipe & { author: User; cuisine?: Cuisine; avgRating: number; reviewCount: number } })[]>;
  addFavorite(favorite: InsertFavorite, userId: string): Promise<Favorite>;
  removeFavorite(recipeId: number, userId: string): Promise<boolean>;
  isFavorite(recipeId: number, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations for independent authentication
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<{
    email?: string;
    password?: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: string;
  }>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setResetToken(email: string, token: string, expiry: Date): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        resetToken: token, 
        resetTokenExpiry: expiry,
        updatedAt: new Date()
      })
      .where(eq(users.email, email));
    return (result.rowCount || 0) > 0;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.resetToken, token),
        sql`${users.resetTokenExpiry} > NOW()`
      ));
    return user;
  }

  async clearResetToken(userId: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        resetToken: null, 
        resetTokenExpiry: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    return (result.rowCount || 0) > 0;
  }

  // Cuisine operations
  async getCuisines(): Promise<Cuisine[]> {
    return await db.select().from(cuisines).where(eq(cuisines.isActive, true)).orderBy(asc(cuisines.name));
  }

  async createCuisine(cuisineData: InsertCuisine): Promise<Cuisine> {
    const [cuisine] = await db
      .insert(cuisines)
      .values(cuisineData)
      .returning();
    return cuisine;
  }

  async updateCuisine(id: number, cuisineData: Partial<InsertCuisine>): Promise<Cuisine | undefined> {
    const [cuisine] = await db
      .update(cuisines)
      .set({ ...cuisineData })
      .where(eq(cuisines.id, id))
      .returning();
    return cuisine;
  }

  async deleteCuisine(id: number): Promise<boolean> {
    const result = await db
      .update(cuisines)
      .set({ isActive: false })
      .where(eq(cuisines.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPopularCuisines(): Promise<{ cuisine: string; recipeCount: number; featuredImage?: string }[]> {
    // Get actual cuisine data from the recipes table
    // Since we store cuisine names in the cuisines table and reference them in recipes
    const result = await db
      .select({
        cuisine: cuisines.name,
        recipeCount: count(recipes.id),
        featuredImage: sql<string>`(array_agg(${recipes.featuredImage}) filter (where ${recipes.featuredImage} is not null))[1]`
      })
      .from(cuisines)
      .leftJoin(recipes, eq(cuisines.id, recipes.cuisineId))
      .where(eq(recipes.isApproved, true))
      .groupBy(cuisines.id, cuisines.name)
      .orderBy(desc(count(recipes.id)))
      .limit(8);

    // If no cuisines are found in the database yet, return a default set
    if (result.length === 0) {
      return [
        { cuisine: "Mediterranean", recipeCount: 0, featuredImage: undefined },
        { cuisine: "Asian", recipeCount: 0, featuredImage: undefined },
        { cuisine: "Mexican", recipeCount: 0, featuredImage: undefined },
        { cuisine: "Indian", recipeCount: 0, featuredImage: undefined },
        { cuisine: "Italian", recipeCount: 0, featuredImage: undefined },
        { cuisine: "Middle Eastern", recipeCount: 0, featuredImage: undefined },
        { cuisine: "American", recipeCount: 0, featuredImage: undefined },
        { cuisine: "Thai", recipeCount: 0, featuredImage: undefined }
      ];
    }
    
    return result.map(row => ({
      cuisine: row.cuisine,
      recipeCount: Number(row.recipeCount),
      featuredImage: row.featuredImage || undefined
    }));
  }

  // Recipe operations
  async getRecipes(filters?: {
    search?: string;
    cuisine?: string;
    tags?: string[];
    authorId?: string;
    isApproved?: boolean;
    sortBy?: "newest" | "rating" | "popular";
  }): Promise<(Recipe & { author: User; cuisine?: Cuisine; avgRating: number; reviewCount: number })[]> {
    let query = db
      .select({
        recipe: recipes,
        author: users,
        cuisine: cuisines,
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
      })
      .from(recipes)
      .leftJoin(users, eq(recipes.authorId, users.id))
      .leftJoin(cuisines, eq(recipes.cuisineId, cuisines.id))
      .leftJoin(reviews, eq(recipes.id, reviews.recipeId))
      .groupBy(recipes.id, users.id, cuisines.id);

    const conditions = [];
    
    if (filters?.isApproved !== undefined) {
      conditions.push(eq(recipes.isApproved, filters.isApproved));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`(${recipes.title} ILIKE ${`%${filters.search}%`} OR ${recipes.description} ILIKE ${`%${filters.search}%`})`
      );
    }
    
    if (filters?.cuisine) {
      conditions.push(eq(cuisines.name, filters.cuisine));
    }
    
    if (filters?.authorId) {
      conditions.push(eq(recipes.authorId, filters.authorId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Add sorting
    switch (filters?.sortBy) {
      case "rating":
        query = query.orderBy(desc(sql`AVG(${reviews.rating})`));
        break;
      case "popular":
        query = query.orderBy(desc(sql`COUNT(${reviews.id})`));
        break;
      case "newest":
      default:
        query = query.orderBy(desc(recipes.createdAt));
        break;
    }

    const results = await query;
    
    return results.map(row => ({
      ...row.recipe,
      author: row.author!,
      cuisine: row.cuisine || undefined,
      avgRating: Number(row.avgRating),
      reviewCount: Number(row.reviewCount),
    }));
  }

  async getRecipe(id: number): Promise<(Recipe & { author: User; avgRating: number; reviewCount: number }) | undefined> {
    const [result] = await db
      .select({
        recipe: recipes,
        author: users,
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
      })
      .from(recipes)
      .leftJoin(users, eq(recipes.authorId, users.id))
      .leftJoin(reviews, eq(recipes.id, reviews.recipeId))
      .where(eq(recipes.id, id))
      .groupBy(recipes.id, users.id);

    if (!result) return undefined;

    return {
      ...result.recipe,
      author: result.author!,
      avgRating: Number(result.avgRating),
      reviewCount: Number(result.reviewCount),
    };
  }

  async createRecipe(recipe: InsertRecipe, authorId: string): Promise<Recipe> {
    const [newRecipe] = await db
      .insert(recipes)
      .values({ ...recipe, authorId })
      .returning();
    return newRecipe;
  }

  async updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined> {
    const [updatedRecipe] = await db
      .update(recipes)
      .set({ ...recipe, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return updatedRecipe;
  }

  async approveRecipe(id: number): Promise<Recipe | undefined> {
    const [approvedRecipe] = await db
      .update(recipes)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return approvedRecipe;
  }

  async deleteRecipe(id: number): Promise<boolean> {
    const result = await db.delete(recipes).where(eq(recipes.id, id));
    return result.rowCount > 0;
  }

  // Review operations
  async getRecipeReviews(recipeId: number): Promise<(Review & { user: User })[]> {
    const results = await db
      .select({
        review: reviews,
        user: users,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.recipeId, recipeId))
      .orderBy(desc(reviews.createdAt));

    return results.map(row => ({
      ...row.review,
      user: row.user!,
    }));
  }

  async createReview(review: InsertReview, userId: string): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values({ ...review, userId })
      .returning();
    return newReview;
  }

  async deleteReview(id: number): Promise<boolean> {
    const result = await db.delete(reviews).where(eq(reviews.id, id));
    return result.rowCount > 0;
  }

  // Favorite operations
  async getUserFavorites(userId: string): Promise<(Favorite & { recipe: Recipe & { author: User; avgRating: number; reviewCount: number } })[]> {
    const results = await db
      .select({
        favorite: favorites,
        recipe: recipes,
        author: users,
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
      })
      .from(favorites)
      .leftJoin(recipes, eq(favorites.recipeId, recipes.id))
      .leftJoin(users, eq(recipes.authorId, users.id))
      .leftJoin(reviews, eq(recipes.id, reviews.recipeId))
      .where(eq(favorites.userId, userId))
      .groupBy(favorites.id, recipes.id, users.id)
      .orderBy(desc(favorites.createdAt));

    return results.map(row => ({
      ...row.favorite,
      recipe: {
        ...row.recipe!,
        author: row.author!,
        avgRating: Number(row.avgRating),
        reviewCount: Number(row.reviewCount),
      },
    }));
  }

  async addFavorite(favorite: InsertFavorite, userId: string): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values({ ...favorite, userId })
      .returning();
    return newFavorite;
  }

  async removeFavorite(recipeId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.recipeId, recipeId), eq(favorites.userId, userId)));
    return result.rowCount > 0;
  }

  async isFavorite(recipeId: number, userId: string): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.recipeId, recipeId), eq(favorites.userId, userId)));
    return !!favorite;
  }
}

export const storage = new DatabaseStorage();
