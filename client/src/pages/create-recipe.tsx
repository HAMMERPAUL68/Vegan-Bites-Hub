import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, Plus, X, Clock, Users, ChefHat } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CreateRecipe() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    difficulty: "",
    cuisineId: "",
    featuredImage: "",
    ingredients: [""],
    instructions: [""],
    tags: [],
  });

  const [newTag, setNewTag] = useState("");

  // Fetch available cuisines
  const { data: cuisines = [], isLoading: cuisinesLoading } = useQuery({
    queryKey: ["/api/cuisines"],
    queryFn: async () => {
      const response = await fetch("/api/cuisines");
      if (!response.ok) throw new Error("Failed to fetch cuisines");
      return response.json();
    },
  });

  // Redirect if not authorized
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== "home_cook" && user?.role !== "admin"))) {
      toast({
        title: "Unauthorized",
        description: "You need to be a home cook to create recipes.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

  const createRecipeMutation = useMutation({
    mutationFn: async (recipeData: any) => {
      await apiRequest("POST", "/api/recipes", recipeData);
    },
    onSuccess: () => {
      toast({
        title: "Recipe created!",
        description: "Your recipe has been submitted for review.",
      });
      setLocation("/");
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
        description: "Failed to create recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.description || !formData.prepTime || !formData.cookTime || !formData.servings) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const ingredients = formData.ingredients.filter(i => i.trim());
    const instructions = formData.instructions.filter(i => i.trim());

    if (ingredients.length === 0 || instructions.length === 0) {
      toast({
        title: "Missing content",
        description: "Please add at least one ingredient and one instruction.",
        variant: "destructive",
      });
      return;
    }

    const recipeData = {
      ...formData,
      prepTime: parseInt(formData.prepTime),
      cookTime: parseInt(formData.cookTime),
      servings: parseInt(formData.servings),
      ingredients,
      instructions,
      galleryImages: [], // TODO: Add gallery image upload
    };

    createRecipeMutation.mutate(recipeData);
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, ""]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === index ? value : ing)
    }));
  };

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, ""]
    }));
  };

  const removeInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => i === index ? value : inst)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-vegan-primary">Share Your Vegan Recipe</CardTitle>
            <p className="text-gray-600">Create a delicious vegan recipe to share with the community</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Recipe Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter recipe title"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your recipe"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="prep-time">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Prep Time (minutes) *
                  </Label>
                  <Input
                    id="prep-time"
                    type="number"
                    value={formData.prepTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, prepTime: e.target.value }))}
                    placeholder="15"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cook-time">
                    <ChefHat className="w-4 h-4 inline mr-2" />
                    Cook Time (minutes) *
                  </Label>
                  <Input
                    id="cook-time"
                    type="number"
                    value={formData.cookTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, cookTime: e.target.value }))}
                    placeholder="30"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="servings">
                    <Users className="w-4 h-4 inline mr-2" />
                    Servings *
                  </Label>
                  <Input
                    id="servings"
                    type="number"
                    value={formData.servings}
                    onChange={(e) => setFormData(prev => ({ ...prev, servings: e.target.value }))}
                    placeholder="4"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Select 
                    value={formData.cuisineId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, cuisineId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={cuisinesLoading ? "Loading cuisines..." : "Select cuisine"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cuisines.map((cuisine: { id: number; name: string }) => (
                        <SelectItem key={cuisine.id} value={cuisine.id.toString()}>
                          {cuisine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="featured-image">Featured Image URL</Label>
                  <Input
                    id="featured-image"
                    type="url"
                    value={formData.featuredImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <Separator />

              {/* Ingredients */}
              <div>
                <Label className="text-lg font-semibold">Ingredients *</Label>
                <div className="space-y-3 mt-3">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ingredient}
                        onChange={(e) => updateIngredient(index, e.target.value)}
                        placeholder="e.g., 1 cup quinoa, rinsed"
                        className="flex-1"
                      />
                      {formData.ingredients.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addIngredient}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ingredient
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Instructions */}
              <div>
                <Label className="text-lg font-semibold">Instructions *</Label>
                <div className="space-y-3 mt-3">
                  {formData.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-vegan-primary text-white rounded-full flex items-center justify-center text-sm font-medium mt-1">
                        {index + 1}
                      </div>
                      <Textarea
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        placeholder="Describe this step"
                        rows={2}
                        className="flex-1"
                      />
                      {formData.instructions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeInstruction(index)}
                          className="mt-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addInstruction}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div>
                <Label className="text-lg font-semibold">Tags</Label>
                <p className="text-sm text-gray-600 mb-3">Add tags to help people find your recipe</p>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g., gluten-free, high-protein"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="bg-vegan-primary text-white hover:bg-vegan-secondary"
                  disabled={createRecipeMutation.isPending}
                >
                  {createRecipeMutation.isPending ? "Creating..." : "Share Recipe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
