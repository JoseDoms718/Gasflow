import { FaFacebookF } from "react-icons/fa";
import { Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-700 py-6 border-t border-gray-200 mt-6">
      <div className="container mx-auto px-6 text-center">
        
        {/* Socials */}
        <div className="flex justify-center gap-8 pb-2 mb-2">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/MarinduqueSolane"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            <FaFacebookF size={24} />
          </a>

          {/* Phone */}
          <a
            href="tel:+639123456789" // Replace with your main contact number
            className="text-gray-700 hover:text-blue-600 transition"
          >
            <Phone size={24} />
          </a>

          {/* Email */}
          <a
            href="mailto:marinduquesolane@gmail.com"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            <Mail size={24} />
          </a>
        </div>

        {/* Underline */}
        <div className="w-72 border-b-2 border-gray-400 mx-auto mb-4"></div>

        {/* Links */}
        <div className="flex justify-center gap-6 text-sm text-gray-600 mb-4">
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
