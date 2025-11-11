import HerosecImg from "../../assets/Design/HerosecImg.png";

export default function HeroSection() {
  return (
    <section className="bg-gray-900 text-white">
      <div className="item-center container mx-auto px-6 py-16 flex h-dvh flex-col-reverse md:flex-row items-center gap-8">
        {/* Text content */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
            WELCOME TO GASFLOW
          </h1>
          <p className="text-lg text-gray-300 mb-6">
            GASFLOW is the all-in-one web-based hub for Solane LPG in Marinduque — built to work on any device, even lower-end phones. Customers can easily order LPG products, track deliveries, and get refills. Retailers have dedicated tools to manage sales, monitor inventory, and streamline operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-300">
              Order Now!
            </button>
            <button className="bg-transparent border border-white hover:bg-white hover:text-gray-900 font-semibold py-3 px-6 rounded-lg transition duration-300">
              Learn More
            </button>
          </div>
        </div>

        {/* Bigger Image */}
        <div className="flex-1 flex justify-center">
          <img
            src={HerosecImg}
            alt="LPG Tank"
            className="max-w-sm md:max-w-md h-auto"
          />
        </div>
      </div>
    </section>
  );
}
