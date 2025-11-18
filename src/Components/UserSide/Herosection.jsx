import HerosecImg from "../../assets/Design/HerosecImg.png";

export default function HeroSection() {
  return (
    <section className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col-reverse md:flex-row items-center gap-6 md:gap-8">

        {/* Text content */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-bold leading-snug mb-3 md:mb-4">
            WELCOME TO GASFLOW
          </h1>
          <p className="text-sm md:text-base text-gray-300 mb-4 md:mb-6">
            GASFLOW is the all-in-one web-based hub for Solane LPG in Marinduque — built to work on any device, even lower-end phones. Customers can easily order LPG products, track deliveries, and get refills. Retailers have dedicated tools to manage sales, monitor inventory, and streamline operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 md:py-3 px-5 md:px-6 rounded-md md:rounded-lg shadow-md transition duration-300">
              Order Now!
            </button>
            <button className="bg-transparent border border-white hover:bg-white hover:text-gray-900 font-semibold py-2 md:py-3 px-5 md:px-6 rounded-md md:rounded-lg transition duration-300">
              Learn More
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex justify-center">
          <img
            src={HerosecImg}
            alt="LPG Tank"
            className="max-w-xs sm:max-w-sm md:max-w-md h-auto"
          />
        </div>
      </div>
    </section>
  );
}
