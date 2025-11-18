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

  // ───────── FETCH SERVICES ─────────
  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/fetchServices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const normalized = (res.data.services || []).map(s => ({
        ...s,
        image: s.image_url ? `http://localhost:5000${s.image_url}` : null,
      }));
      setServices(normalized);
    } catch (err) {
      console.error(err);
      setServices([]); // fallback
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <section className="bg-white py-12">
      <div className="container mx-auto px-6">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Services</h2>
        <p className="text-gray-600 max-w-2xl mb-8">
          Explore the range of services we offer to ensure you get the best experience from our company.
        </p>

        {/* Carousel */}
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
            {services.length > 0
              ? services.map((service) => (
                <SwiperSlide key={service.id}>
                  <div className="bg-gray-50 rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 overflow-hidden">
                    {/* Service Image */}
                    {service.image ? (
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <Briefcase className="w-12 h-12 text-gray-400" />
                      </div>
                    )}

                    {/* Service Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800">{service.title}</h3>
                      <p className="text-gray-600 text-sm">{service.description}</p>

                      {/* Learn More Button */}
                      <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
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
                    <div className="bg-gray-50 rounded-lg shadow-md border border-gray-200 overflow-hidden h-48 flex items-center justify-center">
                      <Briefcase className="w-12 h-12 text-gray-400" />
                    </div>
                  </SwiperSlide>
                ))}
          </Swiper>

          {/* Custom Navigation Arrows */}
          <div className="custom-swiper-button-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200">
            <span className="text-gray-900 text-3xl font-bold">❮</span>
          </div>
          <div className="custom-swiper-button-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200">
            <span className="text-gray-900 text-3xl font-bold">❯</span>
          </div>
        </div>
      </div>
    </section>
  );
}
