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

  // 🔵 BUNDLES
  const [bundles, setBundles] = useState([]);

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
          list
            .map((p) => ({
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
            }))
            .filter((p) => p.stock > 0);

        setRegularProducts(formatProducts(regularRes.data));

        const now = new Date();
        const validDiscounted = formatProducts(discountedRes.data).filter(
          (p) => !p.discount_until || new Date(p.discount_until) > now
        );
        setDiscountedProducts(validDiscounted);
      } catch (err) {
        console.error("❌ Failed to fetch products:", err);
      }
    };

    fetchProducts();
  }, []);

  // ───────── FETCH BUNDLES ─────────
  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(`${BASE_URL}/bundles/buyer/bundles`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // 🔵 ADD BRANCH INFO TO BUNDLE
        const formatted = res.data.bundles.map((b) => ({
          ...b,
          image_url: b.bundle_image
            ? `${BASE_URL}/bundles/images/${b.bundle_image}`
            : null,
          seller: {
            name: b.branch_name || "-",
            barangay: b.barangay_name || "-", // if you want barangay name
            municipality: b.municipality || "-", // optional: fetch from API if needed
          },
        }));

        setBundles(formatted);
      } catch (err) {
        console.error("❌ Failed to fetch bundles:", err);
      }
    };

    fetchBundles();
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

  // ───────── FILTERS ─────────
  const filteredRegular = regularProducts.filter((p) =>
    selectedMunicipality ? p.seller.municipality === selectedMunicipality : true
  );

  const filteredDiscounted = discountedProducts.filter((p) =>
    selectedMunicipality ? p.seller.municipality === selectedMunicipality : true
  );

  const filteredBundles = bundles.filter((b) =>
    selectedMunicipality ? b.seller.municipality === selectedMunicipality : true
  );

  const handleBuyClick = (product) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    navigate(`/buy/${product.product_id}?branch_id=${product.branch_id}`);
  };

  const handleBundleBuy = (bundle) => {
    navigate(
      `/buy-bundle/${bundle.bundle_id}?branch_bundle_id=${bundle.branch_bundle_id}`
    );
  };

  // ───────── PLACEHOLDERS ─────────
  const addPlaceholders = (list, min = 3) => {
    const result = [...list];
    while (result.length < min) {
      result.push({ placeholder: true });
    }
    return result;
  };

  const displayDiscounted = addPlaceholders(filteredDiscounted, 3);
  const displayRegular = addPlaceholders(filteredRegular, 3);
  const displayBundles = addPlaceholders(filteredBundles, 3);

  const renderCard = (item) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 border border-gray-200 overflow-hidden flex flex-col h-[450px] relative">
      {item.placeholder ? (
        <>
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center flex-shrink-0">
            <Package className="w-12 h-12 text-gray-400" />
          </div>

          <div className="p-4 flex flex-col flex-grow">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Coming Soon
            </h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2 flex-grow">
              Placeholder description.
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
          </div>
        </>
      ) : (
        <>
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center flex-shrink-0">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.product_name || item.bundle_name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <Package className="w-12 h-12 text-gray-400" />
            )}
          </div>

          <div className="p-4 flex flex-col flex-grow">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.product_name || item.bundle_name}
            </h3>

            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              {item.product_description || item.description || "No description."}
            </p>

            <div className="flex items-start justify-between mt-auto mb-2">
              <div className="flex flex-col text-gray-500 text-sm">
                {item.seller && (
                  <>
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
                  </>
                )}
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
                  </>
                ) : (
                  <p className="text-blue-600 font-bold text-lg">
                    ₱{formatPrice(item.price)}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() =>
                item.bundle_id ? handleBundleBuy(item) : handleBuyClick(item)
              }
              className="mt-4 w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Buy Now
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="bg-gray-900 py-16 mt-8">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-white mb-2">Our Products</h2>
        <p className="text-gray-300 max-w-2xl mb-10">
          Browse our available Solane LPG products and accessories. Filter by
          municipality.
        </p>

        {/* Municipality Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <select
            className="w-48 md:w-64 p-3 border border-gray-500 bg-gray-800 text-white rounded-lg"
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

        {/* BUNDLES */}
        <div className="mb-20 relative">
          <h3 className="text-2xl font-bold text-white mb-6">Bundles</h3>
          <Swiper
            key={displayBundles.length}
            modules={[Navigation]}
            loop={displayBundles.length > 3}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: Math.min(displayBundles.length, 1) },
              768: { slidesPerView: Math.min(displayBundles.length, 2) },
              1024: { slidesPerView: Math.min(displayBundles.length, 3) },
            }}
          >
            {displayBundles.map((item, index) => (
              <SwiperSlide key={index}>{renderCard(item)}</SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Discounted Products */}
        <div className="mb-20 relative">
          <h3 className="text-2xl font-bold text-white mb-6">
            Discounted Products
          </h3>
          <Swiper
            key={displayDiscounted.length}
            modules={[Navigation]}
            loop={displayDiscounted.length > 3}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: Math.min(displayDiscounted.length, 1) },
              768: { slidesPerView: Math.min(displayDiscounted.length, 2) },
              1024: { slidesPerView: Math.min(displayDiscounted.length, 3) },
            }}
          >
            {displayDiscounted.map((item, index) => (
              <SwiperSlide key={index}>{renderCard(item)}</SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Regular Products */}
        <div className="relative">
          <h3 className="text-2xl font-bold text-white mb-6">
            Regular Products
          </h3>
          <Swiper
            key={displayRegular.length}
            modules={[Navigation]}
            loop={displayRegular.length > 3}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: Math.min(displayRegular.length, 1) },
              768: { slidesPerView: Math.min(displayRegular.length, 2) },
              1024: { slidesPerView: Math.min(displayRegular.length, 3) },
            }}
          >
            {displayRegular.map((item, index) => (
              <SwiperSlide key={index}>{renderCard(item)}</SwiperSlide>
            ))}
          </Swiper>
        </div>

        {filteredRegular.length === 0 &&
          filteredDiscounted.length === 0 &&
          filteredBundles.length === 0 && (
            <p className="text-gray-300 mt-6 text-center">
              No items found for the selected municipality.
            </p>
          )}
      </div>
    </section>
  );
}
