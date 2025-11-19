import React, { useState } from "react";
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
    });
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleNumericInput = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d{0,2}$/.test(value)) handleChange(e);
    };

    const handlePriceBlur = (e) => {
        const { name, value } = e.target;
        if (!value) return;
        const num = parseFloat(value);
        if (!isNaN(num)) setNewProduct((prev) => ({ ...prev, [name]: num.toFixed(2) }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) setNewProduct((prev) => ({ ...prev, image: file }));
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (!newProduct.name || !newProduct.price)
            return toast.error("⚠️ Please fill in all required fields.");
        if (!newProduct.image)
            return toast.error("⚠️ Please upload a product image before adding.");

        const token = localStorage.getItem("token");
        if (!token) return toast.error("You must be logged in to add a product.");

        const formData = new FormData();
        formData.append("product_name", newProduct.name);
        formData.append("product_description", newProduct.details);
        formData.append("price", newProduct.price);
        formData.append("stock", newProduct.stock);
        formData.append("stock_threshold", newProduct.stock_threshold);
        formData.append("product_type", newProduct.product_type);
        formData.append("refill_price", newProduct.refill_price || "");
        formData.append("discount_until", newProduct.discount_until || "");
        if (newProduct.product_type === "discounted")
            formData.append("discounted_price", newProduct.discounted_price || 0);
        formData.append("image", newProduct.image);

        try {
            // 🛰️ Add product
            const res = await axios.post(`${BASE_URL}/products/add`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            const addedProduct = res.data?.product || res.data;
            const productId = addedProduct.product_id;

            // 🔄 Try fetching full joined product details (includes inventory)
            let formatted;
            try {
                const { data: fullProduct } = await axios.get(
                    `$/products/${productId}`
                );
                formatted = {
                    ...fullProduct,
                    image_url: fullProduct.image_url
                        ? fullProduct.image_url.startsWith("http")
                            ? fullProduct.image_url
                            : `${BASE_URL}/products/images/${fullProduct.image_url}`
                        : null,
                };
            } catch {
                console.warn("⚠️ Could not fetch full product details, using fallback data.");
                formatted = {
                    ...addedProduct,
                    image_url: addedProduct.image_url
                        ? addedProduct.image_url.startsWith("http")
                            ? addedProduct.image_url
                            : `${BASE_URL}/products/images/${addedProduct.image_url}`
                        : null,
                };
            }

            // 🧱 Update table instantly
            setProducts((prev) => [formatted, ...prev]);

            // ✅ Reset form
            setShowForm(false);
            setNewProduct({
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
            });

            toast.success("✅ Product added successfully!");
        } catch (error) {
            console.error("❌ Error adding product:", error);
            toast.error("Failed to add product.");
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
                <h3 className="text-xl font-bold mb-4">Add New Product</h3>
                <form className="flex flex-col md:flex-row gap-6" onSubmit={handleAddProduct}>
                    {/* Image Upload */}
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

                    {/* Text Inputs */}
                    <div className="flex-1 flex flex-col gap-4">
                        {/* Product Type */}
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

                        {/* Product Name */}
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

                        {/* Product Details */}
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

                        {/* Prices */}
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
                                    value={newProduct.refill_price || ""}
                                    onChange={handleNumericInput}
                                    onBlur={handlePriceBlur}
                                    className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Discounted Price */}
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
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">Discount Until</label>
                                    <input
                                        type="date"
                                        name="discount_until"
                                        value={newProduct.discount_until}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 rounded bg-gray-800 text-white calendar-white"
                                        onPaste={(e) => e.preventDefault()}  // Prevent pasting
                                        onKeyDown={(e) => e.preventDefault()} // Prevent typing
                                    />
                                </div>
                            </div>
                        )}

                        {/* Stock Section */}
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
                                />
                            </div>
                        </div>

                        {/* Buttons */}
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
