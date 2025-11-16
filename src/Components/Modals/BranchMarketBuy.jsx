import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { X, ShoppingCart, CreditCard } from "lucide-react";
import axios from "axios";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000";
const SOCKET_URL = "http://localhost:5000";

// Helper to normalize image URLs
const getFullImageUrl = (url) => {
    if (!url) return "/placeholder.png";
    return url.startsWith("http") ? url : `${BASE_URL}/products/images/${url.replace(/^\/+/, "")}`;
};

const getUserCartKey = () => {
    const token = localStorage.getItem("token");
    return token ? `cart_${token}` : "cart_guest";
};

export default function BranchMarketBuy({ product, onClose }) {
    const [productType, setProductType] = useState("regular");
    const [quantity, setQuantity] = useState(1);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("+63");
    const [municipality, setMunicipality] = useState("");
    const [barangays, setBarangays] = useState([]);
    const [selectedBarangayId, setSelectedBarangayId] = useState("");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on("stock-updated", (data) => {
            if (product && data.product_id === product.product_id) {
                product.stock = data.stock;
                toast.info(`⚠️ Stock updated: ${data.stock} units available`);
            }
        });
        return () => socket.disconnect();
    }, [product]);

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
                setSelectedBarangayId(
                    (prevId) => list.some((b) => String(b.id) === String(prevId)) ? prevId : ""
                );
            } catch (err) {
                console.error(err);
            }
        };
        fetchBarangays();
    }, [municipality]);

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

    const handleAddToCart = () => {
        if (!product) return;
        const cartKey = getUserCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        const price = productType === "refill" ? product.refill_price : product.discounted_price || product.price;
        const existingIndex = cart.findIndex(
            (item) => item.product_id === product.product_id && item.type === productType
        );
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
            setIsPlacingOrder(true);
            const price = productType === "refill" ? product.refill_price : product.discounted_price || product.price;
            const token = localStorage.getItem("token");
            if (token) {
                await axios.post(
                    `${BASE_URL}/orders/buy`,
                    {
                        items: [{ product_id: product.product_id, quantity, type: productType }],
                        full_name: name,
                        contact_number: phone,
                        barangay_id: selectedBarangayId,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            toast.success("✅ Order placed successfully!");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to place order.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (!product) return null;

    const pricePerUnit = productType === "refill" ? product.refill_price : product.discounted_price || product.price;
    const totalPrice = pricePerUnit * quantity;
    const outOfStock = product.stock <= 0;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl md:max-w-6xl grid md:grid-cols-2 gap-6 p-6 overflow-auto">
                {/* Product Image */}
                <div className="flex items-center justify-center bg-gray-100 rounded-2xl p-4">
                    <img
                        src={getFullImageUrl(product.image_url)}
                        alt={product.product_name}
                        className="w-full h-full object-contain rounded-2xl"
                    />
                </div>

                {/* Info & Form */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">{product.product_name}</h2>
                    <p className="text-gray-700">{product.product_description || "No description available."}</p>
                    <p className="text-gray-600">Stock: {product.stock}</p>
                    {outOfStock && <p className="text-red-500 font-semibold">⚠️ Out of stock.</p>}

                    <div className="flex gap-2 items-center">
                        <select
                            value={productType}
                            onChange={(e) => setProductType(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 bg-white"
                        >
                            <option value="regular">Regular</option>
                            <option value="refill">Refill</option>
                        </select>

                        <select
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            disabled={outOfStock}
                            className="px-3 py-2 rounded-lg border border-gray-300 bg-white"
                        >
                            {Array.from({ length: product.stock }, (_, i) => i + 1).map((q) => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>

                        <p className="text-xl font-semibold text-gray-900">₱{totalPrice.toLocaleString()}.00</p>
                    </div>

                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full"
                    />
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+639XXXXXXXXX"
                        maxLength={13}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full"
                    />
                    <select
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full"
                    >
                        <option value="">Select municipality</option>
                        {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                        value={selectedBarangayId}
                        onChange={(e) => setSelectedBarangayId(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full"
                    >
                        <option value="">Select barangay</option>
                        {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleAddToCart}
                            disabled={outOfStock}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold ${outOfStock ? "bg-yellow-300 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}
                        >
                            <ShoppingCart size={18} /> <span>Add to Cart</span>
                        </button>

                        <button
                            onClick={handleCheckout}
                            disabled={outOfStock || isPlacingOrder}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold ${outOfStock || isPlacingOrder ? "bg-blue-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                        >
                            <CreditCard size={18} /> <span>{isPlacingOrder ? "Processing..." : "Checkout"}</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
                        >
                            <X size={18} /> <span>Close</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
