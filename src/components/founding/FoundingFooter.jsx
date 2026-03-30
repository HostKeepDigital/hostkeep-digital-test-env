import { Facebook, Instagram, Twitter } from "lucide-react";

const SOCIALS = [
  { icon: Facebook,  href: "https://facebook.com/hostkeep",  label: "Facebook"  },
  { icon: Instagram, href: "https://instagram.com/hostkeep", label: "Instagram" },
  { icon: Twitter,   href: "https://twitter.com/hostkeep",   label: "Twitter"   },
];

export default function FoundingFooter() {
  return (
    <footer className="border-t border-gray-100 py-8 mt-4">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-400">© HostKeep 2026. All rights reserved.</p>
        <div className="flex items-center gap-4">
          {SOCIALS.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}