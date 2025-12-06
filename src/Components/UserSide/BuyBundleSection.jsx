import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { X, ShoppingCart, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// ───────── HELPERS ─────────
const getFullBundleImageUrl = (url) =>
    url ? `${BASE_URL}/bundles/images/${url.replace(/^\/+/, "")}` : "/placeholder.png";

const getFullProductImageUrl = (url) =>
    url ? `${BASE_URL}/products/images/${url.replace(/^\/+/, "")}` : "/placeholder.png";

const getUserCartKey = () =>
    localStorage.getItem("token") ? `cart_${localStorage.getItem("token")}` : "cart_guest";

export default function BuyBundleSection() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const urlBranchBundleId = new URLSearchParams(location.search).get("branch_bundle_id");

    const [bundle, setBundle] = useState(null);
    const [branchPrices, setBranchPrices] = useState([]);
    const [items, setItems] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [showItems, setShowItems] = useState(false);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("+63");
    const [municipality, setMunicipality] = useState("");
    const [barangays, setBarangays] = useState([]);
    const [selectedBarangayId, setSelectedBarangayId] = useState("");
    const [loading, setLoading] = useState(true);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

    // ───────── FETCH BUNDLE DATA ─────────
    useEffect(() => {
        const fetchBundle = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BASE_URL}/bundles/${id}`, {
                    params: { branch_bundle_id: urlBranchBundleId },
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (!res.data.success) {
                    toast.error(res.data.error || "Failed to load bundle");
                    setLoading(false);
                    return;
                }

                setBundle(res.data.bundle);
                setBranchPrices(res.data.branch_prices || []);
                setItems(res.data.items || []);
                setLoading(false);

                if (token) {
                    const userRes = await axios.get(`${BASE_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const user = userRes.data.user;
                    if (user) {
                        setName(user.name || "");
                        setPhone(user.contact_number || "+63");
                        setMunicipality(user.municipality || "");
                        if (user.municipality) {
                            const brRes = await axios.get(`${BASE_URL}/barangays?municipality=${user.municipality}`);
                            setBarangays(brRes.data || []);
                            const match = brRes.data.find(
                                (b) =>
                                    String(b.id) === String(user.barangay_id) ||
                                    b.name.toLowerCase() === user.barangay?.toLowerCase()
                            );
                            if (match) setSelectedBarangayId(match.id);
                        }
                    }
                }
            } catch (err) {
                console.error("❌ Error loading bundle:", err);
                toast.error("Failed to load bundle");
                setLoading(false);
            }
        };

        fetchBundle();
    }, [id, urlBranchBundleId]);

    // ───────── HANDLERS ─────────
    const handleNameChange = (e) => {
        if (/^[A-Za-z\s]*$/.test(e.target.value)) setName(e.target.value);
    };

    const handlePhoneChange = (e) => {
        let v = e.target.value.replace(/\D/g, "");
        if (!v.startsWith("63")) v = "63" + v;
        setPhone("+" + v.slice(0, 12));
    };

    const handleQuantityChange = (e) => {
        let val = e.target.value.replace(/\D/g, "");
        setQuantity(val === "" || parseInt(val) <= 0 ? "" : parseInt(val));
    };

    const getBranchPrice = () => {
        // Fallback order: branch discounted price → branch price → bundle discounted → bundle regular
        const branchPriceObj = branchPrices.find((b) => b.branch_bundle_id == urlBranchBundleId) || branchPrices[0];
        return parseFloat(
            branchPriceObj?.branch_discounted_price ??
            branchPriceObj?.branch_price ??
            bundle?.discounted_price ??
            bundle?.price ??
            0
        );
    };

    const handleAddToCart = () => {
        if (!bundle || quantity <= 0) return toast.error("Quantity must be at least 1.");

        const cartKey = getUserCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

        const branchPriceObj = branchPrices.find((b) => b.branch_bundle_id == urlBranchBundleId) || branchPrices[0];
        const price = parseFloat(
            branchPriceObj?.branch_discounted_price ??
            branchPriceObj?.branch_price ??
            bundle?.discounted_price ??
            bundle?.price ??
            0
        );

        const existingIndex = cart.findIndex(
            (item) =>
                item.branch_bundle_id === branchPriceObj?.branch_bundle_id &&
                item.branch_id === branchPriceObj?.branch_id
        );

        if (existingIndex >= 0) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                bundle_id: bundle.bundle_id,
                branch_bundle_id: branchPriceObj?.branch_bundle_id,
                branch_id: branchPriceObj?.branch_id,
                bundle_name: bundle.bundle_name,
                image_url: getFullBundleImageUrl(bundle.bundle_image),
                quantity,
                price,
                type: "bundle",
            });
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));
        window.dispatchEvent(new Event("storage"));
        toast.success(`🛒 Added ${quantity} × ${bundle.bundle_name} to cart!`);
    };

    const handleCheckout = async () => {
        if (
            !bundle ||
            quantity <= 0 ||
            !name ||
            !phone ||
            !municipality ||
            !selectedBarangayId ||
            !/^\+639\d{9}$/.test(phone)
        ) {
            return toast.error("Please fill out all fields correctly.");
        }

        const branchPriceObj = branchPrices.find((b) => b.branch_bundle_id == urlBranchBundleId) || branchPrices[0];
        if (!branchPriceObj || !branchPriceObj.branch_id) {
            return toast.error("Invalid branch bundle. Cannot checkout.");
        }

        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Please log in.");
            navigate("/login");
            return;
        }

        try {
            setIsPlacingOrder(true);

            const payload = {
                full_name: name,
                contact_number: phone,
                barangay_id: Number(selectedBarangayId),
                items: [
                    {
                        branch_bundle_id: Number(branchPriceObj.branch_bundle_id),
                        branch_id: Number(branchPriceObj.branch_id),
                        quantity: Number(quantity),
                        type: "bundle",
                    },
                ],
            };

            console.log("Checkout payload:", payload);

            const { data } = await axios.post(`${BASE_URL}/orders/buy`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            toast.success(data.message || "Order placed successfully!");
            navigate("/orders");
        } catch (err) {
            console.error("❌ Checkout error:", err);
            toast.error(err.response?.data?.error || "Failed to place order.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (loading) return <p className="text-white">Loading bundle...</p>;
    if (!bundle) return <p className="text-white">Bundle not found.</p>;

    const branchPrice = getBranchPrice();
    const totalPrice = branchPrice * quantity;

    return (
        <section className="bg-gray-900 min-h-screen text-white px-6 pt-28 pb-20 flex items-center justify-center">
            <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10 items-start">
                {/* Bundle Image */}
                <div className="rounded-2xl shadow-xl flex items-center justify-center bg-gray-800 p-8 h-[600px]">
                    <img
                        src={getFullBundleImageUrl(bundle.bundle_image)}
                        alt={bundle.bundle_name}
                        className="w-full h-full object-contain drop-shadow-2xl rounded-2xl"
                    />
                </div>

                {/* Info Panel */}
                <div className="bg-gray-800 rounded-2xl shadow-lg flex flex-col h-[600px] max-h-[85vh] overflow-hidden">
                    <div className="p-10 flex-1 overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-3xl font-bold">{bundle.bundle_name}</h2>
                            <button onClick={() => navigate(-1)} className="ml-4 bg-gray-700 hover:bg-gray-600 rounded-lg p-2">
                                <X size={22} />
                            </button>
                        </div>

                        <p className="text-gray-300 mb-2">{bundle.description || "No description available."}</p>
                        <p className="text-2xl font-semibold mb-2">Total: ₱{totalPrice.toLocaleString()}.00</p>

                        {/* Quantity */}
                        <div className="flex flex-col mb-6 gap-2">
                            <label className="block text-sm font-medium">Quantity</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={handleQuantityChange}
                                onBlur={() => { if (!quantity || quantity <= 0) setQuantity(1); }}
                                min={1}
                                className="w-20 px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg text-center
                   appearance-none
                   [&::-webkit-outer-spin-button]:appearance-none
                   [&::-webkit-inner-spin-button]:appearance-none
                   [&::-moz-appearance]:textfield"
                            />
                        </div>

                        {/* Buyer Info */}
                        <div className="space-y-4 mb-6">
                            <input type="text" value={name} onChange={handleNameChange} placeholder="Full Name" className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700" />
                            <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="+639XXXXXXXXX" maxLength={13} className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700" />
                            <select value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700">
                                <option value="">Select municipality</option>
                                {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={selectedBarangayId} onChange={(e) => setSelectedBarangayId(e.target.value)} className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700">
                                <option value="">Select barangay</option>
                                {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        {/* Bundle Items */}
                        <div className="mb-6">
                            <button onClick={() => setShowItems(!showItems)} className="flex items-center gap-2 text-yellow-400 font-semibold">
                                {showItems ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                {showItems ? "Hide Bundle Items" : "Show Bundle Items"}
                            </button>

                            {showItems && (
                                <ul className="space-y-4 mt-4">
                                    {items.map((item) => (
                                        <li key={item.product_id} className="flex items-center gap-4 bg-gray-700 p-2 rounded-lg">
                                            <img src={getFullProductImageUrl(item.product_image)} alt={item.product_name} className="w-16 h-16 object-cover rounded-lg" />
                                            <div className="flex-1 flex justify-between items-center">
                                                <span className="font-medium">{item.product_name} x{item.quantity}</span>
                                                <span className="font-semibold text-yellow-400">₱{parseFloat(item.product_discounted_price ?? item.product_price).toLocaleString()}.00</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-10 flex flex-col md:flex-row gap-4 bg-gray-800 sticky bottom-0 border-t border-gray-700">
                        <button onClick={handleAddToCart} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-yellow-600 hover:bg-yellow-700">
                            <ShoppingCart size={20} /> Cart
                        </button>

                        <button onClick={handleCheckout} disabled={isPlacingOrder} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold ${isPlacingOrder ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                            <CreditCard size={20} /> {isPlacingOrder ? "Placing Order..." : "Checkout"}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
