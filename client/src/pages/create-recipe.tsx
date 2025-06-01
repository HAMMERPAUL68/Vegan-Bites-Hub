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
import { ArrowLeft, Plus, X } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CreateRecipe() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    cuisineId: "",
    images: [] as File[],
    ingredients: "",
    instructions: "",
    helpfulNotes: "",
    tags: [] as string[],
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

  // Helper functions for managing tags
  const addTag = (tagValue?: string) => {
    const tag = (tagValue || newTag).trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      if (!tagValue) setNewTag("");
    }
  };

  const handleTagInput = (value: string) => {
    // Handle comma-separated tags
    if (value.includes(',')) {
      const tags = value.split(',').map(t => t.trim()).filter(t => t);
      tags.forEach(tag => addTag(tag));
      setNewTag("");
    } else {
      setNewTag(value);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const createRecipeMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/recipes", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Recipe Created!",
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
    
    if (!formData.title || !formData.description || !formData.ingredients || !formData.instructions) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const submitData = new FormData();
    submitData.append("title", formData.title);
    submitData.append("description", formData.description);
    submitData.append("ingredients", formData.ingredients);
    submitData.append("instructions", formData.instructions);
    submitData.append("helpfulNotes", formData.helpfulNotes);
    submitData.append("tags", JSON.stringify(formData.tags));
    
    if (formData.cuisineId) {
      submitData.append("cuisineId", formData.cuisineId);
    }

    // Add images
    formData.images.forEach((file, index) => {
      submitData.append(`images`, file);
    });

    createRecipeMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Share Your Recipe</h1>
            <p className="text-muted-foreground">Add a new vegan recipe to our community</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recipe Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Recipe Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter recipe title"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your recipe"
                    rows={4}
                    required
                  />
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

                <div>
                  <Label htmlFor="images">Recipe Images</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setFormData(prev => ({ ...prev, images: files }));
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload multiple images. The first image will be used as the featured image.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Ingredients */}
              <div>
                <Label className="text-lg font-semibold" htmlFor="ingredients">Ingredients *</Label>
                <Textarea
                  id="ingredients"
                  value={formData.ingredients}
                  onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                  placeholder="List all ingredients with quantities and measurements..."
                  rows={8}
                  className="mt-3"
                  required
                />
              </div>

              <Separator />

              {/* Instructions */}
              <div>
                <Label className="text-lg font-semibold" htmlFor="instructions">Instructions *</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Provide detailed cooking instructions..."
                  rows={10}
                  className="mt-3"
                  required
                />
              </div>

              <Separator />

              {/* Helpful Notes */}
              <div>
                <Label className="text-lg font-semibold" htmlFor="helpful-notes">Helpful Notes</Label>
                <Textarea
                  id="helpful-notes"
                  value={formData.helpfulNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, helpfulNotes: e.target.value }))}
                  placeholder="Any tips, substitutions, or additional notes..."
                  rows={4}
                  className="mt-3"
                />
              </div>

              <Separator />

              {/* Tags */}
              <div>
                <Label className="text-lg font-semibold">Tags</Label>
                <div className="space-y-3 mt-3">
                  <div>
                    <Input
                      value={newTag}
                      onChange={(e) => handleTagInput(e.target.value)}
                      placeholder="Add tags (separate with commas or press Enter)"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={createRecipeMutation.isPending}
                  className="bg-vegan-accent hover:bg-orange-400"
                >
                  {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}