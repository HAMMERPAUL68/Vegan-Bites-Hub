import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Leaf, Search, Menu, Plus, Settings, LogOut, User, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoPath from "@assets/VEGAN BITES HUB MAIN LOGO  350 x 100 Right.png";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch pending recipes count for admin notification badge
  const { data: pendingRecipes } = useQuery({
    queryKey: ["/api/admin/recipes"],
    enabled: user?.role === "admin",
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pendingCount = pendingRecipes?.length || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Fetch cuisines for categories dropdown
  const { data: cuisines = [] } = useQuery({
    queryKey: ["/api/cuisines"],
    queryFn: async () => {
      const response = await fetch("/api/cuisines");
      if (!response.ok) throw new Error("Failed to fetch cuisines");
      return response.json();
    },
  });

  const Navigation = ({ mobile = false }) => (
    <nav className={`${mobile ? "flex flex-col space-y-4" : "hidden md:flex items-center space-x-6"}`}>
      <Link href="/browse" className="text-neutral-600 hover:text-vegan-primary transition-colors">
        Browse
      </Link>
      
      {mobile ? (
        <div className="flex flex-col space-y-2">
          <span className="text-neutral-600 font-medium">Categories</span>
          {cuisines.slice(0, 8).map((cuisine: any) => (
            <Link 
              key={cuisine.id} 
              href={`/browse?cuisine=${encodeURIComponent(cuisine.name)}`}
              className="text-neutral-500 hover:text-vegan-primary transition-colors pl-4"
            >
              {cuisine.name}
            </Link>
          ))}
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger className="text-neutral-600 hover:text-vegan-primary transition-colors">
            Categories
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {cuisines.map((cuisine: any) => (
              <DropdownMenuItem 
                key={cuisine.id}
                onClick={() => setLocation(`/browse?cuisine=${encodeURIComponent(cuisine.name)}`)}
              >
                {cuisine.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {isAuthenticated && (
        <Link href="/profile" className="text-neutral-600 hover:text-vegan-primary transition-colors">
          My Recipes
        </Link>
      )}
    </nav>
  );

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex-shrink-0 flex items-center cursor-pointer">
              <img src={logoPath} alt="Vegan Bites Club" className="h-8" />
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8 hidden sm:block">
            <form onSubmit={handleSearch} className="relative">
              <Input 
                type="text" 
                placeholder="Search vegan recipes..." 
                className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vegan-secondary focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </form>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Navigation />
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {(user?.role === "home_cook" || user?.role === "admin") && (
                  <Link href="/create-recipe">
                    <Button className="bg-vegan-accent text-white px-4 py-2 rounded-lg hover:bg-orange-400 transition-colors">
                      <Plus className="w-4 h-4 mr-2" />
                      Share Recipe
                    </Button>
                  </Link>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || "User"} />
                        <AvatarFallback>
                          {user?.firstName?.[0] || user?.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {user?.role === "admin" && pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">
                          {user?.firstName ? `${user.firstName} ${user?.lastName || ""}` : user?.email}
                        </p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user?.role?.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = "/profile"}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <DropdownMenuItem onClick={() => window.location.href = "/admin"}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => window.location.href = "/api/logout"}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button 
                  className="bg-vegan-primary text-white px-4 py-2 rounded-lg hover:bg-vegan-secondary transition-colors"
                  onClick={() => window.location.href = "/auth"}
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="md:hidden p-2">
                <Menu className="text-neutral-600 w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-6 mt-6">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="relative">
                  <Input 
                    type="text" 
                    placeholder="Search vegan recipes..." 
                    className="w-full px-4 py-2 pl-10 pr-4"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </form>

                {/* Mobile Navigation */}
                <Navigation mobile />

                {/* Mobile Auth */}
                {isAuthenticated ? (
                  <div className="flex flex-col space-y-4 pt-4 border-t">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || "User"} />
                          <AvatarFallback>
                            {user?.firstName?.[0] || user?.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {user?.role === "admin" && pendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {pendingCount > 9 ? "9+" : pendingCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user?.firstName ? `${user.firstName} ${user?.lastName || ""}` : user?.email}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {user?.role?.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    
                    {(user?.role === "home_cook" || user?.role === "admin") && (
                      <Link href="/create-recipe">
                        <Button 
                          className="w-full bg-vegan-accent text-white hover:bg-orange-400"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Share Recipe
                        </Button>
                      </Link>
                    )}
                    
                    {user?.role === "admin" && (
                      <Link href="/admin">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Button>
                      </Link>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = "/api/logout"}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4 pt-4 border-t">
                    <Button 
                      className="w-full bg-vegan-primary text-white hover:bg-vegan-secondary"
                      onClick={() => window.location.href = "/api/login"}
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
