import { Image as ImageIcon } from "lucide-react"; // can be removed now
import AboutBanner from "../../assets/Design/AboutBanner.jpg"; // ✅ import your banner

export default function Aboutsection() {
  return (
    <section className="bg-gray-900 py-16">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
        
        {/* Actual Image */}
        <div className="flex-1">
          <div className="w-full h-[400px] rounded-xl shadow-lg overflow-hidden">
            <img
              src={AboutBanner}
              alt="About Us Banner"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 text-white">
          <h2 className="text-4xl font-bold mb-6">About Us</h2>
          <p className="text-gray-300 mb-4">
            We are dedicated to providing high-quality products and exceptional
            services to our customers. Our commitment to excellence ensures that
            every experience with us is reliable, efficient, and satisfying.
          </p>
          <p className="text-gray-300 mb-6">
            With a passionate team and years of expertise, we aim to continuously
            innovate and improve, delivering solutions that meet the evolving
            needs of our clients.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
