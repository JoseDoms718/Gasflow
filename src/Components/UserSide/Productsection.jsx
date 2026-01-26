import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Package, User, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Productsection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(false);
  const [discountTimers, setDiscountTimers] = useState({});
  const navigate = useNavigate();

  const formatPrice = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ───────── FETCH PRODUCTS ─────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let dataToUse = (await axios.get(`${BASE_URL}/products/public/products`, { params: { type: "discounted" } })).data;
        if (!dataToUse?.length) {
          dataToUse = (await axios.get(`${BASE_URL}/products/public/products`, { params: { type: "regular" } })).data;
        }

        const now = new Date();

        const formatted = dataToUse
          .filter((p) => {
            if (!p.discount_until) return true; // regular product
            return new Date(p.discount_until) > now; // only active discounts
          })
          .map((p) => ({
            ...p,
            image_url: p.image_url?.startsWith("http")
              ? p.image_url
              : `${BASE_URL}/products/images/${p.image_url}`,
            seller: {
              name: p.seller_name || "-",
              barangay: p.barangay || "-",
              municipality: p.municipality || "-",
            },
          }));


        setProducts(formatted);
        setShowNavigation(formatted.length > 3);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ───────── DISCOUNT TIMER ─────────
  useEffect(() => {
    const updateTimers = () => {
      const newTimers = {};
      products.forEach((p) => {
        if (!p.discount_until) return;
        const diff = new Date(p.discount_until) - new Date();
        newTimers[p.product_id] =
          diff <= 0
            ? "Discount expired"
            : `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`;
      });
      setDiscountTimers(newTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [products]);

  const handleBuyClick = (product) => {
    if (!localStorage.getItem("token")) return navigate("/login");
    navigate(`/buy/${product.product_id}${product.branch_id ? `?branch_id=${product.branch_id}` : ""}`);
  };

  if (loading) {
    return (
      <section className="bg-gray-900 py-8 text-center text-white">
        <p>Loading products...</p>
      </section>
    );
  }

  // ───────── DISPLAY PRODUCTS WITH PLACEHOLDERS ─────────
  const minPlaceholders = 3;
  const displayProducts = [
    ...products,
    ...Array(Math.max(minPlaceholders - products.length, 0)).fill(0).map((_, i) => ({ placeholder: true, id: `ph-${i}` })),
  ];

  const renderCard = (p) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 flex flex-col h-[350px] md:h-[450px] relative">
      {!p.placeholder && p.discounted_price && (
        <div className="absolute top-2 right-2 z-20">
          <span
            className={`text-xs md:text-sm font-bold px-3 py-1 rounded-full shadow-lg ${p.discount_until ? "bg-red-600 text-white animate-pulse" : "bg-yellow-500 text-gray-900 animate-bounce"
              }`}
          >
            {p.discount_until ? discountTimers[p.product_id] : "Limited Stock"}
          </span>
        </div>
      )}

      <div className="w-full h-36 md:h-48 bg-gray-200 flex items-center justify-center flex-shrink-0">
        {p.placeholder ? <Package className="w-10 h-10 text-gray-400" /> : <img src={p.image_url || ""} alt={p.product_name} className="w-full h-full object-cover" />}
      </div>

      <div className="p-3 md:p-4 flex flex-col flex-grow">
        {p.placeholder ? (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Coming Soon</h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2 flex-grow">Placeholder product description.</p>
            <p className="text-blue-600 font-bold text-base mt-auto">₱0.00</p>
            <button disabled className="mt-3 w-full py-2 rounded-md bg-gray-400 text-gray-200 cursor-not-allowed">Buy Now</button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">{p.product_name}</h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2 flex-grow">{p.product_description || "No description available."}</p>

            <div className="flex items-start justify-between mt-auto mb-2">
              <div className="flex flex-col text-gray-500 text-sm">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{p.seller.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{p.seller.barangay}, {p.seller.municipality}</span>
                </div>
              </div>

              <div className="text-right">
                {p.discounted_price ? (
                  <>
                    <p className="line-through text-gray-500 text-sm">₱{formatPrice(p.price)}</p>
                    <p className="text-green-600 font-bold text-base">₱{formatPrice(p.discounted_price)}</p>
                  </>
                ) : (
                  <p className="text-blue-600 font-bold text-base">₱{formatPrice(p.price)}</p>
                )}
              </div>
            </div>

            <button onClick={() => handleBuyClick(p)} className="mt-3 w-full py-2 rounded-md transition bg-blue-600 text-white hover:bg-blue-700">
              Buy Now
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <section className="bg-gray-900 py-8 md:py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Our Products</h2>
        <p className="text-gray-300 text-sm md:text-base max-w-xl mb-6 md:mb-8">
          Browse our available Solane LPG products and accessories. Get high-quality gas for home or business with trusted service.
        </p>

        <div className="relative">
          <Swiper
            key={displayProducts.length}
            modules={[Navigation]}
            spaceBetween={12}
            slidesPerView={1}
            loop={displayProducts.length > 1}
            navigation={{ nextEl: ".custom-swiper-button-next", prevEl: ".custom-swiper-button-prev" }}
            breakpoints={{ 320: { slidesPerView: 1 }, 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
            className="rounded-lg"
          >
            {displayProducts.map((p) => (
              <SwiperSlide key={p.product_id || p.id}>{renderCard(p)}</SwiperSlide>
            ))}
          </Swiper>

          {showNavigation && (
            <>
              <div className="custom-swiper-button-prev absolute -left-10 md:-left-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-2 md:p-3 rounded-full hover:bg-gray-100 transition duration-300">
                <span className="text-gray-900 text-xl md:text-3xl font-bold">❮</span>
              </div>
              <div className="custom-swiper-button-next absolute -right-10 md:-right-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-2 md:p-3 rounded-full hover:bg-gray-100 transition duration-300">
                <span className="text-gray-900 text-xl md:text-3xl font-bold">❯</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
