import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
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
        const discountedRes = await axios.get(
          "http://localhost:5000/products/public/products",
          { params: { type: "discounted" } }
        );

        let dataToUse = discountedRes.data;
        if (!dataToUse || dataToUse.length === 0) {
          const regularRes = await axios.get(
            "http://localhost:5000/products/public/products",
            { params: { type: "regular" } }
          );
          dataToUse = regularRes.data;
        }

        const formatted = (dataToUse || []).map((p) => {
          let imageUrl = p.image_url || null;
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `http://localhost:5000/products/images/${imageUrl}`;
          }
          return { ...p, image_url: imageUrl };
        });

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
      <section className="bg-gray-900 py-8 text-center text-white">
        <p>Loading products...</p>
      </section>
    );
  }

  const minSlides = 6;
  const displayProducts = [...products];
  while (displayProducts.length < minSlides) {
    displayProducts.push({ placeholder: true });
  }

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
            {displayProducts.map((p, i) => (
              <SwiperSlide key={i}>
                <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 flex flex-col h-[350px] md:h-[450px]">
                  <div className="w-full h-36 md:h-48 bg-gray-200 flex items-center justify-center flex-shrink-0">
                    {p.placeholder ? (
                      <Package className="w-10 h-10 text-gray-400" />
                    ) : p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-gray-400" />
                    )}
                  </div>

                  <div className="p-3 md:p-4 flex flex-col flex-grow">
                    {p.placeholder ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          Coming Soon
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2 flex-grow">
                          Placeholder product description.
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <p className="text-blue-600 font-bold text-base">₱0.00</p>
                          <span className="text-sm font-medium px-2 py-1 rounded bg-gray-100 text-gray-400">
                            Out of stock
                          </span>
                        </div>
                        <button
                          disabled
                          className="mt-3 w-full py-2 rounded-md bg-gray-400 text-gray-200 cursor-not-allowed"
                        >
                          Buy Now
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                          {p.product_name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2 flex-grow">
                          {p.product_description || "No description available."}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          {p.product_type === "discounted" && p.discounted_price ? (
                            <div>
                              <p className="text-gray-500 line-through text-sm">
                                ₱{formatPrice(p.price)}
                              </p>
                              <p className="text-green-600 font-bold text-base">
                                ₱{formatPrice(p.discounted_price)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-blue-600 font-bold text-base">
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
                          className={`mt-3 w-full py-2 rounded-md transition ${p.stock > 0
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-400 text-gray-200 cursor-not-allowed"
                            }`}
                        >
                          Buy Now
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </SwiperSlide>
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
