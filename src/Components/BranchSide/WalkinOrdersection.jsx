import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Tag, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import axios from "axios";
import LogoWhite from "../../assets/Design/LogoWhite.png";
import { toast } from "react-hot-toast";

export default function WalkInOrders() {
  const [regularProducts, setRegularProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    contact: "+63",
    barangay: "",
    municipality: "",
  });
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  /* Helper for price formatting */
  const formatPrice = (value) => {
    const num = Number(value);
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  };

  /* Scroll to top on route change */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  /* Back navigation */
  const handleBack = () => {
    if (userRole === "owner") navigate("/ownerorders");
    else if (userRole === "branch_manager") navigate("/branchorder");
    else if (userRole === "retailer") navigate("/retailerorder");
    else navigate("/login");
  };

  /* Phone input handler */
  const handlePhoneChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith("+63")) {
      value = "+63" + value.replace(/^0+|^\+63/, "");
    }
    value = value.replace(/(?!^\+)\D/g, "");
    if (value.length > 13) value = value.slice(0, 13);
    setFormData({ ...formData, contact: value });
  };

  /* Fetch products */
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:5000/products/my-products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const products = Array.isArray(res.data) ? res.data : [];
      const formatted = products.map((p) => ({
        ...p,
        stock: Number(p.stock) || 0,
        image_url: p.image_url
          ? p.image_url.startsWith("http")
            ? p.image_url
            : `http://localhost:5000/products/images/${p.image_url}`
          : "https://via.placeholder.com/300x200",
      }));
      setRegularProducts(formatted.filter((p) => p.product_type === "regular"));
      setDiscountedProducts(formatted.filter((p) => p.product_type === "discounted"));
    } catch (err) {
      console.error("❌ Failed to fetch products:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* Fetch barangays when municipality changes */
  useEffect(() => {
    const fetchBarangays = async () => {
      if (!formData.municipality) {
        setBarangays([]);
        setFormData((prev) => ({ ...prev, barangay: "" }));
        return;
      }
      try {
        const res = await axios.get(
          `http://localhost:5000/barangays?municipality=${formData.municipality}`
        );
        setBarangays(res.data || []);
        setFormData((prev) => ({ ...prev, barangay: "" })); // reset barangay
      } catch (err) {
        console.error("❌ Failed to fetch barangays:", err);
        toast.error("Failed to load barangays");
      }
    };
    fetchBarangays();
  }, [formData.municipality]);

  /* Form input handler */
  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  /* Form submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (quantity > selectedProduct.stock) {
      toast.error(`❌ Only ${selectedProduct.stock} items in stock!`);
      return;
    }
    setLoading(true);
    try {
      const orderData = {
        product_id: selectedProduct.product_id,
        product_name: selectedProduct.product_name,
        quantity,
        customer_name: formData.name,
        contact_number: formData.contact,
        address: `${formData.barangay}, ${formData.municipality}`,
        total_price:
          (selectedProduct.discounted_price || selectedProduct.price) * quantity,
      };
      const res = await axios.post("http://localhost:5000/orders/walk-in", orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200 || res.status === 201) {
        toast.success("✅ Walk-in order created successfully!");
        setRegularProducts((prev) =>
          prev.map((p) =>
            p.product_id === selectedProduct.product_id
              ? { ...p, stock: p.stock - quantity }
              : p
          )
        );
        setDiscountedProducts((prev) =>
          prev.map((p) =>
            p.product_id === selectedProduct.product_id
              ? { ...p, stock: p.stock - quantity }
              : p
          )
        );
        await fetchProducts();
        setSelectedProduct(null);
        setFormData({ name: "", contact: "+63", barangay: "", municipality: "" });
        setQuantity(1);
      }
    } catch (err) {
      console.error("❌ Failed to submit order:", err);
      toast.error("❌ Failed to submit order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Product Card */
  const ProductCard = ({ product, isDiscounted }) => (
    <div className="bg-gray-800 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 border border-gray-700">
      <div onClick={() => setSelectedProduct(product)} className="cursor-pointer">
        <img
          src={product.image_url}
          alt={product.product_name}
          className="h-52 w-full object-cover"
        />
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white truncate">
            {product.product_name}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Stock:{" "}
            <span
              className={`${product.stock > 0 ? "text-green-400" : "text-red-500"} font-semibold`}
            >
              {product.stock}
            </span>
          </p>
          {product.product_description && (
            <p className="text-gray-300 text-sm mt-2 line-clamp-3">
              {product.product_description}
            </p>
          )}
          {isDiscounted ? (
            <>
              <p className="text-gray-400 line-through text-sm mt-2">
                ₱{formatPrice(product.price)}
              </p>
              <p className="text-green-400 font-bold text-lg">
                ₱{formatPrice(product.discounted_price)}
              </p>
            </>
          ) : (
            <p className="text-green-400 font-bold text-lg mt-2">
              ₱{formatPrice(product.price)}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => setSelectedProduct(product)}
        disabled={product.stock <= 0}
        className={`${product.stock <= 0 ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } text-white font-semibold py-2 rounded-b-2xl transition`}
      >
        {product.stock <= 0 ? "Out of Stock" : "Buy Now"}
      </button>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-40">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <img src={LogoWhite} alt="Gas Flow Logo" className="h-8" />
          <h1 className="text-xl font-bold">Gas Flow</h1>
        </div>
      </div>

      {/* Products Section */}
      <div className="flex-1 flex flex-col items-center px-6 py-16 gap-20 relative">
        {/* Discounted */}
        <div className="w-full max-w-6xl relative">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-400" /> Discounted Items
          </h2>

          {discountedProducts.length > 0 ? (
            <Swiper
              modules={[Navigation]}
              navigation={{ prevEl: ".prev-btn2", nextEl: ".next-btn2" }}
              slidesPerView={3}
              spaceBetween={30}
              loop={discountedProducts.length > 3}
              breakpoints={{ 640: { slidesPerView: 1 }, 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
            >
              {discountedProducts.map((p) => (
                <SwiperSlide key={p.product_id}>
                  <ProductCard product={p} isDiscounted />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="text-gray-500">No discounted products found.</p>
          )}

          {discountedProducts.length > 3 && (
            <>
              <button className="prev-btn2 absolute left-[-60px] top-1/2 -translate-y-1/2 bg-green-700 hover:bg-green-600 p-3 rounded-full shadow-lg transition">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button className="next-btn2 absolute right-[-60px] top-1/2 -translate-y-1/2 bg-green-700 hover:bg-green-600 p-3 rounded-full shadow-lg transition">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>

        {/* Regular */}
        <div className="w-full max-w-6xl relative">
          <h2 className="text-xl font-semibold mb-4">Available Products</h2>

          {regularProducts.length > 0 ? (
            <Swiper
              modules={[Navigation]}
              navigation={{ prevEl: ".prev-btn", nextEl: ".next-btn" }}
              slidesPerView={3}
              spaceBetween={30}
              loop={regularProducts.length > 3}
              breakpoints={{ 640: { slidesPerView: 1 }, 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
            >
              {regularProducts.map((p) => (
                <SwiperSlide key={p.product_id}>
                  <ProductCard product={p} />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="text-gray-500">No regular products found.</p>
          )}

          {regularProducts.length > 3 && (
            <>
              <button className="prev-btn absolute left-[-60px] top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 p-3 rounded-full shadow-lg transition">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button className="next-btn absolute right-[-60px] top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 p-3 rounded-full shadow-lg transition">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 text-gray-300 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={selectedProduct.image_url}
              alt={selectedProduct.product_name}
              className="h-48 w-full object-cover"
            />

            <div className="p-5">
              <h2 className="text-xl font-semibold text-white text-center">
                {selectedProduct.product_name}
              </h2>

              <p className="text-center text-sm text-gray-400 mt-1">
                Stock Available:{" "}
                <span
                  className={`${selectedProduct.stock > 0 ? "text-green-400" : "text-red-500"} font-semibold`}
                >
                  {selectedProduct.stock}
                </span>
              </p>

              <div className="text-center mt-2">
                {selectedProduct.discounted_price ? (
                  <>
                    <p className="text-gray-400 line-through text-sm">
                      ₱{formatPrice(selectedProduct.price)}
                    </p>
                    <p className="text-green-400 font-bold text-lg">
                      ₱{formatPrice(selectedProduct.discounted_price)}
                    </p>
                  </>
                ) : (
                  <p className="text-green-400 font-bold text-lg">
                    ₱{formatPrice(selectedProduct.price)}
                  </p>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Customer Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                  required
                />

                <input
                  type="text"
                  name="contact"
                  placeholder="+63XXXXXXXXXX"
                  value={formData.contact || "+63"}
                  onChange={handlePhoneChange}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                  required
                />

                <div className="flex gap-3">
                  <select
                    name="municipality"
                    value={formData.municipality}
                    onChange={handleInputChange}
                    className="w-1/2 p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                    required
                  >
                    <option value="">Select Municipality</option>
                    <option value="Boac">Boac</option>
                    <option value="Gasan">Gasan</option>
                    <option value="Mogpog">Mogpog</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="Torrijos">Torrijos</option>
                    <option value="Buenavista">Buenavista</option>
                  </select>

                  <select
                    name="barangay"
                    value={formData.barangay}
                    onChange={handleInputChange}
                    className="w-1/2 p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                    required
                    disabled={!barangays.length}
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded"
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(Math.min(selectedProduct.stock, quantity + 1))
                      }
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded"
                      disabled={quantity >= selectedProduct.stock}
                    >
                      +
                    </button>
                  </div>
                </div>

                <p className="text-lg font-semibold text-center mt-2">
                  Total: ₱
                  {formatPrice(
                    (selectedProduct.discounted_price || selectedProduct.price) * quantity
                  )}
                </p>

                <button
                  type="submit"
                  disabled={loading || selectedProduct.stock <= 0}
                  className={`w-full mt-3 p-2 rounded font-semibold transition ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
                    }`}
                >
                  {selectedProduct.stock <= 0
                    ? "Out of Stock"
                    : loading
                      ? "Processing..."
                      : "Buy Now"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
