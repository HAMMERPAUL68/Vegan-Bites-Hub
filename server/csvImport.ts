import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { storage } from './storage';
import csv from 'csv-parser';
import { Readable } from 'stream';
import fetch from 'node-fetch';

// Helper function to find or create cuisine by name
async function findOrCreateCuisine(cuisineName: string): Promise<number | null> {
  if (!cuisineName || !cuisineName.trim()) {
    return null;
  }

  const cleanName = cuisineName.trim();
  
  // Country to cuisine mapping for common variations
  const countryToCuisineMap: { [key: string]: string } = {
    'Italy': 'Italian',
    'Greece': 'Greek', 
    'Mexico': 'Mexican',
    'Spain': 'Spanish',
    'France': 'French',
    'China': 'Chinese',
    'Japan': 'Japanese',
    'Thailand': 'Thai',
    'India': 'Indian',
    'Turkey': 'Turkish',
    'Lebanon': 'Lebanese',
    'Morocco': 'Moroccan',
    'United States': 'American',
    'USA': 'American',
    'UK': 'British',
    'United Kingdom': 'British'
  };

  // First try direct mapping
  const mappedCuisine = countryToCuisineMap[cleanName];
  const searchName = mappedCuisine || cleanName;
  
  // Try to find existing cuisine (case-insensitive)
  const cuisines = await storage.getCuisines();
  const existingCuisine = cuisines.find(c => 
    c.name.toLowerCase() === searchName.toLowerCase()
  );
  
  if (existingCuisine) {
    console.log(`Mapped "${cleanName}" to existing cuisine: ${existingCuisine.name}`);
    return existingCuisine.id;
  }
  
  // Create new cuisine if it doesn't exist (use the mapped name if available)
  try {
    const newCuisine = await storage.createCuisine({
      name: searchName,
      isActive: true
    });
    console.log(`Created new cuisine: ${searchName} (from country: ${cleanName})`);
    return newCuisine.id;
  } catch (error) {
    console.error(`Failed to create cuisine "${searchName}" from country "${cleanName}":`, error);
    return null;
  }
}

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
  Keywords: string; // Tags from column J
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

            // Process tags from Keywords column
            let tags: string[] = [];
            if (row.Keywords && row.Keywords.trim()) {
              tags = row.Keywords.trim()
                .split(',')
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag.length > 0);
            }

            // Find or create cuisine with validation
            const cuisineId = await findOrCreateCuisine(row.Country);
            if (!cuisineId) {
              errors.push(`Recipe "${row['Recipe Title']}": Could not determine cuisine from country "${row.Country}"`);
              continue;
            }
            
            console.log(`Recipe "${row['Recipe Title']}" assigned to cuisine ID: ${cuisineId}`);

            // Create recipe object
            const recipeData = {
              title: row['Recipe Title'].trim(),
              description: row.Intro ? row.Intro.trim() : '',
              ingredients: row.Ingredients.trim(),
              instructions: row.Method.trim(),
              helpfulNotes: row['Helpful Notes'] ? row['Helpful Notes'].trim() : '',
              cuisineId: cuisineId,
              tags: tags,
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