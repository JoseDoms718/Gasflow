import AboutBanner from "../../assets/Design/AboutBanner.jpg";

export default function Aboutsection() {
  return (
    <section className="bg-gray-900 py-8 md:py-12">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-6 md:gap-8">

        {/* Image */}
        <div className="flex-1 w-full md:w-1/2">
          <div className="w-full h-48 md:h-64 rounded-lg shadow-lg overflow-hidden">
            <img
              src={AboutBanner}
              alt="About Us Banner"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 w-full md:w-1/2 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-5">About Us</h2>
          <p className="text-gray-300 mb-3 text-sm md:text-base">
            We are dedicated to providing high-quality products and exceptional
            services to our customers. Our commitment to excellence ensures that
            every experience with us is reliable, efficient, and satisfying.
          </p>
          <p className="text-gray-300 mb-5 text-sm md:text-base">
            With a passionate team and years of expertise, we aim to continuously
            innovate and improve, delivering solutions that meet the evolving
            needs of our clients.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm md:text-base transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
