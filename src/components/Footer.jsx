import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">HostKeep</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm">
             <Link to={createPageUrl("Home")} className="hover:text-white transition-colors">
              Home
             </Link>
             <Link to={createPageUrl("Search")} className="hover:text-white transition-colors">
              Browse Properties
             </Link>
             <Link to={createPageUrl("AboutUs")} className="hover:text-white transition-colors">
              About Us
             </Link>
             <Link to={createPageUrl("Subscription")} className="hover:text-white transition-colors">
              Pricing
             </Link>
             <Link to={createPageUrl("LegalCentre")} className="hover:text-white transition-colors">
              Legal
             </Link>
           </div>
          
          <p className="text-sm">
            © {new Date().getFullYear()} HostKeep. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}