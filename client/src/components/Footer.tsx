import logoPath from "@assets/VEGAN BITES HUB MAIN LOGO  350 x 100 Right.png";

export default function Footer() {
  return (
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
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Recipe Reviews</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Food Blog</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Report Issue</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Feedback</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-300">
          <p>&copy; {new Date().getFullYear()} Vegan Bites Club. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </div>
    </footer>
  );
}