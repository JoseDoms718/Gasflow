import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Briefcase } from "lucide-react"; // Placeholder icon

export default function Servicesection() {
  const services = Array(3).fill({
    name: "Service Name",
    description: "Short description about the service provided.",
  });

  return (
    <section className="bg-white py-12">
      <div className="container mx-auto px-6">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Services</h2>
        <p className="text-gray-600 max-w-2xl mb-8">
          Explore the range of services we offer to ensure you get the best
          experience from our company.
        </p>

        {/* Carousel with navigation arrows only */}
        <div className="relative">
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={20}
            slidesPerView={3}
            loop={true}
            navigation={{
              nextEl: ".custom-swiper-button-next",
              prevEl: ".custom-swiper-button-prev",
            }}
            autoplay={{ delay: 5000 }}
            breakpoints={{
              320: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="rounded-lg"
          >
            {services.map((service, index) => (
              <SwiperSlide key={index}>
                <div className="bg-gray-50 rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 overflow-hidden">
                  {/* Placeholder Image */}
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <Briefcase className="w-12 h-12 text-gray-400" />
                  </div>

                  {/* Service Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {service.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {service.description}
                    </p>

                    {/* Learn More Button */}
                    <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                      Learn More
                    </button>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation Arrows */}
          <div className="custom-swiper-button-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200">
            <span className="text-gray-900 text-3xl font-bold">❮</span>
          </div>
          <div className="custom-swiper-button-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200">
            <span className="text-gray-900 text-3xl font-bold">❯</span>
          </div>
        </div>
      </div>
    </section>
  );
}
