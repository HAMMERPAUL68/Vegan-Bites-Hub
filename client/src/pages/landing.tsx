import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import RecipeFilters from "@/components/RecipeFilters";
import RecipeCard from "@/components/RecipeCard";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Users, Star, ChefHat } from "lucide-react";
import logoPath from "@assets/VEGAN BITES HUB MAIN LOGO  350 x 100 Right.png";

export default function Landing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["/api/recipes"],
    queryFn: async () => {
      const response = await fetch("/api/recipes?isApproved=true&sortBy=rating");
      if (!response.ok) throw new Error("Failed to fetch recipes");
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-vegan-primary to-vegan-secondary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Discover Amazing <span className="text-vegan-accent">Vegan Recipes</span>
              </h1>
              <p className="text-xl mb-8 opacity-90">
                Join our community of passionate plant-based cooks. Share, discover, and create delicious vegan recipes together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="bg-vegan-accent text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-400 transition-colors"
                  onClick={() => {
                    document.getElementById('recipes-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Explore Recipes
                </Button>
                <Button 
                  variant="outline"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-vegan-primary transition-colors"
                  onClick={() => window.location.href = "/api/login"}
                >
                  Join Community
                </Button>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Colorful vegan dishes" 
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
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

      {/* Footer */}
      <footer className="bg-vegan-primary text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src={logoPath} alt="Vegan Bites Club" className="h-6 brightness-0 invert" />
              </div>
              <p className="text-gray-300 text-sm">
                A community-driven platform for sharing delicious vegan recipes and connecting plant-based food lovers worldwide.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Explore</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Browse Recipes</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Categories</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Popular Recipes</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">New Recipes</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Join Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Share Recipe</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Guidelines</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <div className="flex space-x-4 mb-4">
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <i className="fab fa-facebook text-xl"></i>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <i className="fab fa-instagram text-xl"></i>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <i className="fab fa-twitter text-xl"></i>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <i className="fab fa-pinterest text-xl"></i>
                </a>
              </div>
              <p className="text-gray-300 text-sm">Follow us for daily recipe inspiration!</p>
            </div>
          </div>
          
          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-sm text-gray-300">
            <p>&copy; {new Date().getFullYear()} Vegan Bites Club. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
