import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { X, ShoppingCart, CreditCard } from "lucide-react";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000";
const SOCKET_URL = "http://localhost:5000"; // adjust if different

// 🔹 Helper to normalize image URLs
const getFullImageUrl = (url) => {
  if (!url) return "/placeholder.png";
  return url.startsWith("http") ? url : `${BASE_URL}/products/images/${url.replace(/^\/+/, "")}`;
};

// 🔹 Get cart key based on logged-in user
const getUserCartKey = () => {
  const token = localStorage.getItem("token");
  return token ? `cart_${token}` : "cart_guest";
};

export default function Buysection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [productType, setProductType] = useState("regular"); // "regular" or "refill"
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+63");
  const [municipality, setMunicipality] = useState("");
  const [barangays, setBarangays] = useState([]);
  const [selectedBarangayId, setSelectedBarangayId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  // ───────── SOCKET SETUP ─────────
  useEffect(() => {
    const socket = io(SOCKET_URL);

    // Stock updates
    socket.on("stock-updated", (data) => {
      if (data.product_id === id) {
        setProduct((prev) => prev ? { ...prev, stock: data.stock } : prev);
        toast.info(`⚠️ Stock updated: ${data.stock} units available`);
      }
    });

    // Cart updates
    socket.on("cart-updated", (data) => {
      const cartKey = getUserCartKey();
      const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
      const updatedCart = cart.map((item) =>
        item.product_id === data.product_id ? { ...item, quantity: data.quantity } : item
      );
      localStorage.setItem(cartKey, JSON.stringify(updatedCart));
      window.dispatchEvent(new Event("storage"));
    });

    return () => socket.disconnect();
  }, [id]);

  // ───────── FETCH PRODUCT ─────────
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) throw new Error("No product ID provided.");
        const res = await axios.get(`${BASE_URL}/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load product information.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // ───────── FETCH USER ─────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = res.data?.user;
        if (!user) return;

        setName(user.name || "");
        setPhone(user.contact_number || "+63");
        setMunicipality(user.municipality || "");

        if (user.municipality) {
          const barangayRes = await axios.get(
            `${BASE_URL}/barangays?municipality=${user.municipality}`
          );
          const list = barangayRes.data || [];
          setBarangays(list);

          const matched = list.find(
            (b) =>
              String(b.id) === String(user.barangay_id) ||
              b.name.toLowerCase() === user.barangay?.toLowerCase()
          );
          if (matched) setSelectedBarangayId(matched.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // ───────── FETCH BARANGAYS ─────────
  useEffect(() => {
    if (!municipality) {
      setBarangays([]);
      setSelectedBarangayId("");
      return;
    }

    const fetchBarangays = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/barangays?municipality=${municipality}`);
        const list = res.data || [];
        setBarangays(list);

        setSelectedBarangayId((prevId) => list.some((b) => String(b.id) === String(prevId)) ? prevId : "");
      } catch (err) {
        console.error(err);
      }
    };
    fetchBarangays();
  }, [municipality]);

  // ───────── INPUT HANDLERS ─────────
  const handleNameChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s]*$/.test(value)) setName(value);
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith("+63")) value = "+63" + value.replace(/\D/g, "");
    else value = "+63" + value.replace("+63", "").replace(/\D/g, "");
    if (value.length > 13) value = value.slice(0, 13);
    setPhone(value);
  };

  // ───────── CART HANDLERS ─────────
  const handleAddToCart = () => {
    if (!product) return;

    const cartKey = getUserCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

    const price = productType === "refill" ? product.refill_price : product.discounted_price || product.price;

    const existingIndex = cart.findIndex((item) => item.product_id === product.product_id && item.type === productType);
    if (existingIndex >= 0) {
      const newQuantity = cart[existingIndex].quantity + quantity;
      cart[existingIndex].quantity = newQuantity > product.stock ? product.stock : newQuantity;
    } else {
      cart.push({
        product_id: product.product_id,
        product_name: product.product_name,
        product_description: product.product_description || "No description",
        image_url: getFullImageUrl(product.image_url),
        price,
        quantity,
        type: productType,
        seller_name: product.seller_name || "Unknown",
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    toast.success(`🛒 Added ${quantity} × ${product.product_name} (${productType}) to cart!`);
  };

  const handleCheckout = async () => {
    if (!name || !phone || !municipality || !selectedBarangayId) {
      toast.error("Please fill out all fields.");
      return;
    }
    if (!/^\+639\d{9}$/.test(phone)) {
      toast.error("Please enter a valid Philippine phone number (+639XXXXXXXXX).");
      return;
    }
    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} items available in stock.`);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to place an order.");
        navigate("/login");
        return;
      }

      setIsPlacingOrder(true);

      const price = productType === "refill" ? product.refill_price : product.discounted_price || product.price;

      const res = await axios.post(
        `${BASE_URL}/orders/buy`,
        {
          items: [
            {
              product_id: product.product_id,
              quantity,
              type: productType, // now backend sees refill correctly
            }
          ],
          full_name: name,
          contact_number: phone,
          barangay_id: selectedBarangayId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );


      toast.success(res.data.message || "Order placed successfully!");
      navigate("/orders");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to place order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) return <p className="text-white">Loading product...</p>;
  if (!product) return <p className="text-white">Product not found.</p>;

  const pricePerUnit = productType === "refill" ? product.refill_price : product.discounted_price || product.price;
  const totalPrice = pricePerUnit * quantity;
  const outOfStock = product.stock <= 0;

  return (
    <section className="bg-gray-900 min-h-screen text-white px-6 pt-28 pb-20 flex items-center justify-center">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10 items-center">
        {/* Product Image */}
        <div className="rounded-2xl shadow-xl flex items-center justify-center bg-gray-800 p-8 h-[600px]">
          <img
            src={getFullImageUrl(product.image_url)}
            alt={product.product_name}
            className="w-full h-full object-contain drop-shadow-2xl rounded-2xl"
          />
        </div>

        {/* Product Info & Form */}
        <div className="bg-gray-800 p-10 rounded-2xl shadow-lg flex flex-col justify-between h-[600px] max-h-[85vh] overflow-y-auto">
          <div>
            <h2 className="text-3xl font-bold mb-2">{product.product_name}</h2>
            <p className="text-gray-300 mb-2">
              {product.product_description || "No description available."}
            </p>
            <p className="text-gray-400 mb-4">Available Stock: {product.stock}</p>

            {outOfStock && (
              <p className="text-red-400 font-semibold mb-4">⚠️ Out of stock.</p>
            )}

            {/* Type & Quantity Dropdown */}
            <div className="flex flex-col mb-6">
              <label className="block text-sm font-medium mb-2">Type & Quantity</label>

              <div className="flex items-center gap-4">
                {/* Type Dropdown */}
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="regular">Regular</option>
                  <option value="refill">Refill</option>
                </select>

                {/* Quantity Dropdown */}
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  disabled={outOfStock}
                  className="px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: product.stock }, (_, i) => i + 1).map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>

                {/* Price Display */}
                <p className="text-2xl font-semibold">
                  ₱{totalPrice.toLocaleString()}.00
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Full Name"
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700"
              />
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+639XXXXXXXXX"
                maxLength={13}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700"
              />

              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700"
              >
                <option value="">Select municipality</option>
                {municipalities.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedBarangayId}
                onChange={(e) => setSelectedBarangayId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700"
              >
                <option value="">Select barangay</option>
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold ${outOfStock
                ? "bg-yellow-500 cursor-not-allowed"
                : "bg-yellow-600 hover:bg-yellow-700"
                }`}
            >
              <ShoppingCart size={20} /> Add to Cart
            </button>

            <button
              onClick={handleCheckout}
              disabled={isPlacingOrder || outOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold ${isPlacingOrder || outOfStock
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              <CreditCard size={20} />{" "}
              {outOfStock
                ? "Out of Stock"
                : isPlacingOrder
                  ? "Placing Order..."
                  : "Checkout"}
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-14 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
