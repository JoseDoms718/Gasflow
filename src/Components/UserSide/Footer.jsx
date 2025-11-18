import { FaFacebookF } from "react-icons/fa";
import { Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-700 py-4 md:py-6 border-t border-gray-200 mt-6">
      <div className="container mx-auto px-4 text-center">

        {/* Socials */}
        <div className="flex justify-center gap-6 md:gap-8 pb-2 mb-2">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/MarinduqueSolane"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            <FaFacebookF size={20} className="md:w-6 md:h-6" />
          </a>

          {/* Phone */}
          <a
            href="tel:+639123456789"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            <Phone size={20} className="md:w-6 md:h-6" />
          </a>

          {/* Email */}
          <a
            href="mailto:marinduquesolane@gmail.com"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            <Mail size={20} className="md:w-6 md:h-6" />
          </a>
        </div>

        {/* Underline */}
        <div className="w-48 md:w-72 border-b-2 border-gray-400 mx-auto mb-3 md:mb-4"></div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
          <a href="/about" className="hover:text-blue-600">About</a>
          <a href="/contact" className="hover:text-blue-600">Contact</a>
          <a href="/privacy" className="hover:text-blue-600">Privacy</a>
          <a href="/terms" className="hover:text-blue-600">Terms</a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Solane LPG. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
