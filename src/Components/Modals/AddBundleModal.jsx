import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AddBundleModal({ setShowBundleForm, refreshBundles }) {
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const token = localStorage.getItem("token");

    const [newBundle, setNewBundle] = useState({
        bundle_name: "",
        description: "",
        price: 0,
        discounted_price: "",
        role: "",
        products: [],
        image: null,
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [allProducts, setAllProducts] = useState([]);

    // Fetch universal products
    useEffect(() => {
        axios
            .get(`${BASE_URL}/products/universal`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setAllProducts(res.data))
            .catch((err) => console.error("Failed to fetch universal products:", err));
    }, []);

    // Recalculate total price + validate discounted price continuously
    useEffect(() => {
        const total = newBundle.products.reduce((sum, item) => {
            const product = allProducts.find((p) => p.product_id === item.product_id);
            return product ? sum + parseFloat(product.price || 0) * (item.quantity || 0) : sum;
        }, 0);

        let discount = parseFloat(newBundle.discounted_price) || 0;
        const maxDiscount = Math.max(total - 1, 0);

        if (discount > maxDiscount) discount = maxDiscount;
        if (discount < 0) discount = 0;

        setNewBundle((prev) => ({
            ...prev,
            price: total.toFixed(2),
            discounted_price: discount.toString(),
        }));
    }, [newBundle.products, allProducts]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewBundle((prev) => ({ ...prev, [name]: value }));
    };

    const handleDiscountedChange = (e) => {
        const raw = e.target.value;
        if (raw === "") return setNewBundle((p) => ({ ...p, discounted_price: "" }));

        const value = Math.max(parseFloat(raw) || 0, 0);
        const maxDiscount = Math.max(parseFloat(newBundle.price) - 1, 0);

        setNewBundle((prev) => ({
            ...prev,
            discounted_price: Math.min(value, maxDiscount).toString(),
        }));
    };

    const handleDiscountedBlur = () => {
        const price = parseFloat(newBundle.price);
        let discount = parseFloat(newBundle.discounted_price);
        const maxDiscount = Math.max(price - 1, 0);

        if (isNaN(discount) || discount <= 0) discount = 1;
        if (discount > maxDiscount) discount = maxDiscount;

        setNewBundle((prev) => ({ ...prev, discounted_price: discount.toFixed(2) }));
    };

    const handleCheckboxChange = (productId) => {
        setNewBundle((prev) => {
            const exists = prev.products.some((p) => p.product_id === productId);
            const products = exists
                ? prev.products.filter((p) => p.product_id !== productId)
                : [...prev.products, { product_id: productId, quantity: 1 }];

            return { ...prev, products };
        });
    };

    const handleQuantityChange = (productId, qty) => {
        setNewBundle((prev) => ({
            ...prev,
            products: prev.products.map((p) =>
                p.product_id === productId
                    ? { ...p, quantity: qty === "" ? "" : Math.max(parseInt(qty) || 0, 0) }
                    : p
            ),
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setNewBundle((prev) => ({ ...prev, image: file }));
        setPreviewImage(URL.createObjectURL(file));
    };

    // -------------------------------------------------
    // FINAL SUBMIT — FULLY PROTECTED AGAINST LOOPHOLES
    // -------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();

        const price = parseFloat(newBundle.price);
        let discount = parseFloat(newBundle.discounted_price);

        if (isNaN(price) || price <= 0) {
            return toast.error("Bundle must have at least 1 product.");
        }

        if (isNaN(discount) || discount <= 0) {
            return toast.error("Discounted price must be at least ₱1.");
        }

        // Hard block — cannot bypass!!
        if (discount > price) {
            return toast.error("Discounted price cannot be higher than total price.");
        }

        if (newBundle.products.some((p) => !p.quantity || p.quantity <= 0)) {
            return toast.error("Quantity cannot be zero or empty.");
        }

        const formData = new FormData();
        formData.append("bundle_name", newBundle.bundle_name);
        formData.append("description", newBundle.description);
        formData.append("price", price.toFixed(2));
        formData.append("discounted_price", discount.toFixed(2));
        formData.append("role", newBundle.role);
        formData.append("products", JSON.stringify(newBundle.products));
        if (newBundle.image) formData.append("bundle_image", newBundle.image);

        try {
            await axios.post(`${BASE_URL}/bundles/add`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            toast.success("Bundle created successfully!");
            refreshBundles?.();
            setShowBundleForm(false);
        } catch (err) {
            console.error("Error saving bundle:", err);
            toast.error("Failed to create bundle.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
                <h3 className="text-xl font-bold mb-6 text-center">Add New Bundle</h3>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                    {/* IMAGE + BASIC INFO */}
                    <div className="flex gap-6">
                        <div className="relative flex-shrink-0">
                            <div className="w-48 h-48 border border-gray-700 rounded overflow-hidden flex items-center justify-center">
                                {previewImage ? (
                                    <img src={previewImage} alt="Bundle" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-500 text-sm text-center">No Image</span>
                                )}
                            </div>
                            <label className="absolute bottom-2 right-2 cursor-pointer bg-purple-500 p-2 rounded-full hover:bg-purple-600 shadow-md">
                                <PlusCircle className="w-6 h-6 text-white" />
                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Bundle Name</label>
                                <input
                                    type="text"
                                    name="bundle_name"
                                    value={newBundle.bundle_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded bg-gray-800 text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Role</label>
                                <select
                                    name="role"
                                    value={newBundle.role}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded bg-gray-800 text-white"
                                >
                                    <option value="" disabled>Select role</option>
                                    <option value="users">Users</option>
                                    <option value="all">All</option>
                                    <option value="business_owner">Business Owner</option>
                                    <option value="retailer">Retailer</option>
                                </select>
                            </div>

                            <div className="col-span-full">
                                <label className="block text-sm font-semibold mb-2">Description</label>
                                <textarea
                                    name="description"
                                    value={newBundle.description}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full px-4 py-2 rounded bg-gray-800 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PRICE + DISCOUNT */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Price (₱)</label>
                            <input
                                type="text"
                                value={newBundle.price}
                                readOnly
                                className="w-full px-4 py-2 rounded bg-gray-700 text-white cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Discounted Price (₱)</label>
                            <input
                                type="text"
                                name="discounted_price"
                                value={newBundle.discounted_price}
                                onChange={handleDiscountedChange}
                                onBlur={handleDiscountedBlur}
                                className="w-full px-4 py-2 rounded bg-gray-800 text-white"
                            />
                        </div>
                    </div>

                    {/* PRODUCTS */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Select Products</label>
                        <div
                            className={`border border-gray-700 rounded p-2 flex flex-col gap-2 ${allProducts.length > 3 ? "max-h-[10rem] overflow-y-auto" : ""
                                }`}
                        >
                            {allProducts.length ? (
                                allProducts.map((p) => {
                                    const selected = newBundle.products.find((item) => item.product_id === p.product_id);
                                    return (
                                        <div key={p.product_id} className="flex items-center justify-between">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selected}
                                                    onChange={() => handleCheckboxChange(p.product_id)}
                                                    className="accent-purple-500"
                                                />
                                                <span>{p.product_name} (₱{parseFloat(p.price).toFixed(2)})</span>
                                            </label>

                                            {selected && (
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={selected.quantity}
                                                    onChange={(e) => handleQuantityChange(p.product_id, e.target.value)}
                                                    className="w-16 px-2 py-1 rounded bg-gray-800 text-white"
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-400 text-sm">No products available.</p>
                            )}
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setShowBundleForm(false)}
                            className="px-5 py-2 bg-gray-700 rounded hover:bg-gray-600 text-white font-semibold"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="px-5 py-2 bg-purple-500 rounded hover:bg-purple-600 text-white font-semibold flex items-center gap-2"
                        >
                            <PlusCircle className="w-4 h-4" /> Add Bundle
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
