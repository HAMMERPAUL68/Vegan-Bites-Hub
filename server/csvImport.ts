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

// Function to upload image from URL to S3
async function uploadImageToS3(imageUrl: string, recipeTitle: string): Promise<string> {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
    
    // Create a safe filename
    const safeFileName = recipeTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const key = `recipe-images/${safeFileName}-${Date.now()}.${fileExtension}`;

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    });

    await s3Client.send(uploadCommand);

    // Return the public URL
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    // Return original URL as fallback
    return imageUrl;
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

            // Upload image to S3 if URL provided
            let featuredImageUrl = '';
            if (row['Image url'] && row['Image url'].trim()) {
              console.log(`Uploading image for recipe: ${row['Recipe Title']}`);
              featuredImageUrl = await uploadImageToS3(row['Image url'].trim(), row['Recipe Title']);
            }

            // Create recipe object
            const recipeData = {
              title: row['Recipe Title'].trim(),
              description: row.Intro ? row.Intro.trim() : '',
              ingredients: row.Ingredients.trim().split('\n').filter(Boolean),
              instructions: row.Method.trim().split('\n').filter(Boolean),
              prepTime: 30, // Default values - you can adjust these
              cookTime: 45,
              servings: 4,
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