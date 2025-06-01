import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecipeFilters from "@/components/RecipeFilters";
import RecipeCard from "@/components/RecipeCard";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Users, Star, ChefHat } from "lucide-react";
import heroImage from "@assets/Vegan-Bites-Hub-Website-Images-1920-x-1080-px.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function Landing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeFilters, setActiveFilters] = useState({
    search: "",
    cuisine: "",
    difficulty: "",
    sortBy: "newest",
    tags: [] as string[],
  });

  // Helper functions for cuisine display
  const getCuisineEmoji = (cuisine: string) => {
    const emojiMap: { [key: string]: string } = {
      "Mediterranean": "🫒",
      "Asian": "🥢",
      "Mexican": "🌮",
      "Indian": "🍛",
      "Italian": "🍝",
      "Middle Eastern": "🥙",
      "American": "🍔",
      "Thai": "🌶️",
      "Chinese": "🥟",
      "Japanese": "🍣",
      "Greek": "🫒"
    };
    return emojiMap[cuisine] || "🍽️";
  };

  const getCuisineGradient = (index: number) => {
    const gradients = [
      "bg-gradient-to-br from-blue-500 to-purple-600",
      "bg-gradient-to-br from-red-500 to-orange-600",
      "bg-gradient-to-br from-green-500 to-teal-600",
      "bg-gradient-to-br from-yellow-500 to-orange-500",
      "bg-gradient-to-br from-pink-500 to-rose-600",
      "bg-gradient-to-br from-indigo-500 to-blue-600"
    ];
    return gradients[index % gradients.length];
  };

  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["/api/recipes", activeFilters.sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("isApproved", "true");
      if (activeFilters.sortBy) params.append("sortBy", activeFilters.sortBy);
      
      const response = await fetch(`/api/recipes?${params}`);
      if (!response.ok) throw new Error("Failed to fetch recipes");
      return response.json();
    },
  });

  const { data: recentRecipes = [], isLoading: recentLoading } = useQuery({
    queryKey: ["/api/recipes", "recent"],
    queryFn: async () => {
      const response = await fetch("/api/recipes?isApproved=true&sortBy=newest");
      if (!response.ok) throw new Error("Failed to fetch recent recipes");
      return response.json();
    },
  });

  const { data: popularCuisines = [], isLoading: cuisinesLoading } = useQuery({
    queryKey: ["/api/cuisines/popular"],
    queryFn: async () => {
      const response = await fetch("/api/cuisines/popular");
      if (!response.ok) throw new Error("Failed to fetch popular cuisines");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vegan-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Welcome Section */}
      <section 
        className="relative py-16 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold mb-4">
                Discover Amazing Vegan Recipes
              </h1>
              <p className="text-xl opacity-90 leading-relaxed">
                Join our community of passionate plant-based cooks sharing delicious, healthy meals from around the world.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="bg-white text-vegan-primary px-6 py-3 hover:bg-gray-100"
                onClick={() => window.location.href = "/auth"}
              >
                Join Community
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-white text-white bg-transparent px-6 py-3 hover:bg-white/20 hover:text-white font-medium transition-colors"
                onClick={() => window.location.href = "/auth"}
              >
                Share Recipe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Recipes Section */}
      <section id="recipes-section" className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Popular Recipes</h2>
          </div>
          
          {recipesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vegan-primary"></div>
            </div>
          ) : (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {recipes.slice(0, 8).map((recipe, index) => (
                  <CarouselItem key={recipe.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <RecipeCard recipe={recipe} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
        </div>
      </section>

      {/* Recent Recipes Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Recently Added</h2>
          </div>
          
          {recentLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vegan-primary"></div>
            </div>
          ) : (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {recentRecipes.slice(0, 8).map((recipe, index) => (
                  <CarouselItem key={recipe.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <RecipeCard recipe={recipe} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
        </div>
      </section>

      {/* Popular Cuisines Section */}
      <section id="cuisines-section" className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Popular Cuisines</h2>
          </div>
          
          {cuisinesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vegan-primary"></div>
            </div>
          ) : (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {popularCuisines.map((cuisine, index) => (
                  <CarouselItem key={cuisine.cuisine} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <Card className="h-32 cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className={`${getCuisineGradient(index)} h-full flex flex-col items-center justify-center text-white p-6 rounded-lg`}>
                        <div className="text-3xl mb-2">{getCuisineEmoji(cuisine.cuisine)}</div>
                        <h3 className="text-lg font-semibold text-center">{cuisine.cuisine}</h3>
                        <p className="text-sm opacity-90">{cuisine.recipeCount} recipes</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Vegan Bites Club?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Connect with a vibrant community of plant-based food enthusiasts and discover your next favorite recipe.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-vegan-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">100% Vegan</h3>
              <p className="text-sm text-gray-600">Every recipe is completely plant-based and cruelty-free</p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-vegan-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Community Driven</h3>
              <p className="text-sm text-gray-600">Recipes shared by passionate home cooks</p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-vegan-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Rated & Reviewed</h3>
              <p className="text-sm text-gray-600">Honest reviews and ratings from the community</p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-vegan-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Easy to Follow</h3>
              <p className="text-sm text-gray-600">Step-by-step instructions with prep times</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Recipes */}
      <section id="recipes-section" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Recipes</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover our most popular and highly-rated vegan recipes from the community.
            </p>
          </div>

          <RecipeFilters />

          {recipesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-xl h-48 mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {recipes.slice(0, 8).map((recipe: any) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}


        </div>
      </section>

      
      <Footer />
    </div>
  );
}
