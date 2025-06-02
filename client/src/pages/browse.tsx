import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecipeFilters from "@/components/RecipeFilters";
import RecipeCard from "@/components/RecipeCard";

export default function Browse() {
  const [location] = useLocation();
  const [activeFilters, setActiveFilters] = useState({
    search: "",
    cuisine: "",
    difficulty: "",
    sortBy: "newest",
    tags: [] as string[],
  });

  // Handle URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const cuisineParam = urlParams.get('cuisine');
    
    if (searchParam || cuisineParam) {
      setActiveFilters(prev => ({
        ...prev,
        search: searchParam || "",
        cuisine: cuisineParam || "",
      }));
    }
  }, [location]);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["/api/recipes", "browse", activeFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("isApproved", "true");
      
      if (activeFilters.search) params.append("search", activeFilters.search);
      if (activeFilters.cuisine) params.append("cuisine", activeFilters.cuisine);
      if (activeFilters.sortBy) params.append("sortBy", activeFilters.sortBy);
      
      const response = await fetch(`/api/recipes?${params}`);
      if (!response.ok) throw new Error("Failed to fetch recipes");
      return response.json();
    },
  });

  const handleFilterChange = (filters: typeof activeFilters) => {
    setActiveFilters(filters);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {activeFilters.search 
              ? `Search Results for "${activeFilters.search}"` 
              : activeFilters.cuisine 
              ? `${activeFilters.cuisine} Recipes`
              : "Browse Recipes"
            }
          </h1>
          <p className="text-gray-600">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="mb-8">
          <RecipeFilters onFilterChange={handleFilterChange} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-xl h-48 mb-4"></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map((recipe: any) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No recipes found matching your criteria.</p>
            <p className="text-gray-400 mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}