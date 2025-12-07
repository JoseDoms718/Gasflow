import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { X, ShoppingCart, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = BASE_URL;

const getFullImageUrl = (url, folder = "products/images") => {
    if (!url) return "/placeholder.png";
    return url.startsWith("http") ? url : `${BASE_URL}/${folder}/${url.replace(/^\/+/, "")}`;
};

const getUserCartKey = () => {
    const token = localStorage.getItem("token");
    return token ? `cart_${token}` : "cart_guest";
};

export default function BranchMarketBuy({ product, type, onClose }) {
    const isBundle = type === "bundle";

    const [productType, setProductType] = useState("regular");
    const [quantity, setQuantity] = useState(1);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("+63");
    const [municipality, setMunicipality] = useState("");
    const [barangays, setBarangays] = useState([]);
    const [selectedBarangayId, setSelectedBarangayId] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showBundleContents, setShowBundleContents] = useState(false);

    const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];
    const outOfStock = !isBundle && product.stock != null && product.stock <= 0;

    // ───────── SOCKET ─────────
    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on("stock-updated", (data) => {
            if (product && !isBundle && data.product_id === product.product_id) {
                product.stock = data.stock;
                toast.info(`⚠️ Stock updated: ${data.stock} units available`);
            }
        });

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
    }, [product]);

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
                setDeliveryAddress(user.home_address || "");

                if (user.municipality) {
                    const barangayRes = await axios.get(`${BASE_URL}/barangays?municipality=${user.municipality}`);
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

                setSelectedBarangayId((prevId) =>
                    list.some((b) => String(b.id) === String(prevId)) ? prevId : ""
                );
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

    const handleQuantityChange = (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val === "") {
            setQuantity("");
            return;
        }
        let num = parseInt(val);

        if (!isBundle) {
            const cartKey = getUserCartKey();
            const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
            const existingQty = cart
                .filter(item => item.product_id === product.product_id)
                .reduce((sum, item) => sum + item.quantity, 0);

            const availableStock = Math.max(Number(product.stock ?? 0) - existingQty, 0);
            num = Math.min(num, availableStock);
            if (num <= 0) num = 1;
        }

        setQuantity(num);
    };

    // ───────── CART HANDLERS ─────────
    const handleAddToCart = () => {
        if (!product || !quantity || quantity <= 0) return;
        const cartKey = getUserCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

        if (isBundle) {
            cart.push({
                product_id: product.branch_bundle_id,
                bundle_name: product.bundle_name, // ✅ store bundle_name
                bundle_description: product.bundle_description || "No description", // ✅ store description
                image_url: getFullImageUrl(product.bundle_image, "products/bundles"),
                price: Number(product.discounted_price),
                quantity,
                type: "bundle",
                products: product.products,
                seller_name: product.branch_name || "Unknown",
                branch_id: product.branch_id,
            });
        } else {
            const price = productType === "refill" ? product.refill_price : product.discounted_price || product.price;
            const existingIndex = cart.findIndex(
                (item) => item.product_id === product.product_id && item.type === productType
            );

            const existingQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;
            const availableStock = product.stock != null ? product.stock - existingQty : Infinity;

            if (availableStock <= 0) {
                toast.error(`Cannot add more. Stock limit reached.`);
                return;
            }

            const finalQty = Math.min(quantity, availableStock);

            if (existingIndex >= 0) {
                cart[existingIndex].quantity += finalQty;
            } else {
                cart.push({
                    product_id: product.product_id,
                    product_name: product.product_name,
                    product_description: product.product_description || "No description",
                    image_url: getFullImageUrl(product.image_url),
                    price,
                    quantity: finalQty,
                    type: productType,
                    seller_name: product.seller_name || "Unknown",
                    branch_id: product.branch_id,
                });
            }
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));
        window.dispatchEvent(new Event("storage"));
        toast.success(`🛒 Added to cart!`);
    };



    // ───────── CHECKOUT ─────────
    const handleCheckout = async () => {
        if (!name || !phone || !municipality || !selectedBarangayId || !quantity || quantity <= 0) {
            toast.error("Please fill out all fields and quantity.");
            return;
        }
        if (!deliveryAddress.trim()) {
            toast.error("Delivery address is required.");
            return;
        }
        if (!/^\+639\d{9}$/.test(phone)) {
            toast.error("Please enter a valid Philippine phone number (+639XXXXXXXXX).");
            return;
        }

        if (!isBundle && product?.stock != null && quantity > product.stock) {
            toast.error(`Only ${product.stock} items available in stock.`);
            return;
        }

        try {
            setIsPlacingOrder(true);
            const token = localStorage.getItem("token");
            if (token) {
                const items = isBundle
                    ? [{
                        branch_bundle_id: product.branch_bundle_id,
                        quantity,
                        type: "bundle",
                        branch_id: product.branch_id
                    }]
                    : [{
                        product_id: product.product_id,
                        quantity,
                        type: productType,
                        branch_id: product.branch_id
                    }];

                await axios.post(
                    `${BASE_URL}/orders/buy`,
                    {
                        items,
                        full_name: name,
                        contact_number: phone,
                        barangay_id: selectedBarangayId,
                        delivery_address: deliveryAddress,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            toast.success("✅ Order placed successfully!");
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to place order.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (!product) return null;

    const pricePerUnit = isBundle
        ? Number(product.discounted_price)
        : productType === "refill"
            ? product.refill_price
            : product.discounted_price || product.price;

    const totalPrice = quantity ? pricePerUnit * quantity : 0;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl grid md:grid-cols-2 gap-6 p-6 overflow-auto">
                {/* IMAGE */}
                <div className="flex items-center justify-center bg-gray-100 rounded-2xl p-4 min-h-[300px] max-h-[600px]">
                    <img
                        src={getFullImageUrl(isBundle ? product.bundle_image : product.image_url, isBundle ? "products/bundles" : "products/images")}
                        alt={isBundle ? product.bundle_name : product.product_name}
                        className="max-w-full max-h-full object-contain rounded-2xl"
                    />
                </div>

                {/* INFO */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">{isBundle ? product.bundle_name : product.product_name}</h2>
                    <p className="text-gray-700">{isBundle ? product.description || "No description available." : product.product_description || "No description available."}</p>
                    {outOfStock && <p className="text-red-500 font-semibold">⚠️ Out of stock.</p>}

                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            value={quantity ?? ""}
                            onChange={handleQuantityChange}
                            min={1}
                            placeholder="Qty"
                            className="px-3 py-2 rounded-lg border border-gray-300 bg-white w-20 text-center"
                        />
                        <p className="text-xl font-semibold text-gray-900">₱{totalPrice.toLocaleString()}.00</p>
                    </div>

                    {/* BUNDLE CONTENTS */}
                    {isBundle && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => setShowBundleContents(prev => !prev)}>
                                <h3 className="font-semibold">Bundle Contents</h3>
                                {showBundleContents ? <ChevronUp /> : <ChevronDown />}
                            </div>
                            {showBundleContents && (
                                <div className="space-y-1">
                                    {product.products.map((p) => (
                                        <div key={p.product_id} className="flex justify-between py-1 border-b border-gray-200">
                                            <span>{p.product_name} × {p.quantity}</span>
                                            <span>₱{Number(p.discounted_price || p.price).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FORM INPUTS */}
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full" />
                    <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="+639XXXXXXXXX" maxLength={13} className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full" />
                    <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Delivery Address (House No. / Street / Sitio)" className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full" />

                    <select value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full">
                        <option value="">Select municipality</option>
                        {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select value={selectedBarangayId} onChange={(e) => setSelectedBarangayId(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white w-full">
                        <option value="">Select barangay</option>
                        {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleAddToCart}
                            disabled={!quantity || quantity <= 0 || outOfStock}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold ${!quantity || quantity <= 0 || outOfStock ? "bg-yellow-300 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}
                        >
                            <ShoppingCart size={18} /> <span>Add to Cart</span>
                        </button>

                        <button
                            onClick={handleCheckout}
                            disabled={isPlacingOrder || outOfStock || !quantity}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold ${isPlacingOrder || outOfStock || !quantity ? "bg-blue-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                        >
                            <CreditCard size={18} /> <span>{isPlacingOrder ? "Processing..." : "Checkout"}</span>
                        </button>

                        <button onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400">
                            <X size={18} /> <span>Close</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
