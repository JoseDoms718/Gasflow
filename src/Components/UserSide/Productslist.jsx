import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "swiper/css";
import "swiper/css/navigation";

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
        console.log("📡 Fetching regular & discounted products...");

        const [regularRes, discountedRes] = await Promise.all([
          axios.get(
            "http://localhost:5000/products/public/products?type=regular"
          ),
          axios.get(
            "http://localhost:5000/products/public/products?type=discounted"
          ),
        ]);

        const formatProducts = (list) =>
          list.map((p) => ({
            ...p,
            image_url: p.image_url
              ? p.image_url.startsWith("http")
                ? p.image_url
                : `http://localhost:5000/products/images/${p.image_url}`
              : null,
          }));

        setRegularProducts(formatProducts(regularRes.data));
        setDiscountedProducts(formatProducts(discountedRes.data));

        console.log("✅ Regular products:", regularRes.data.length);
        console.log("✅ Discounted products:", discountedRes.data.length);
      } catch (err) {
        console.error("❌ Failed to fetch products:", err);
      }
    };

    fetchProducts();
  }, []);

  const filteredRegular = regularProducts.filter((p) =>
    selectedMunicipality ? p.branch === selectedMunicipality : true
  );

  const filteredDiscounted = discountedProducts.filter((p) =>
    selectedMunicipality ? p.branch === selectedMunicipality : true
  );

  const handleBuyClick = (product) => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate(`/buy/${product.product_id}`);
    } else {
      navigate("/login");
    }
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

  const showDiscountNav = displayDiscounted.length > 3;
  const showRegularNav = displayRegular.length > 3;

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
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Coming Soon
            </h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2 flex-grow">
              Placeholder product description.
            </p>
            <div className="flex items-center justify-between mt-auto">
              <p className="text-blue-600 font-bold text-lg">₱0.00</p>
              <span className="text-sm font-medium px-2 py-1 rounded bg-gray-100 text-gray-400">
                Out of stock
              </span>
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
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              {item.product_name}
            </h3>
            <p className="text-gray-600">{item.branch}</p>
            <p className="text-gray-500 text-sm mb-2">Stock: {item.stock}</p>

            {item.discounted_price ? (
              <>
                <p className="line-through text-gray-500">
                  ₱{formatPrice(item.price)}
                </p>
                <p className="text-green-600 font-bold text-lg">
                  ₱{formatPrice(item.discounted_price)}
                </p>
              </>
            ) : (
              <p className="text-blue-600 font-bold text-lg">
                ₱{formatPrice(item.price)}
              </p>
            )}

            <button
              onClick={() => handleBuyClick(item)}
              disabled={item.stock === 0}
              className={`mt-4 w-full py-2 rounded-lg transition ${item.stock === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
            >
              {item.stock === 0 ? "Out of Stock" : "Buy Now"}
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
            className="p-2 border border-gray-500 bg-gray-800 text-white rounded-lg focus:outline-none focus:border-blue-500"
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
              showDiscountNav
                ? { nextEl: ".discount-next", prevEl: ".discount-prev" }
                : false
            }
            loop={showDiscountNav}
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

          {showDiscountNav && (
            <>
              <div className="discount-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
                <span className="text-gray-900 text-3xl font-bold">❮</span>
              </div>
              <div className="discount-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
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
              showRegularNav
                ? { nextEl: ".products-next", prevEl: ".products-prev" }
                : false
            }
            loop={showRegularNav}
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

          {showRegularNav && (
            <>
              <div className="products-prev absolute -left-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
                <span className="text-gray-900 text-3xl font-bold">❮</span>
              </div>
              <div className="products-next absolute -right-14 top-1/2 -translate-y-1/2 cursor-pointer z-0 bg-white shadow-md p-3 rounded-full hover:bg-gray-100">
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
