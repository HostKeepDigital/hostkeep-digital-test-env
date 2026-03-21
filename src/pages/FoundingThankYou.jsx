import { motion } from "framer-motion";
import { CheckCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function FoundingThankYou() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full text-center py-16 px-8 bg-teal-50 rounded-2xl border-2 border-teal-200"
      >
        <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank you for registering</h1>
        <p className="text-gray-600 mb-6">
          Please check your inbox for a confirmation email from{" "}
          <a href="mailto:Hello@hostkeepdigital.co.uk" className="text-teal-600 font-medium">
            Hello@hostkeepdigital.co.uk
          </a>
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
          <Mail className="w-4 h-4" />
          <span>Don't forget to check your spam folder</span>
        </div>
        <Link to="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </motion.div>
    </div>
  );
}