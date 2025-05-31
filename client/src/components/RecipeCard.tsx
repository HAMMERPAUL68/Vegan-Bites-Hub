import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, Users, Star, Eye, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface RecipeCardProps {
  recipe: {
    id: number;
    title: string;
    description: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty?: string;
    cuisine?: string;
    tags?: string[];
    featuredImage?: string;
    authorId: string;
    author: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
    avgRating: number;
    reviewCount: number;
    isApproved?: boolean;
  };
  showFavorite?: boolean;
  showActions?: boolean;
}

export default function RecipeCard({ recipe, showFavorite = false, showActions = false }: RecipeCardProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isFavorited = false } = useQuery({
    queryKey: ["/api/favorites", recipe.id, "check"],
    queryFn: async () => {
      const response = await fetch(`/api/favorites/${recipe.id}/check`);
      if (!response.ok) throw new Error("Failed to check favorite status");
      const data = await response.json();
      return data.isFavorite;
    },
    enabled: !!isAuthenticated && !!showFavorite,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      if (action === "add") {
        await apiRequest("POST", "/api/favorites", { recipeId: recipe.id });
      } else {
        await apiRequest("DELETE", `/api/favorites/${recipe.id}`);
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", recipe.id, "check"] });
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/recipes/${recipe.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Recipe deleted",
        description: "Your recipe has been removed.",
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
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });

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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save recipes to your favorites.",
      });
      return;
    }
    favoriteMutation.mutate(isFavorited ? "remove" : "add");
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100 group">
      <Link href={`/recipe/${recipe.id}`}>
        <div className="relative cursor-pointer">
          {recipe.featuredImage ? (
            <img 
              src={recipe.featuredImage} 
              alt={recipe.title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          {showFavorite && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3 bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100 transition-colors"
              onClick={handleFavoriteClick}
              disabled={favoriteMutation.isPending}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? "text-red-500 fill-current" : "text-gray-600"}`} />
            </Button>
          )}
          

          
          {recipe.isApproved === false && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Pending
              </Badge>
            </div>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/recipe/${recipe.id}`}>
          <div className="cursor-pointer">
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-vegan-primary transition-colors">
              {recipe.title}
            </h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {recipe.description}
            </p>
          </div>
        </Link>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="flex mr-2">
              {renderStars(recipe.avgRating)}
            </div>
            <span className="text-sm text-gray-600">
              {recipe.avgRating.toFixed(1)} ({recipe.reviewCount})
            </span>
          </div>
          
          {/* Removed timing and servings info */}
        </div>

        {(recipe.cuisine || (recipe.tags && recipe.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.cuisine && (
              <Badge variant="outline" className="text-xs">
                {recipe.cuisine}
              </Badge>
            )}
            {recipe.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs text-vegan-primary border-vegan-primary">
                {tag}
              </Badge>
            ))}
            {recipe.tags && recipe.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{recipe.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-6 h-6 rounded-full bg-vegan-primary flex items-center justify-center mr-2">
              <span className="text-white text-xs font-medium">
                {recipe.author.firstName?.[0] || recipe.author.email?.[0] || "U"}
              </span>
            </div>
            <span>
              {recipe.author.firstName 
                ? `${recipe.author.firstName} ${recipe.author.lastName || ""}` 
                : recipe.author.email
              }
            </span>
          </div>

          {showActions && user?.id === recipe.authorId && (
            <div className="flex space-x-2">
              <Link href={`/recipe/${recipe.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteClick}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
