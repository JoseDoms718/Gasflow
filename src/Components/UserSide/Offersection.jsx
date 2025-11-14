import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import axios from "axios";

export default function Offersection() {
  const [banners, setBanners] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);

  const API_URL = "http://localhost:5000/uploads/banners/";

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const res = await axios.get("http://localhost:5000/banners");
      if (res.data.success) {
        setBanners(res.data.banners);
      }
    } catch (err) {
      console.error("Error loading banners:", err.message);
    }
  };

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Special Offers & Discounts
        </h2>

        <p className="text-gray-600 max-w-2xl mb-8">
          Get the best deals on Solane LPG right here in Marinduque!
          Whether you’re refilling your household tank or stocking up for your business,
          our exclusive promos help you save while enjoying the same trusted quality and reliable delivery service.
        </p>

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
            {/* If no banners → show fallback */}
            {banners.length === 0 && (
              <SwiperSlide>
                <div className="w-full h-80 bg-gray-200 flex items-center justify-center rounded-lg shadow-md border">
                  <span className="text-gray-600 text-lg font-medium">
                    No Promo Available — Check Back Soon!
                  </span>
                </div>
              </SwiperSlide>
            )}

            {/* Real banners */}
            {banners.map((banner) => (
              <SwiperSlide key={banner.id}>
                <div
                  className="w-full h-80 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedBanner(banner)}
                >
                  <img
                    src={API_URL + banner.image}
                    className="w-full h-full object-cover"
                    alt="Promo Banner"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation */}
          <div className="custom-swiper-button-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
            <span className="text-gray-900 text-3xl font-bold">❮</span>
          </div>
          <div className="custom-swiper-button-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
            <span className="text-gray-900 text-3xl font-bold">❯</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedBanner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg max-w-lg w-full p-4 shadow-xl relative">

            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
              onClick={() => setSelectedBanner(null)}
            >
              ✕
            </button>

            <img
              src={API_URL + selectedBanner.image}
              className="w-full h-64 object-cover rounded-lg mb-4"
              alt="Banner Image"
            />

            <h3 className="text-2xl font-semibold mb-2">
              {selectedBanner.banner_title}
            </h3>

            <p className="text-gray-700 whitespace-pre-line">
              {selectedBanner.banner_description}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
