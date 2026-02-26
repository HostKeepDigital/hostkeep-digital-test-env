import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Add meta tags to prevent search engine indexing
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

    return () => {
      document.head.removeChild(metaRobots);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Icon */}
        <div className="text-8xl mb-6 animate-pulse">
          🚧
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Private Beta
        </h1>

        {/* Description */}
        <div className="space-y-4">
          <p className="text-xl md:text-2xl text-gray-300">
            This application is currently under development
          </p>
          <p className="text-lg text-gray-400">
            We're working hard to build something great. This app is not publicly accessible yet and is only available to authorized users during our private testing phase.
          </p>
        </div>

        {/* Decorative Line */}
        <div className="w-24 h-1 bg-gradient-to-r from-teal-500 to-teal-400 mx-auto rounded-full"></div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center">
        <p className="text-sm text-gray-500">
          Have access credentials?{" "}
          <a 
            href="mailto:admin@hostkeepdigital.co.uk" 
            className="text-teal-400 hover:text-teal-300 underline transition-colors"
          >
            Contact the developer
          </a>
        </p>
      </footer>
    </div>
  );
}