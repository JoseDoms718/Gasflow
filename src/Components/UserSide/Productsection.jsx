import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules"; // removed Autoplay
import "swiper/css";
import "swiper/css/navigation";
import { Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Productsection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(false);
  const navigate = useNavigate();

  const formatPrice = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("📡 Checking discounted products...");

        const discountedRes = await axios.get(
          "http://localhost:5000/products/public/products",
          { params: { type: "discounted" } }
        );

        let dataToUse = discountedRes.data;

        if (!dataToUse || dataToUse.length === 0) {
          console.log("⚠️ No discounted products found, loading regular ones...");
          const regularRes = await axios.get(
            "http://localhost:5000/products/public/products",
            { params: { type: "regular" } }
          );
          dataToUse = regularRes.data;
        } else {
          console.log("✅ Discounted products found!");
        }

        const formatted = (dataToUse || []).map((p) => {
          let imageUrl = p.image_url || null;
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `http://localhost:5000/products/images/${imageUrl}`;
          }
          return {
            ...p,
            image_url: imageUrl,
          };
        });

        setProducts(formatted);
        setShowNavigation(formatted.length > 3);
      } catch (err) {
        console.error("❌ Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleBuyClick = (product) => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate(`/buy/${product.product_id}`);
    } else {
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <section className="bg-gray-900 py-12 text-center text-white">
        <p>Loading products...</p>
      </section>
    );
  }

  return (
    <section className="bg-gray-900 py-12">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-white mb-2">Our Products</h2>
        <p className="text-gray-300 max-w-2xl mb-8">
          Browse our available Solane LPG products and accessories. Get
          high-quality gas for home or business with trusted service.
        </p>

        <div className="relative">
          <Swiper
            key={products.length}
            modules={[Navigation]}
            spaceBetween={20}
            slidesPerView={3}
            loop={products.length > 3}
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
            {products.length === 0 ? (
              <SwiperSlide>
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500">No products available.</p>
                </div>
              </SwiperSlide>
            ) : (
              products.map((p, i) => (
                <SwiperSlide key={i}>
                  <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 overflow-hidden flex flex-col">
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.product_name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-gray-400" />
                      )}
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {p.product_name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {p.product_description || "No description available."}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        {p.product_type === "discounted" && p.discounted_price ? (
                          <div>
                            <p className="text-gray-500 line-through text-sm">
                              ₱{formatPrice(p.price)}
                            </p>
                            <p className="text-green-600 font-bold text-lg">
                              ₱{formatPrice(p.discounted_price)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-blue-600 font-bold text-lg">
                            ₱{formatPrice(p.price)}
                          </p>
                        )}

                        <span
                          className={`text-sm font-medium px-2 py-1 rounded ${p.stock > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                            }`}
                        >
                          {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                        </span>
                      </div>

                      <button
                        onClick={() => handleBuyClick(p)}
                        disabled={p.stock <= 0}
                        className={`mt-4 w-full py-2 rounded-lg transition ${p.stock > 0
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-400 text-gray-200 cursor-not-allowed"
                          }`}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))
            )}
          </Swiper>

          {showNavigation && (
            <>
              <div className="custom-swiper-button-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100 transition-opacity duration-300">
                <span className="text-gray-900 text-3xl font-bold">❮</span>
              </div>
              <div className="custom-swiper-button-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100 transition-opacity duration-300">
                <span className="text-gray-900 text-3xl font-bold">❯</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
