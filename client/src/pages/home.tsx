import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecipeFilters from "@/components/RecipeFilters";
import RecipeCard from "@/components/RecipeCard";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Plus, User, Settings } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@assets/Vegan-Bites-Hub-Website-Images-1920-x-1080-px.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");

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
      "Japanese": "🍣"
    };
    return emojiMap[cuisine] || "🍽️";
  };

  const getCuisineGradient = (index: number) => {
    const gradients = [
      "bg-gradient-to-br from-blue-500 to-purple-600",
      "bg-gradient-to-br from-red-500 to-orange-600",
      "bg-gradient-to-br from-green-500 to-teal-600",
      "bg-gradient-to-br from-yellow-500 to-orange-500",
      "bg-gradient-to-br from-purple-500 to-pink-600",
      "bg-gradient-to-br from-indigo-500 to-blue-600",
      "bg-gradient-to-br from-pink-500 to-rose-600",
      "bg-gradient-to-br from-teal-500 to-cyan-600"
    ];
    return gradients[index % gradients.length];
  };

  const { data: popularRecipes = [], isLoading: popularRecipesLoading } = useQuery({
    queryKey: ["/api/recipes", "popular"],
    queryFn: async () => {
      const response = await fetch("/api/recipes?isApproved=true&sortBy=newest&limit=10");
      if (!response.ok) throw new Error("Failed to fetch popular recipes");
      return response.json();
    },
  });

  const { data: recentRecipes = [], isLoading: recentRecipesLoading } = useQuery({
    queryKey: ["/api/recipes", "recent"],
    queryFn: async () => {
      const response = await fetch("/api/recipes?isApproved=true&sortBy=newest&limit=10");
      if (!response.ok) throw new Error("Failed to fetch recent recipes");
      return response.json();
    },
  });

  const { data: popularCuisines = [], isLoading: popularCuisinesLoading } = useQuery({
    queryKey: ["/api/cuisines", "popular"],
    queryFn: async () => {
      const response = await fetch("/api/cuisines/popular");
      if (!response.ok) throw new Error("Failed to fetch popular cuisines");
      return response.json();
    },
  });

  const { data: myRecipes = [], isLoading: myRecipesLoading } = useQuery({
    queryKey: ["/api/recipes", "my-recipes"],
    queryFn: async () => {
      const response = await fetch(`/api/recipes?authorId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch my recipes");
      return response.json();
    },
    enabled: !!user && (user.role === "home_cook" || user.role === "admin"),
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
    enabled: !!user,
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
                Welcome back, {user?.firstName || "Chef"}!
              </h1>
              <p className="text-xl opacity-90 leading-relaxed">
                Ready to discover some amazing vegan recipes today? Join our community of passionate plant-based cooks sharing delicious, healthy meals.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {user?.role === "registered" && (
                <Button 
                  className="bg-white text-vegan-primary px-6 py-3 hover:bg-gray-100"
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/profile/role", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ role: "home_cook" }),
                        credentials: "include",
                      });
                      
                      if (response.ok) {
                        toast({
                          title: "Success!",
                          description: "You're now a home cook! You can start sharing recipes.",
                        });
                        window.location.reload();
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to upgrade account",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <User className="w-5 h-5 mr-2" />
                  Become a Home Cook
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Recipes Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Popular Recipes</h2>
          <p className="text-gray-600">Discover the most loved recipes from our community</p>
        </div>

        {popularRecipesLoading ? (
          <div className="flex gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 animate-pulse">
                <div className="bg-gray-200 rounded-xl h-64 mb-4"></div>
                <div className="bg-gray-200 h-6 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : popularRecipes.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">No recipes available yet</h3>
              <p className="text-gray-600">Check back soon for amazing vegan recipes!</p>
            </CardContent>
          </Card>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {popularRecipes.map((recipe: any) => (
                <CarouselItem key={recipe.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Link href={`/recipe/${recipe.id}`}>
                    <div className="relative h-64 rounded-xl overflow-hidden group cursor-pointer">
                      {recipe.featuredImage ? (
                        <img
                          src={recipe.featuredImage}
                          alt={recipe.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-vegan-primary to-vegan-secondary flex items-center justify-center">
                          <div className="text-white text-6xl">🥗</div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="text-white text-xl font-bold mb-2 line-clamp-2">
                          {recipe.title}
                        </h3>
                        <div className="flex items-center gap-2 text-white/80 text-sm">
                          <span>by {recipe.author.firstName || recipe.author.email}</span>
                          {recipe.avgRating > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <span>⭐</span>
                                <span>{recipe.avgRating.toFixed(1)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        )}
      </section>

      {/* Recent Recipes Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Recipes</h2>
          <p className="text-gray-600">Fresh additions to our community cookbook</p>
        </div>

        {recentRecipesLoading ? (
          <div className="flex gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 animate-pulse">
                <div className="bg-gray-200 rounded-xl h-64 mb-4"></div>
                <div className="bg-gray-200 h-6 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : recentRecipes.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">No recent recipes available yet</h3>
              <p className="text-gray-600">Check back soon for the latest additions!</p>
            </CardContent>
          </Card>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {recentRecipes.map((recipe: any) => (
                <CarouselItem key={recipe.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Link href={`/recipe/${recipe.id}`}>
                    <div className="relative h-64 rounded-xl overflow-hidden group cursor-pointer">
                      {recipe.featuredImage ? (
                        <img
                          src={recipe.featuredImage}
                          alt={recipe.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <div className="text-white text-6xl">🌱</div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="text-white text-xl font-bold mb-2 line-clamp-2">
                          {recipe.title}
                        </h3>
                        <div className="flex items-center gap-2 text-white/80 text-sm">
                          <span>by {recipe.author.firstName || recipe.author.email}</span>
                          {recipe.avgRating > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <span>⭐</span>
                                <span>{recipe.avgRating.toFixed(1)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        )}
      </section>

      {/* Popular Cuisines Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Popular Cuisines</h2>
          <p className="text-gray-600">Explore flavors from around the world</p>
        </div>

        {popularCuisinesLoading ? (
          <div className="flex gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 animate-pulse">
                <div className="bg-gray-200 rounded-xl h-64 mb-4"></div>
                <div className="bg-gray-200 h-6 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : popularCuisines.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">No cuisine data available yet</h3>
              <p className="text-gray-600">Check back after recipe imports for cuisine variety!</p>
            </CardContent>
          </Card>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {popularCuisines.map((cuisine: any, index: number) => (
                <CarouselItem key={cuisine.cuisine} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="relative h-64 rounded-xl overflow-hidden group cursor-pointer">
                    {cuisine.featuredImage ? (
                      <img
                        src={cuisine.featuredImage}
                        alt={cuisine.cuisine}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${getCuisineGradient(index)}`}>
                        <div className="text-white text-6xl">{getCuisineEmoji(cuisine.cuisine)}</div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-white text-xl font-bold mb-2">
                        {cuisine.cuisine}
                      </h3>
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <span>{cuisine.recipeCount} recipes</span>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        )}
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="favorites">
              <Heart className="w-4 h-4 mr-2" />
              Favorites
            </TabsTrigger>
            {(user?.role === "home_cook" || user?.role === "admin") && (
              <TabsTrigger value="my-recipes">My Recipes</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="favorites" className="space-y-6">
            {favoritesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-xl h-48 mb-4"></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : favorites.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No favorite recipes yet</h3>
                  <p className="text-gray-600 mb-4">Start exploring and save recipes you love!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map((favorite: any) => (
                  <RecipeCard key={favorite.id} recipe={favorite.recipe} showFavorite />
                ))}
              </div>
            )}
          </TabsContent>

          {(user?.role === "home_cook" || user?.role === "admin") && (
            <TabsContent value="my-recipes" className="space-y-6">
              {myRecipesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-xl h-48 mb-4"></div>
                      <div className="bg-gray-200 h-4 rounded mb-2"></div>
                      <div className="bg-gray-200 h-3 rounded mb-2"></div>
                      <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : myRecipes.length === 0 ? (
                <Card className="p-8 text-center">
                  <CardContent>
                    <Plus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recipes shared yet</h3>
                    <p className="text-gray-600 mb-4">Share your first vegan recipe with the community!</p>
                    <Link href="/create-recipe">
                      <Button className="bg-vegan-primary text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Recipe
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myRecipes.map((recipe: any) => (
                    <RecipeCard key={recipe.id} recipe={recipe} showActions />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
