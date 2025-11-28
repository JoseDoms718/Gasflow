import { useState, useEffect } from "react";
import { Package, User, MapPin } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "swiper/css";
import "swiper/css/navigation";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Productslist() {
  const navigate = useNavigate();

  const municipalities = [
    "Boac",
    "Mogpog",
    "Gasan",
    "Buenavista",
    "Torrijos",
    "Santa Cruz",
  ];

  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [regularProducts, setRegularProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [discountTimers, setDiscountTimers] = useState({});

  const formatPrice = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ───────── FETCH PRODUCTS ─────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [regularRes, discountedRes] = await Promise.all([
          axios.get(`${BASE_URL}/products/public/products?type=regular`),
          axios.get(`${BASE_URL}/products/public/products?type=discounted`),
        ]);

        const formatProducts = (list) =>
          list.map((p) => ({
            ...p,
            image_url: p.image_url
              ? p.image_url.startsWith("http")
                ? p.image_url
                : `${BASE_URL}/products/images/${p.image_url}`
              : null,
            seller: {
              name: p.seller_name || "-",
              barangay: p.barangay || "-",
              municipality: p.municipality || "-",
            },
          }));

        setRegularProducts(formatProducts(regularRes.data));
        setDiscountedProducts(formatProducts(discountedRes.data));
      } catch (err) {
        console.error("❌ Failed to fetch products:", err);
      }
    };

    fetchProducts();
  }, []);

  // ───────── DISCOUNT TIMERS ─────────
  useEffect(() => {
    const updateTimers = () => {
      const newTimers = {};
      discountedProducts.forEach((p) => {
        if (!p.discount_until) return;

        const now = new Date();
        const end = new Date(p.discount_until);
        const diff = end - now;

        if (diff <= 0) newTimers[p.product_id] = "Discount expired";
        else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newTimers[p.product_id] = `${hours}h ${minutes}m ${seconds}s`;
        }
      });
      setDiscountTimers(newTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [discountedProducts]);

  // ───────── FILTERED PRODUCTS ─────────
  const filteredRegular = regularProducts.filter((p) =>
    selectedMunicipality ? p.seller.municipality === selectedMunicipality : true
  );

  const filteredDiscounted = discountedProducts.filter((p) =>
    selectedMunicipality ? p.seller.municipality === selectedMunicipality : true
  );

  const handleBuyClick = (product) => {
    const token = localStorage.getItem("token");
    if (token) navigate(`/buy/${product.product_id}`);
    else navigate("/login");
  };

  const addPlaceholders = (list, min = 6) => {
    const result = [...list];
    while (result.length < min) {
      result.push({ placeholder: true });
    }
    return result;
  };

  const displayDiscounted = addPlaceholders(filteredDiscounted);
  const displayRegular = addPlaceholders(filteredRegular);

  const renderCard = (item) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 overflow-hidden flex flex-col h-[450px]">
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center flex-shrink-0">
        {item.placeholder ? (
          <Package className="w-12 h-12 text-gray-400" />
        ) : item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-gray-400" />
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        {item.placeholder ? (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Coming Soon
            </h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2 flex-grow">
              Placeholder product description.
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-gray-500 text-sm">Seller info</span>
              <p className="text-blue-600 font-bold text-lg">₱0.00</p>
            </div>
            <button
              disabled
              className="mt-4 w-full py-2 rounded-lg bg-gray-400 text-gray-200 cursor-not-allowed"
            >
              Buy Now
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.product_name}
            </h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              {item.product_description || "No description available."}
            </p>

            {/* Seller + Address + Price Row */}
            <div className="flex items-start justify-between mt-auto mb-2">
              <div className="flex flex-col text-gray-500 text-sm">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{item.seller.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {item.seller.barangay}, {item.seller.municipality}
                  </span>
                </div>
              </div>

              <div className="text-right">
                {item.discounted_price ? (
                  <>
                    <p className="line-through text-gray-500 text-sm">
                      ₱{formatPrice(item.price)}
                    </p>
                    <p className="text-green-600 font-bold text-lg">
                      ₱{formatPrice(item.discounted_price)}
                    </p>
                    {item.discount_until && discountTimers[item.product_id] && (
                      <p className="text-red-500 text-xs mt-1">
                        Ends in: {discountTimers[item.product_id]}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-blue-600 font-bold text-lg">
                    ₱{formatPrice(item.price)}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => handleBuyClick(item)}
              className="mt-4 w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Buy Now
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <section className="bg-gray-900 py-16 mt-8">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-white mb-2">Our Products</h2>
        <p className="text-gray-300 max-w-2xl mb-10">
          Browse our available Solane LPG products and accessories. Filter by
          municipality to find what you need.
        </p>

        {/* Municipality Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <select
            className="w-48 md:w-64 p-3 border border-gray-500 bg-gray-800 text-white rounded-lg focus:outline-none focus:border-blue-500"
            value={selectedMunicipality}
            onChange={(e) => setSelectedMunicipality(e.target.value)}
          >
            <option value="">All Municipalities</option>
            {municipalities.map((m, index) => (
              <option key={index} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Discounted Products */}
        <div className="mb-20 relative">
          <h3 className="text-2xl font-bold text-white mb-6">
            Discounted Products
          </h3>

          <Swiper
            key={displayDiscounted.length}
            modules={[Navigation]}
            navigation={
              displayDiscounted.length > 3
                ? { nextEl: ".discount-next", prevEl: ".discount-prev" }
                : false
            }
            loop={displayDiscounted.length > 3}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
          >
            {displayDiscounted.map((item, index) => (
              <SwiperSlide key={index}>{renderCard(item)}</SwiperSlide>
            ))}
          </Swiper>

          {displayDiscounted.length > 3 && (
            <>
              <div className="hidden md:block discount-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
                <span className="text-gray-900 text-3xl font-bold">❮</span>
              </div>
              <div className="hidden md:block discount-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
                <span className="text-gray-900 text-3xl font-bold">❯</span>
              </div>
            </>
          )}
        </div>

        {/* Regular Products */}
        <div className="relative">
          <h3 className="text-2xl font-bold text-white mb-6">Regular Products</h3>

          <Swiper
            key={displayRegular.length}
            modules={[Navigation]}
            navigation={
              displayRegular.length > 3
                ? { nextEl: ".products-next", prevEl: ".products-prev" }
                : false
            }
            loop={displayRegular.length > 3}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
          >
            {displayRegular.map((item, index) => (
              <SwiperSlide key={index}>{renderCard(item)}</SwiperSlide>
            ))}
          </Swiper>

          {displayRegular.length > 3 && (
            <>
              <div className="hidden md:block products-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
                <span className="text-gray-900 text-3xl font-bold">❮</span>
              </div>
              <div className="hidden md:block products-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
                <span className="text-gray-900 text-3xl font-bold">❯</span>
              </div>
            </>
          )}
        </div>

        {filteredRegular.length === 0 && filteredDiscounted.length === 0 && (
          <p className="text-gray-300 mt-6 text-center">
            No products found for the selected municipality.
          </p>
        )}
      </div>
    </section>
  );
}
