import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Tag } from "lucide-react"; // Icon for placeholders

export default function Offersection() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="container mx-auto px-6">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Special Offers & Discounts
        </h2>

        {/* Context Text */}
        <p className="text-gray-600 max-w-2xl mb-8">
          Get the best deals on Solane LPG right here in Marinduque!
          Whether you’re refilling your household tank or stocking up for your business,
          our exclusive promos help you save while enjoying the same trusted quality and reliable delivery service.
        </p>

        {/* Carousel */}
        <div className="relative">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            loop={true}
            navigation={{
              nextEl: ".custom-swiper-button-next",
              prevEl: ".custom-swiper-button-prev",
            }}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4000 }}
            className="rounded-lg shadow-lg"
          >
            {/* Placeholder Slides */}
            {[1, 2, 3].map((_, index) => (
              <SwiperSlide key={index}>
                <div className="w-full h-80 bg-gray-200 flex flex-col items-center justify-center rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-300">
                  <Tag className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-gray-600 text-lg font-medium">
                    No Promo Available
                  </span>
                  <span className="text-gray-400 text-sm">
                    Check back soon for new offers
                  </span>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation Arrows */}
          <div className="custom-swiper-button-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
            <span className="text-gray-900 text-3xl font-bold">❮</span>
          </div>
          <div className="custom-swiper-button-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
            <span className="text-gray-900 text-3xl font-bold">❯</span>
          </div>
        </div>
      </div>
    </section>
  );
}
