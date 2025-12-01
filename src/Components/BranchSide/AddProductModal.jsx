import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function AddProductModal({ setShowForm, setProducts }) {
    const [newProduct, setNewProduct] = useState({
        image: null,
        name: "",
        details: "",
        price: "",
        refill_price: "",
        discounted_price: "",
        discount_until: "",
        stock: "",
        stock_threshold: "",
        product_type: "regular",
        admin_product_id: "",
    });

    const [adminProducts, setAdminProducts] = useState([]);

    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.role;

    // Fetch admin products for branch manager
    useEffect(() => {
        if (role === "branch_manager") {
            axios
                .get(`${BASE_URL}/products/admin`)
                .then((res) => setAdminProducts(res.data))
                .catch((err) => console.error("Failed loading admin products:", err));
        }
    }, []);

    const updateField = (name, value) => {
        setNewProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleChange = (e) => {
        updateField(e.target.name, e.target.value);
    };

    const handleNumericInput = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d{0,2}$/.test(value)) updateField(e.target.name, value);
    };

    // Ensure refill & discount never exceed price
    const enforcePriceRules = () => {
        const price = parseFloat(newProduct.price);
        if (isNaN(price)) return;

        if (newProduct.refill_price) {
            let refill = parseFloat(newProduct.refill_price);
            if (!isNaN(refill) && refill >= price) {
                refill = price - 1;
                updateField("refill_price", refill.toFixed(2));
            }
        }

        if (newProduct.discounted_price) {
            let discounted = parseFloat(newProduct.discounted_price);
            if (!isNaN(discounted) && discounted >= price) {
                discounted = price - 1;
                updateField("discounted_price", discounted.toFixed(2));
            }
        }
    };

    const handlePriceBlur = (e) => {
        const { name, value } = e.target;
        if (!value) return;
        const num = parseFloat(value);
        if (!isNaN(num)) {
            updateField(name, num.toFixed(2));
            enforcePriceRules();
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) updateField("image", file);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const formData = new FormData();

        if (role === "admin") {
            formData.append("product_name", newProduct.name);
            formData.append("product_description", newProduct.details);
            formData.append("price", newProduct.price);
            formData.append("refill_price", newProduct.refill_price || "");
            formData.append("product_type", newProduct.product_type);
            formData.append("discount_until", newProduct.discount_until || "");
            if (newProduct.product_type === "discounted") {
                formData.append("discounted_price", newProduct.discounted_price);
            }
            if (newProduct.image) formData.append("image", newProduct.image);
        }

        if (role === "branch_manager") {
            formData.append("admin_product_id", newProduct.admin_product_id);
            formData.append("stock", newProduct.stock);
            formData.append("stock_threshold", newProduct.stock_threshold);
        }

        try {
            const url =
                role === "admin"
                    ? `${BASE_URL}/products/admin/add-product`
                    : `${BASE_URL}/products/add`;

            const res = await axios.post(url, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            const added = res.data.product || res.data;
            setProducts((prev) => [added, ...prev]);
            toast.success("Product added!");
            setShowForm(false);
        } catch (error) {
            console.error("Error adding product:", error);
            toast.error("Failed to add product.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
                <h3 className="text-xl font-bold mb-4">Add New Product</h3>
                <form className="flex flex-col md:flex-row gap-6" onSubmit={handleAddProduct}>
                    {/* ADMIN IMAGE */}
                    {role === "admin" && (
                        <div className="flex-1 flex flex-col items-center">
                            <label className="block text-sm mb-2">Insert Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                                    file:rounded file:border-0 file:text-sm file:font-semibold
                                    file:bg-green-500 file:text-white hover:file:bg-green-600"
                            />
                            {newProduct.image && (
                                <img
                                    src={URL.createObjectURL(newProduct.image)}
                                    alt="Preview"
                                    className="mt-3 w-full h-64 object-contain rounded border border-gray-700"
                                />
                            )}
                        </div>
                    )}

                    <div className="flex-1 flex flex-col gap-4">
                        {/* BRANCH MANAGER SELECT ADMIN PRODUCT */}
                        {role === "branch_manager" && (
                            <div>
                                <label className="block text-sm mb-1">Select Admin Product</label>
                                <select
                                    name="admin_product_id"
                                    value={newProduct.admin_product_id}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {adminProducts.map((p) => (
                                        <option key={p.product_id} value={p.product_id}>
                                            {p.product_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* ADMIN INPUTS */}
                        {role === "admin" && (
                            <>
                                <div>
                                    <label className="block text-sm mb-1">Product Type</label>
                                    <select
                                        name="product_type"
                                        value={newProduct.product_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                    >
                                        <option value="regular">Regular</option>
                                        <option value="discounted">Discounted</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={newProduct.name}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm mb-1">Product Details</label>
                                    <textarea
                                        name="details"
                                        value={newProduct.details}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                        rows="3"
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm mb-1">Price (₱)</label>
                                        <input
                                            type="text"
                                            name="price"
                                            value={newProduct.price}
                                            onChange={handleNumericInput}
                                            onBlur={handlePriceBlur}
                                            className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Refill Price (₱)</label>
                                        <input
                                            type="text"
                                            name="refill_price"
                                            value={newProduct.refill_price}
                                            onChange={handleNumericInput}
                                            onBlur={handlePriceBlur}
                                            className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                        />
                                    </div>
                                </div>

                                {newProduct.product_type === "discounted" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm mb-1">Discounted Price (₱)</label>
                                            <input
                                                type="text"
                                                name="discounted_price"
                                                value={newProduct.discounted_price}
                                                onChange={handleNumericInput}
                                                onBlur={handlePriceBlur}
                                                className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Discount Until</label>
                                            <input
                                                type="date"
                                                name="discount_until"
                                                value={newProduct.discount_until}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* BRANCH MANAGER STOCK */}
                        {role === "branch_manager" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-1">Stock</label>
                                    <input
                                        type="number"
                                        name="stock"
                                        min="0"
                                        value={newProduct.stock}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">Stock Threshold</label>
                                    <input
                                        type="number"
                                        name="stock_threshold"
                                        min="0"
                                        value={newProduct.stock_threshold}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                                Add Product
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
