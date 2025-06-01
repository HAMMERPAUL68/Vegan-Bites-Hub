import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, Check, X, Eye, Clock, Users, ChefHat, Upload, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      toast({
        title: "Unauthorized",
        description: "Admin access required.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

  const { data: pendingRecipes = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["/api/admin/recipes"],
    queryFn: async () => {
      const response = await fetch("/api/admin/recipes");
      if (!response.ok) throw new Error("Failed to fetch pending recipes");
      return response.json();
    },
    enabled: !!user && user.role === "admin",
  });

  const { data: allRecipes = [], isLoading: allRecipesLoading } = useQuery({
    queryKey: ["/api/recipes", "all"],
    queryFn: async () => {
      const response = await fetch("/api/recipes?isApproved=false");
      if (!response.ok) throw new Error("Failed to fetch all recipes");
      return response.json();
    },
    enabled: !!user && user.role === "admin",
  });

  const approveMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      await apiRequest("PATCH", `/api/recipes/${recipeId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Recipe approved",
        description: "The recipe has been approved and is now visible to all users.",
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
        description: "Failed to approve recipe",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      await apiRequest("DELETE", `/api/recipes/${recipeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Recipe deleted",
        description: "The recipe has been removed.",
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

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to import CSV: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "CSV Import Complete",
        description: `Successfully imported ${result.success} recipes. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
      });
      setSelectedFile(null);
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
        title: "Import Failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
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

  const RecipeCard = ({ recipe, showActions = true }: { recipe: any; showActions?: boolean }) => (
    <Card className="overflow-hidden">
      <div className="relative">
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
        <div className="absolute top-3 left-3">
          <Badge variant={recipe.isApproved ? "default" : "secondary"}>
            {recipe.isApproved ? "Approved" : "Pending"}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{recipe.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
        
        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="text-yellow-400">★</span>
            <span className="ml-1">{recipe.avgRating.toFixed(1)} ({recipe.reviewCount})</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-6 h-6 rounded-full bg-vegan-primary flex items-center justify-center mr-2">
              <span className="text-white text-xs font-medium">
                {recipe.author.firstName?.[0] || recipe.author.email?.[0] || "U"}
              </span>
            </div>
            <span>
              {recipe.author.firstName ? `${recipe.author.firstName} ${recipe.author.lastName || ""}` : recipe.author.email}
            </span>
          </div>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {recipe.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{recipe.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {showActions && (
          <div className="flex space-x-2">
            <Link href={`/recipe/${recipe.id}`}>
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
            
            {!recipe.isApproved && (
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => approveMutation.mutate(recipe.id)}
                disabled={approveMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to delete this recipe?")) {
                  deleteMutation.mutate(recipe.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-vegan-primary mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage recipes and moderate content</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-8">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingRecipes.length})
            </TabsTrigger>
            <TabsTrigger value="all">All Recipes</TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Import CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {pendingLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-xl h-48 mb-4"></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : pendingRecipes.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-gray-600">No recipes pending approval at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRecipes.map((recipe: any) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            {allRecipesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-xl h-48 mb-4"></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allRecipes.map((recipe: any) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5" />
                  Import Recipes from CSV
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Upload a CSV file with your recipe data. The system will automatically upload images to AWS S3 and process the recipes.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CSV Format Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Required CSV Format:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>Country:</strong> Cuisine type (e.g., Italian, Mexican)</div>
                    <div><strong>Recipe Title:</strong> Name of the recipe</div>
                    <div><strong>Intro:</strong> Recipe description</div>
                    <div><strong>Ingredients:</strong> List of ingredients (one per line)</div>
                    <div><strong>Method:</strong> Cooking instructions (one step per line)</div>
                    <div><strong>Helpful Notes:</strong> Additional tips or notes</div>
                    <div><strong>Image url:</strong> URL to the recipe image</div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <Label htmlFor="csvFile">Select CSV File</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Label 
                      htmlFor="csvFile" 
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <FileText className="w-12 h-12 text-gray-400" />
                      <span className="text-lg font-medium text-gray-700">
                        {selectedFile ? selectedFile.name : "Choose CSV file"}
                      </span>
                      <span className="text-sm text-gray-500">
                        Click to browse or drag and drop
                      </span>
                    </Label>
                  </div>
                  
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">{selectedFile.name}</span>
                        <span className="text-xs text-green-600">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button
                        onClick={handleImport}
                        disabled={importMutation.isPending}
                        className="bg-vegan-primary hover:bg-vegan-primary/90"
                      >
                        {importMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Recipes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Import Results */}
                {importResult && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Import Results</h4>
                      <div className="text-sm text-green-800 space-y-1">
                        <div><strong>Successfully imported:</strong> {importResult.success} recipes</div>
                        {importResult.errors.length > 0 && (
                          <div><strong>Errors:</strong> {importResult.errors.length}</div>
                        )}
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-2">Import Errors</h4>
                        <div className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                          {importResult.errors.map((error: string, index: number) => (
                            <div key={index}>• {error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Important Notes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Important Notes:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Images will be automatically uploaded to AWS S3</li>
                    <li>All imported recipes will need admin approval before being visible</li>
                    <li>Large CSV files may take a few minutes to process</li>
                    <li>Make sure your image URLs are publicly accessible</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
