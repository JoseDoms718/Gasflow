import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { X, ShoppingCart, CreditCard } from "lucide-react";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = BASE_URL;

// Helpers
const getFullImageUrl = (url) =>
  url
    ? url.startsWith("http")
      ? url
      : `${BASE_URL}/products/images/${url.replace(/^\/+/, "")}`
    : "/placeholder.png";

const getUserCartKey = () =>
  localStorage.getItem("token") ? `cart_${localStorage.getItem("token")}` : "cart_guest";

export default function Buysection() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [productType, setProductType] = useState("regular");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+63");
  const [municipality, setMunicipality] = useState("");
  const [barangays, setBarangays] = useState([]);
  const [selectedBarangayId, setSelectedBarangayId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isPlacingLoan, setIsPlacingLoan] = useState(false); // ───────── LOAN STATE
  const [userRole, setUserRole] = useState(null);

  const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];
  const branchId = new URLSearchParams(location.search).get("branch_id");

  // ───────── SOCKET.IO ─────────
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("stock-updated", (data) => {
      if (data.product_id === parseInt(id) && (!branchId || data.branch_id === parseInt(branchId))) {
        setProduct((prev) => (prev ? { ...prev, stock: data.stock } : prev));
        toast.info(`⚠️ Stock updated: ${data.stock} units available`);
      }
    });

    return () => socket.disconnect();
  }, [id, branchId]);

  // ───────── FETCH PRODUCT ─────────
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) throw new Error("No product ID provided.");
        const { data } = await axios.get(`${BASE_URL}/products/${id}`, {
          params: { branch_id: branchId },
        });
        setProduct(data);
        setProductType(data.discounted_price ? "discounted" : "regular");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load product information.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, branchId]);

  // ───────── FETCH USER INFO ─────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const { data } = await axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const user = data.user;
        if (!user) return;

        setUserRole(user.role || null);
        setName(user.name || "");
        setPhone(user.contact_number || "+63");
        setMunicipality(user.municipality || "");
        setDeliveryAddress(user.home_address || "");

        if (user.municipality) {
          const res = await axios.get(`${BASE_URL}/barangays?municipality=${user.municipality}`);
          setBarangays(res.data || []);
          const match = res.data.find(
            (b) =>
              String(b.id) === String(user.barangay_id) ||
              b.name.toLowerCase() === user.barangay?.toLowerCase()
          );
          if (match) setSelectedBarangayId(match.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // ───────── FETCH BARANGAYS ON MUNICIPALITY CHANGE ─────────
  useEffect(() => {
    if (!municipality) {
      setBarangays([]);
      setSelectedBarangayId("");
      return;
    }
    const fetchBarangays = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/barangays?municipality=${municipality}`);
        setBarangays(res.data || []);
        setSelectedBarangayId((prev) =>
          res.data.some((b) => String(b.id) === String(prev)) ? prev : ""
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchBarangays();
  }, [municipality]);

  // ───────── INPUT HANDLERS ─────────
  const handleNameChange = (e) => {
    if (/^[A-Za-z\s]*$/.test(e.target.value)) setName(e.target.value);
  };

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (!v.startsWith("63")) v = "63" + v;
    setPhone("+" + v.slice(0, 12));
  };

  const handleQuantityChange = (e) => {
    let num = parseInt(e.target.value) || 0;
    if (product && num > product.stock) num = product.stock;
    setQuantity(num);
  };

  // ───────── CART HANDLER ─────────
  const handleAddToCart = () => {
    if (!product || quantity <= 0) return toast.error("Quantity must be at least 1.");

    const cartKey = getUserCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const price =
      productType === "refill"
        ? product.refill_price
        : productType === "discounted"
          ? product.discounted_price
          : product.price;

    const existingIndex = cart.findIndex(
      (item) => item.product_id === product.product_id && item.type === productType
    );
    if (existingIndex >= 0)
      cart[existingIndex].quantity = Math.min(cart[existingIndex].quantity + quantity, product.stock);
    else
      cart.push({
        product_id: product.product_id,
        product_name: product.product_name,
        product_description: product.product_description || "No description",
        image_url: getFullImageUrl(product.image_url),
        price,
        quantity,
        type: productType,
        seller_name: product.branch_name || "Unknown",
        branch_id: product.branch_id || null,
      });

    localStorage.setItem(cartKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    toast.success(`🛒 Added ${quantity} × ${product.product_name} (${productType}) to cart!`);
  };

  // ───────── CHECKOUT ─────────
  const handleCheckout = async () => {
    if (
      !product ||
      quantity <= 0 ||
      !name ||
      !phone ||
      !municipality ||
      !selectedBarangayId ||
      !deliveryAddress ||
      !/^\+639\d{9}$/.test(phone)
    ) {
      return toast.error("Please fill out all fields correctly.");
    }
    if (quantity > product.stock) return toast.error(`Only ${product.stock} available.`);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in.");
      navigate("/login");
      return;
    }

    try {
      setIsPlacingOrder(true);
      const { data } = await axios.post(
        `${BASE_URL}/orders/buy`,
        {
          items: [
            {
              product_id: product.product_id,
              quantity,
              type: productType,
              branch_id: product.branch_id,
            },
          ],
          full_name: name,
          contact_number: phone,
          barangay_id: selectedBarangayId,
          delivery_address: deliveryAddress,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message || "Order placed successfully!");
      navigate("/orders");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to place order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // ───────── LOAN HANDLER ─────────
  const handleLoan = async () => {
    if (
      !product ||
      quantity <= 0 ||
      !name ||
      !phone ||
      !municipality ||
      !selectedBarangayId ||
      !deliveryAddress ||
      !/^\+639\d{9}$/.test(phone)
    ) {
      return toast.error("Please fill out all fields correctly.");
    }
    if (quantity > product.stock) return toast.error(`Only ${product.stock} available.`);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in.");
      navigate("/login");
      return;
    }

    try {
      setIsPlacingLoan(true);

      const price =
        productType === "discounted"
          ? product.discounted_price
          : product.price;

      const { data } = await axios.post(
        `${BASE_URL}/orders/loan`,
        {
          items: [
            {
              product_id: product.product_id,
              quantity,
              type: productType,  // send the product type
              price,              // send the correct price
              branch_id: product.branch_id,
            },
          ],
          full_name: name,
          contact_number: phone,
          barangay_id: selectedBarangayId,
          delivery_address: deliveryAddress,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );


      toast.success(data.message || "Loan request submitted!");
      navigate("/orders");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to submit loan.");
    } finally {
      setIsPlacingLoan(false);
    }
  };

  if (loading) return <p className="text-white">Loading product...</p>;
  if (!product) return <p className="text-white">Product not found.</p>;

  const pricePerUnit =
    productType === "refill"
      ? product.refill_price
      : productType === "discounted"
        ? product.discounted_price
        : product.price;
  const totalPrice = (quantity || 0) * pricePerUnit;
  const outOfStock = product.stock <= 0;

  const getDropdownOptions = () => {
    const opts = [];
    if (product.discounted_price) opts.push({ value: "discounted", label: "Discounted" });
    else opts.push({ value: "regular", label: "Regular" });
    if (product.refill_price != null) opts.push({ value: "refill", label: "Refill" });
    return opts;
  };

  return (
    <section className="bg-gray-900 min-h-screen text-white px-6 pt-28 pb-20 flex items-center justify-center">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10 items-start">
        {/* Image */}
        <div className="rounded-2xl shadow-xl flex items-center justify-center bg-gray-800 p-8 h-[600px]">
          <img
            src={getFullImageUrl(product.image_url)}
            alt={product.product_name}
            className="w-full h-full object-contain drop-shadow-2xl rounded-2xl"
          />
        </div>

        {/* Info */}
        <div className="bg-gray-800 p-10 rounded-2xl shadow-lg flex flex-col justify-between h-[600px] max-h-[85vh] overflow-y-auto">
          {/* Header row with title and X button */}
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-bold">{product.product_name}</h2>
            <button onClick={() => navigate(-1)} className="ml-4 bg-gray-700 hover:bg-gray-600 rounded-lg p-2">
              <X size={22} />
            </button>
          </div>

          <p className="text-gray-300 mb-2">{product.product_description || "No description available."}</p>
          {product.branch_name && (
            <p className="text-gray-400 mb-4 text-sm">
              Sold by: <span className="font-medium">{product.branch_name}</span>
            </p>
          )}
          {outOfStock && <p className="text-red-400 font-semibold mb-4">⚠️ Out of stock.</p>}
          <p className="text-2xl font-semibold mb-2">₱{totalPrice.toLocaleString()}.00</p>

          {/* Type & Quantity */}
          <div className="flex flex-col mb-6 gap-2">
            <label className="block text-sm font-medium">Type & Quantity</label>
            <div className="flex items-center gap-4">
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg"
              >
                {getDropdownOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={quantity ?? ""}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (val === "" || parseInt(val) <= 0) {
                    setQuantity("");
                  } else {
                    let num = parseInt(val);
                    if (product && num > product.stock) num = product.stock;
                    setQuantity(num);
                  }
                }}
                onBlur={() => {
                  if (!quantity || quantity <= 0) setQuantity(1);
                }}
                min={1}
                max={product.stock}
                className="w-20 px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg text-center
                          appearance-none
                          [&::-webkit-outer-spin-button]:appearance-none
                          [&::-webkit-inner-spin-button]:appearance-none
                          [&::-moz-appearance]:textfield"
                placeholder="1"
              />
            </div>
          </div>

          {/* User Info */}
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
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Delivery Address"
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

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold ${outOfStock ? "bg-yellow-500 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-700"
                }`}
            >
              <ShoppingCart size={20} /> Cart
            </button>

            {userRole === "business_owner" && (
              <button
                onClick={handleLoan}
                disabled={outOfStock || isPlacingLoan}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 ${isPlacingLoan ? "cursor-not-allowed bg-purple-500" : ""}`}
              >
                <CreditCard size={20} /> {isPlacingLoan ? "Processing Loan..." : "Loan"}
              </button>
            )}

            <button
              onClick={handleCheckout}
              disabled={isPlacingOrder || outOfStock}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold ${isPlacingOrder || outOfStock ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              <CreditCard size={20} />{" "}
              {outOfStock ? "Out of Stock" : isPlacingOrder ? "Placing Order..." : "Checkout"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
