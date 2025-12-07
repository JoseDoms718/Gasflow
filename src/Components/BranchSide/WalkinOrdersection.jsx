import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Tag } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import axios from "axios";
import LogoWhite from "../../assets/Design/LogoWhite.png";
import { toast } from "react-hot-toast";
import WalkInOrderModal from "../Modals/WalkInOrderModal";

export default function WalkInOrders() {
  const [regularProducts, setRegularProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [branchBundles, setBranchBundles] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    contact: "+63",
    barangay: "",
    barangay_id: "",
    municipality: "",
    delivery_address: "",
  });
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  const formatPrice = (value) => {
    const num = Number(value);
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const handleBack = () => {
    if (userRole === "owner") navigate("/ownerorders");
    else if (userRole === "branch_manager") navigate("/branchorder");
    else if (userRole === "retailer") navigate("/retailerorder");
    else navigate("/login");
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith("+63")) value = "+63" + value.replace(/^0+|^\+63/, "");
    value = value.replace(/(?!^\+)\D/g, "");
    if (value.length > 13) value = value.slice(0, 13);
    setFormData({ ...formData, contact: value });
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleToggleRefill = (isRefill) => {
    if (!selectedProduct) return;
    const updated = { ...selectedProduct, isRefill };
    setSelectedProduct(updated);

    const updateArr = (arr) => arr.map((p) => (p.product_id === updated.product_id ? updated : p));
    setRegularProducts(updateArr);
    setDiscountedProducts(updateArr);
  };

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${BASE_URL}/products/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const products = Array.isArray(res.data) ? res.data : [];
      const formatted = products.map((p) => ({
        ...p,
        stock: Number(p.stock) || 0,
        isRefill: false,
        image_url: p.image_url
          ? p.image_url.startsWith("http")
            ? p.image_url
            : `${BASE_URL}/products/images/${p.image_url}`
          : "https://via.placeholder.com/300x200",
      }));
      setRegularProducts(formatted.filter((p) => p.product_type === "regular"));
      setDiscountedProducts(formatted.filter((p) => p.product_type === "discounted"));
    } catch (err) {
      console.error("❌ Failed to fetch products:", err);
      toast.error("Failed to load products");
    }
  }, [token]);

  // Fetch Branch Bundles
  const fetchBundles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${BASE_URL}/bundles/branch/my-bundles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const bundles = res.data.branchBundles.map((b) => ({
          ...b,
          bundle_image: b.bundle_image
            ? b.bundle_image.startsWith("http")
              ? b.bundle_image
              : `${BASE_URL}/products/bundles/${b.bundle_image}`
            : "https://via.placeholder.com/300x200",
        }));
        setBranchBundles(bundles);
      }
    } catch (err) {
      console.error("❌ Failed to fetch bundles:", err);
      toast.error("Failed to load branch bundles");
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
    fetchBundles();
  }, [fetchProducts, fetchBundles]);

  // Fetch Barangays
  useEffect(() => {
    if (!formData.municipality) {
      setBarangays([]);
      setFormData((prev) => ({ ...prev, barangay: "", barangay_id: "" }));
      return;
    }
    const fetchBarangays = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/barangays?municipality=${formData.municipality}`);
        setBarangays(res.data || []);
        setFormData((prev) => ({ ...prev, barangay: "", barangay_id: "" }));
      } catch (err) {
        console.error("❌ Failed to fetch barangays:", err);
        toast.error("Failed to load barangays");
      }
    };
    fetchBarangays();
  }, [formData.municipality]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const isBundle = !!selectedProduct.branch_bundle_id;

    // Check stock for regular products
    if (!isBundle) {
      const stockAvailable = selectedProduct.stock ?? 1;
      if (quantity > stockAvailable) {
        toast.error(`❌ Only ${stockAvailable} items in stock!`);
        return;
      }
    }

    // Check barangay selection
    if (!formData.barangay_id) {
      toast.error("❌ Please select a valid barangay.");
      return;
    }

    setLoading(true);

    try {
      let itemsPayload = [];

      if (isBundle) {
        // Bundle order
        itemsPayload.push({
          branch_bundle_id: selectedProduct.branch_bundle_id, // send branch_bundle_id
          branch_id: selectedProduct.branch_id,
          quantity,
          type: "bundle", // type is bundle
          product_id: null, // product_id is null for bundles
          refill: null, // refill not applicable
        });
      } else {
        // Regular product order
        itemsPayload.push({
          product_id: selectedProduct.product_id, // send product_id
          branch_id: selectedProduct.branch_id,
          quantity,
          type: "regular", // type is regular
          branch_bundle_id: null, // bundle_id not applicable
          refill: selectedProduct.isRefill,
        });
      }

      const orderData = {
        items: itemsPayload,
        full_name: formData.name,
        contact_number: formData.contact,
        barangay_id: formData.barangay_id,
        delivery_address: formData.delivery_address || "",
      };

      const res = await axios.post(`${BASE_URL}/orders/walk-in`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200 || res.status === 201) {
        toast.success("✅ Walk-in order created successfully!");
        setSelectedProduct(null);
        setFormData({
          name: "",
          contact: "+63",
          barangay: "",
          barangay_id: "",
          municipality: "",
          delivery_address: "",
        });
        setQuantity(1);
      }
    } catch (err) {
      console.error("❌ Failed to submit order:", err);
      toast.error(err.response?.data?.error || "Failed to submit order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Product Card
  const ProductCard = ({ product, isDiscounted }) => (
    <div className="bg-gray-800 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 border border-gray-700">
      <div onClick={() => setSelectedProduct(product)} className="cursor-pointer">
        <img src={product.image_url} alt={product.product_name} className="h-52 w-full object-cover" />
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white truncate">{product.product_name}</h2>
          <p className="text-gray-400 text-sm mt-1">
            Stock: <span className={`${product.stock > 0 ? "text-green-400" : "text-red-500"} font-semibold`}>{product.stock}</span>
          </p>
          {product.product_description && <p className="text-gray-300 text-sm mt-2 line-clamp-3">{product.product_description}</p>}
          <p className="text-green-400 font-bold text-lg mt-2">
            ₱{formatPrice(product.isRefill ? product.refill_price : product.discounted_price || product.price)}
          </p>
          {isDiscounted && product.discounted_price && (
            <p className="text-gray-400 line-through text-sm mt-1">₱{formatPrice(product.price)}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => setSelectedProduct(product)}
        disabled={product.stock <= 0}
        className={`${product.stock <= 0 ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} text-white font-semibold py-2 rounded-b-2xl transition`}
      >
        {product.stock <= 0 ? "Out of Stock" : "Buy Now"}
      </button>
    </div>
  );

  // Bundle Card
  const BundleCard = ({ bundle }) => (
    <div className="bg-gray-800 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 border border-gray-700">
      <div className="cursor-pointer" onClick={() => setSelectedProduct(bundle)}>
        <img src={bundle.bundle_image} alt={bundle.bundle_name} className="h-52 w-full object-cover" />
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white truncate">{bundle.bundle_name}</h2>
          {bundle.description && <p className="text-gray-300 text-sm mt-2 line-clamp-3">{bundle.description}</p>}
          <p className="text-green-400 font-bold text-lg mt-2">
            ₱{formatPrice(bundle.branch_discounted_price || bundle.branch_price)}
          </p>
          {bundle.branch_discounted_price && (
            <p className="text-gray-400 line-through text-sm mt-1">₱{formatPrice(bundle.branch_price)}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => setSelectedProduct(bundle)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-b-2xl transition"
      >
        Buy Now
      </button>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-40">
        <button onClick={handleBack} className="flex items-center gap-2 text-gray-300 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3">
          <img src={LogoWhite} alt="Gas Flow Logo" className="h-8" />
          <h1 className="text-xl font-bold">Gas Flow</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-16 gap-20 relative w-full max-w-6xl mx-auto">
        {/* Branch Bundles */}
        <div className="w-full mb-12">
          <h2 className="text-xl font-semibold mb-4">Available Bundles</h2>
          {branchBundles.length > 0 ? (
            <Swiper
              modules={[Navigation]}
              navigation={{ prevEl: ".prev-btn3", nextEl: ".next-btn3" }}
              slidesPerView={3}
              spaceBetween={30}
              loop={branchBundles.length > 3}
              breakpoints={{ 640: { slidesPerView: 1 }, 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
            >
              {branchBundles.map((b) => (
                <SwiperSlide key={b.branch_bundle_id}>
                  <BundleCard bundle={b} />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="text-gray-500">No bundles found.</p>
          )}
        </div>

        {/* Discounted Products */}
        <div className="w-full mb-12">
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
        </div>

        {/* Regular Products */}
        <div className="w-full mb-12">
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
        </div>
      </div>

      {/* Modal */}
      {selectedProduct && (
        <WalkInOrderModal
          BASE_URL={BASE_URL}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          quantity={quantity}
          setQuantity={setQuantity}
          formData={formData}
          setFormData={setFormData}
          barangays={barangays}
          handleInputChange={handleInputChange}
          handlePhoneChange={handlePhoneChange}
          handleToggleRefill={handleToggleRefill}
          handleSubmit={handleSubmit}
          loading={loading}
          formatPrice={formatPrice}
        />
      )}
    </div>
  );
}
