import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import ReviewSection from "@/components/ReviewSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ChefHat, Star, Heart, Bookmark, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function RecipeDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: recipe, isLoading } = useQuery({
    queryKey: ["/api/recipes", id],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/${id}`);
      if (!response.ok) throw new Error("Failed to fetch recipe");
      return response.json();
    },
  });

  const { data: isFavorited = false } = useQuery({
    queryKey: ["/api/favorites", id, "check"],
    queryFn: async () => {
      const response = await fetch(`/api/favorites/${id}/check`);
      if (!response.ok) throw new Error("Failed to check favorite status");
      const data = await response.json();
      return data.isFavorite;
    },
    enabled: !!isAuthenticated && !!id,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      if (action === "add") {
        await apiRequest("POST", "/api/favorites", { recipeId: parseInt(id!) });
      } else {
        await apiRequest("DELETE", `/api/favorites/${id}`);
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", id, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: action === "add" ? "Recipe saved!" : "Recipe removed",
        description: action === "add" ? "Added to your favorites" : "Removed from favorites",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-gray-200 rounded-xl h-64 mb-6"></div>
            <div className="bg-gray-200 h-8 rounded mb-4"></div>
            <div className="bg-gray-200 h-4 rounded mb-2"></div>
            <div className="bg-gray-200 h-4 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-gray-200 h-64 rounded"></div>
              <div className="lg:col-span-2 bg-gray-200 h-64 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <CardContent>
              <h1 className="text-2xl font-bold mb-4">Recipe Not Found</h1>
              <p className="text-gray-600 mb-6">The recipe you're looking for doesn't exist or has been removed.</p>
              <Link href="/">
                <Button className="bg-vegan-primary text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recipes
          </Button>
        </Link>

        {/* Recipe Header */}
        <div className="relative mb-8">
          {recipe.featuredImage && (
            <img 
              src={recipe.featuredImage} 
              alt={recipe.title}
              className="w-full h-64 object-cover rounded-xl"
            />
          )}
          {isAuthenticated && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100"
              onClick={() => favoriteMutation.mutate(isFavorited ? "remove" : "add")}
              disabled={favoriteMutation.isPending}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? "text-red-500 fill-current" : "text-gray-600"}`} />
            </Button>
          )}
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
          <p className="text-gray-600 mb-4">{recipe.description}</p>
          
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-4">
              {/* Removed difficulty and cuisine badges - cuisine will show in the green pill below */}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="flex mr-2">
                  {renderStars(recipe.avgRating)}
                </div>
                <span className="text-sm font-medium">{recipe.avgRating.toFixed(1)} ({recipe.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-vegan-primary flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-medium">
                    {recipe.author.firstName?.[0] || recipe.author.email?.[0] || "U"}
                  </span>
                </div>
                <span className="font-medium">
                  {recipe.author.firstName ? `${recipe.author.firstName} ${recipe.author.lastName || ""}` : recipe.author.email}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {recipe.cuisine && (
                <Badge variant="secondary">{recipe.cuisine}</Badge>
              )}
              {recipe.tags?.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-vegan-primary border-vegan-primary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Recipe Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
            <Card>
              <CardContent className="p-4">
                <ul className="space-y-3">
                  {(() => {
                    // Handle both string (with line breaks) and array formats
                    let ingredients: string[] = [];
                    if (typeof recipe.ingredients === 'string') {
                      try {
                        // First try to parse as JSON array
                        ingredients = JSON.parse(recipe.ingredients);
                      } catch {
                        try {
                          // Try to handle the malformed JSON object format from CSV
                          let cleanedJson = recipe.ingredients;
                          // Replace double quotes with single quotes
                          cleanedJson = cleanedJson.replace(/\"\"/g, '"');
                          // If it's a JSON object (starts with {), convert to array
                          if (cleanedJson.startsWith('{') && cleanedJson.endsWith('}')) {
                            cleanedJson = '[' + cleanedJson.slice(1, -1) + ']';
                          }
                          ingredients = JSON.parse(cleanedJson);
                        } catch {
                          // Fallback to splitting on line breaks
                          ingredients = recipe.ingredients.split('\n').filter((line: string) => line.trim());
                        }
                      }
                    } else if (Array.isArray(recipe.ingredients)) {
                      ingredients = recipe.ingredients;
                    }
                    
                    return ingredients.map((ingredient: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <div className="w-4 h-4 border border-gray-300 rounded mr-3 mt-1 flex-shrink-0" />
                        <span className="text-sm">{ingredient.trim()}</span>
                      </li>
                    ));
                  })()}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
            <div className="space-y-4">
              {(() => {
                // Handle both string (with line breaks) and array formats
                let instructions: string[] = [];
                if (typeof recipe.instructions === 'string') {
                  try {
                    // First try to parse as JSON array
                    instructions = JSON.parse(recipe.instructions);
                  } catch {
                    try {
                      // Try to handle the malformed JSON object format from CSV
                      let cleanedJson = recipe.instructions;
                      // Replace double quotes with single quotes
                      cleanedJson = cleanedJson.replace(/\"\"/g, '"');
                      // If it's a JSON object (starts with {), convert to array
                      if (cleanedJson.startsWith('{') && cleanedJson.endsWith('}')) {
                        cleanedJson = '[' + cleanedJson.slice(1, -1) + ']';
                      }
                      instructions = JSON.parse(cleanedJson);
                    } catch {
                      // Fallback to splitting on line breaks
                      instructions = recipe.instructions.split('\n').filter((line: string) => line.trim());
                    }
                  }
                } else if (Array.isArray(recipe.instructions)) {
                  instructions = recipe.instructions;
                }
                
                return instructions.map((instruction: string, index: number) => (
                  <div key={index} className="flex">
                    <span className="flex-shrink-0 w-8 h-8 bg-vegan-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-4">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 pt-1">{instruction.trim()}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Helpful Notes */}
        {recipe.helpfulNotes && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Helpful Notes</h2>
            <Card>
              <CardContent className="p-4">
                <div className="whitespace-pre-line text-sm text-gray-700">
                  {recipe.helpfulNotes}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gallery Images */}
        {recipe.galleryImages && recipe.galleryImages.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipe.galleryImages.map((image: string, index: number) => (
                <img 
                  key={index}
                  src={image} 
                  alt={`${recipe.title} - Image ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        <Separator className="my-8" />

        {/* Reviews Section */}
        <ReviewSection recipeId={parseInt(id!)} />
      </div>
    </div>
  );
}
