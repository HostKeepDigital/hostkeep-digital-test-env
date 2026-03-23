import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function FoundingThankYou() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full text-center py-16 px-8 bg-teal-50 rounded-2xl border-2 border-teal-200"
      >
        <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">You're on the list!</h1>
        <p className="text-lg text-gray-600 mb-4">We'll be in touch within 24 hours.</p>
        <p className="text-gray-500 leading-relaxed">
          We're reviewing your application now. You'll receive an email to let you know if you've
          made it into the beta or been added to our waitlist.
          <br /><br />
          You don't need to do anything else.
        </p>
      </motion.div>
    </div>
  );
}