import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { storage } from './storage';
import csv from 'csv-parser';
import { Readable } from 'stream';
import fetch from 'node-fetch';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface CSVRecipe {
  Country: string; // Cuisine
  'Recipe Title': string;
  Intro: string; // Description
  Ingredients: string;
  Method: string; // Instructions
  'Helpful Notes': string;
  'Image url': string; // Featured image URL
}

// Function to validate and use existing S3 URL
async function validateS3ImageUrl(imageUrl: string): Promise<string> {
  try {
    // If it's already an S3 URL from our bucket, use it directly
    if (imageUrl.includes(process.env.AWS_S3_BUCKET_NAME!) && imageUrl.includes('amazonaws.com')) {
      return imageUrl;
    }
    
    // For other URLs, we could optionally validate they exist
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (response.ok) {
      return imageUrl;
    } else {
      console.warn(`Image URL not accessible: ${imageUrl}`);
      return imageUrl; // Return anyway, let the frontend handle broken images
    }
  } catch (error) {
    console.error('Error validating image URL:', error);
    return imageUrl; // Return original URL as fallback
  }
}

// Function to parse CSV data and create recipes
export async function importRecipesFromCSV(csvData: string, authorId: string): Promise<{ success: number; errors: string[] }> {
  const results: any[] = [];
  const errors: string[] = [];
  let successCount = 0;

  return new Promise((resolve) => {
    const stream = Readable.from([csvData]);
    
    stream
      .pipe(csv())
      .on('data', (data: CSVRecipe) => {
        results.push(data);
      })
      .on('end', async () => {
        console.log(`Processing ${results.length} recipes from CSV`);

        for (const row of results) {
          try {
            // Validate required fields
            if (!row['Recipe Title'] || !row.Ingredients || !row.Method) {
              errors.push(`Skipping recipe "${row['Recipe Title'] || 'Unknown'}": Missing required fields`);
              continue;
            }

            // Validate and use S3 image URL if provided
            let featuredImageUrl = '';
            if (row['Image url'] && row['Image url'].trim()) {
              console.log(`Validating image URL for recipe: ${row['Recipe Title']}`);
              featuredImageUrl = await validateS3ImageUrl(row['Image url'].trim());
            }

            // Create recipe object
            const recipeData = {
              title: row['Recipe Title'].trim(),
              description: row.Intro ? row.Intro.trim() : '',
              ingredients: row.Ingredients.trim().split('\n').filter(Boolean),
              instructions: row.Method.trim().split('\n').filter(Boolean),
              difficulty: 'medium' as const,
              cuisine: row.Country ? row.Country.trim() : '',
              tags: [], // Can be derived from cuisine or other fields
              notes: row['Helpful Notes'] ? row['Helpful Notes'].trim() : '',
              featuredImage: featuredImageUrl,
              isApproved: false, // Will need admin approval
            };

            // Create recipe in database
            const recipe = await storage.createRecipe(recipeData, authorId);
            successCount++;
            console.log(`Created recipe: ${recipe.title}`);

          } catch (error) {
            const errorMsg = `Error creating recipe "${row['Recipe Title']}": ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }

        resolve({
          success: successCount,
          errors: errors
        });
      });
  });
}