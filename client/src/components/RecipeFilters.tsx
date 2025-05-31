import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Grid, List, Filter, X } from "lucide-react";

interface RecipeFiltersProps {
  onFilterChange?: (filters: FilterState) => void;
}

interface FilterState {
  search: string;
  cuisine: string;
  difficulty: string;
  sortBy: string;
  tags: string[];
}

const cuisineOptions = [
  "Mediterranean",
  "Asian", 
  "Mexican",
  "Italian",
  "Indian",
  "Middle Eastern",
  "American",
  "French",
  "Thai",
  "Japanese"
];

const popularTags = [
  "gluten-free",
  "high-protein", 
  "quick-easy",
  "comfort-food",
  "raw",
  "oil-free",
  "nut-free",
  "soy-free",
  "low-carb",
  "breakfast",
  "dessert",
  "soup",
  "salad",
  "pasta"
];

export default function RecipeFilters({ onFilterChange }: RecipeFiltersProps) {
  const [location, setLocation] = useLocation();
  const [isGridView, setIsGridView] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    cuisine: "",
    difficulty: "",
    sortBy: "newest",
    tags: []
  });

  // Parse URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || "";
    const cuisine = urlParams.get('cuisine') || "";
    const difficulty = urlParams.get('difficulty') || "";
    const sortBy = urlParams.get('sortBy') || "newest";
    const tags = urlParams.get('tags')?.split(',').filter(Boolean) || [];

    setFilters({ search, cuisine, difficulty, sortBy, tags });
  }, [location]);

  // Update URL and notify parent when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.cuisine) params.set('cuisine', filters.cuisine);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.sortBy !== "newest") params.set('sortBy', filters.sortBy);
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));

    const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
    
    if (newUrl !== window.location.pathname + window.location.search) {
      window.history.replaceState({}, '', newUrl);
    }

    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  const updateFilter = (key: keyof FilterState, value: string | string[]) => {
    if (key === 'cuisine' && value === 'all') value = '';
    if (key === 'difficulty' && value === 'all') value = '';
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilter('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      cuisine: "",
      difficulty: "",
      sortBy: "newest",
      tags: []
    });
  };

  const hasActiveFilters = filters.search || filters.cuisine || filters.difficulty || filters.sortBy !== "newest" || filters.tags.length > 0;

  return (
    <div className="space-y-4">
      {/* Main Filter Bar */}
      <Card className="bg-neutral-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search recipes..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-neutral-600">Filter by:</span>
              
              <Select value={filters.cuisine} onValueChange={(value) => updateFilter('cuisine', value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Cuisines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cuisines</SelectItem>
                  {cuisineOptions.map(cuisine => (
                    <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.difficulty} onValueChange={(value) => updateFilter('difficulty', value)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Sort by: Newest</SelectItem>
                  <SelectItem value="rating">Sort by: Rating</SelectItem>
                  <SelectItem value="popular">Sort by: Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle & Advanced Filters */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={showAdvancedFilters ? "bg-gray-200" : ""}
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>

              <div className="flex items-center gap-1 border rounded-lg p-1">
                <span className="text-sm text-neutral-600 mr-2">View:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsGridView(true)}
                  className={`p-2 ${isGridView ? "bg-white shadow-sm" : ""}`}
                >
                  <Grid className={`w-4 h-4 ${isGridView ? "text-vegan-primary" : "text-gray-400"}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsGridView(false)}
                  className={`p-2 ${!isGridView ? "bg-white shadow-sm" : ""}`}
                >
                  <List className={`w-4 h-4 ${!isGridView ? "text-vegan-primary" : "text-gray-400"}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-neutral-600">Active filters:</span>
              
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{filters.search}"
                  <button onClick={() => updateFilter('search', '')} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {filters.cuisine && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.cuisine}
                  <button onClick={() => updateFilter('cuisine', '')} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {filters.difficulty && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.difficulty}
                  <button onClick={() => updateFilter('difficulty', '')} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {filters.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Popular Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(tag => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => filters.tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                      className={`text-xs ${
                        filters.tags.includes(tag) 
                          ? "bg-vegan-primary text-white border-vegan-primary hover:bg-vegan-secondary" 
                          : "hover:border-vegan-primary hover:text-vegan-primary"
                      }`}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
