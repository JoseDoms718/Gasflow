import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Briefcase } from "lucide-react"; // Fallback icon
import axios from "axios";

const API_URL = "http://localhost:5000/services";

export default function Servicesection() {
  const [services, setServices] = useState([]);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/fetchServices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const normalized = (res.data.services || []).map((s) => ({
        ...s,
        image: s.image_url ? `http://localhost:5000${s.image_url}` : null,
      }));
      setServices(normalized);
    } catch (err) {
      console.error(err);
      setServices([]);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <section className="bg-white py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Our Services</h2>
        <p className="text-gray-600 text-sm md:text-base max-w-xl mb-6 md:mb-8">
          Explore the range of services we offer to ensure you get the best experience from our company.
        </p>

        {/* Carousel */}
        <div className="relative">
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={12}
            slidesPerView={1}
            loop={services.length > 1}
            autoplay={{ delay: 5000 }}
            navigation={{
              nextEl: ".custom-swiper-button-next",
              prevEl: ".custom-swiper-button-prev",
            }}
            breakpoints={{
              320: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="rounded-lg"
          >
            {services.length > 0
              ? services.map((service) => (
                <SwiperSlide key={service.id}>
                  <div className="bg-gray-50 rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 overflow-hidden flex flex-col h-[300px] md:h-[350px]">
                    {/* Service Image */}
                    {service.image ? (
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-36 md:h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-36 md:h-48 bg-gray-200 flex items-center justify-center">
                        <Briefcase className="w-10 h-10 text-gray-400" />
                      </div>
                    )}

                    {/* Service Info */}
                    <div className="p-3 md:p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
                        {service.title || "Service Title"}
                      </h3>
                      <p className="text-gray-600 text-sm md:text-sm line-clamp-2 flex-grow">
                        {service.description || "No description available."}
                      </p>
                      <button className="mt-3 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
                        Learn More
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))
              : Array(3)
                .fill(0)
                .map((_, i) => (
                  <SwiperSlide key={i}>
                    <div className="bg-gray-50 rounded-lg shadow-md border border-gray-200 overflow-hidden h-[300px] md:h-[350px] flex items-center justify-center">
                      <Briefcase className="w-10 h-10 text-gray-400" />
                    </div>
                  </SwiperSlide>
                ))}
          </Swiper>

          {/* Navigation Buttons (hidden on mobile) */}
          <div className="hidden md:block custom-swiper-button-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200 transition">
            <span className="text-gray-900 text-3xl font-bold">❮</span>
          </div>
          <div className="hidden md:block custom-swiper-button-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200 transition">
            <span className="text-gray-900 text-3xl font-bold">❯</span>
          </div>
        </div>
      </div>
    </section>
  );
}
