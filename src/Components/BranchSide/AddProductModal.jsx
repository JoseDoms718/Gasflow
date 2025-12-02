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
        product_id: "",
    });

    const [universalProducts, setUniversalProducts] = useState([]);
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.role;
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (role === "branch_manager") {
            axios
                .get(`${BASE_URL}/products/universal`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => setUniversalProducts(res.data))
                .catch((err) => console.error("Failed loading universal products:", err));
        }
    }, []);

    const updateField = (name, value) =>
        setNewProduct((prev) => ({ ...prev, [name]: value }));

    const handleChange = (e) => updateField(e.target.name, e.target.value);

    const handleNumericInput = (e) => {
        const { name, value } = e.target;

        // allow only numbers and max 2 decimals
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            let newVal = value;

            // live enforce: discounted/refill cannot exceed price
            if ((name === "refill_price" || name === "discounted_price") && newProduct.price) {
                const price = parseFloat(newProduct.price);
                const val = parseFloat(value);
                if (!isNaN(val) && val >= price) {
                    newVal = (price - 1).toFixed(2);
                }
            }

            updateField(name, newVal);
        }
    };

    const handlePriceBlur = (e) => {
        const { name, value } = e.target;
        let num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
            updateField(name, "");
        } else {
            updateField(name, num.toFixed(2));
        }

        // enforce price rules for refill/discounted
        if ((name === "refill_price" || name === "discounted_price") && newProduct.price) {
            const price = parseFloat(newProduct.price);
            const val = parseFloat(newProduct[name]);
            if (!isNaN(val) && val >= price) {
                updateField(name, (price - 1).toFixed(2));
            }
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) updateField("image", file);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        // Final safeguard: ensure refill/discounted prices <= price
        const priceNum = parseFloat(newProduct.price);
        if (newProduct.refill_price) {
            const refillNum = parseFloat(newProduct.refill_price);
            if (!isNaN(refillNum) && refillNum >= priceNum) {
                toast.error("Refill price cannot exceed or equal the product price.");
                return;
            }
        }

        if (newProduct.product_type === "discounted" && newProduct.discounted_price) {
            const discNum = parseFloat(newProduct.discounted_price);
            if (!isNaN(discNum) && discNum >= priceNum) {
                toast.error("Discounted price cannot exceed or equal the product price.");
                return;
            }
        }

        // Check image for admin
        if (role === "admin" && !newProduct.image) {
            toast.error("You must upload an image for the product.");
            return;
        }

        try {
            let res, addedProduct;

            if (role === "admin") {
                const formData = new FormData();
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

                res = await axios.post(`${BASE_URL}/products/admin/add-product`, formData, {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
                });

                addedProduct = res.data.product || res.data;
            } else if (role === "branch_manager") {
                const payload = {
                    product_id: newProduct.product_id,
                    stock: newProduct.stock,
                    stock_threshold: newProduct.stock_threshold,
                };

                res = await axios.post(`${BASE_URL}/products/branch/add-product`, payload, {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                });

                addedProduct = res.data.product || res.data;
            }

            setProducts((prev) => [addedProduct, ...prev]);
            toast.success("Product added!");
            setShowForm(false);
        } catch (error) {
            console.error("Error adding product:", error);
            if (
                role === "branch_manager" &&
                error.response?.status === 400 &&
                error.response.data?.error?.includes("already exists")
            ) {
                toast.error("You already have this product in your branch inventory.");
            } else {
                toast.error("Failed to add product.");
            }
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
                <h3 className="text-xl font-bold mb-6 text-center">Add New Product</h3>
                <form className="flex flex-col md:flex-row gap-6" onSubmit={handleAddProduct}>
                    {role === "admin" && (
                        <div className="flex-1 flex flex-col items-center">
                            <label className="block text-sm font-semibold mb-2">Insert Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600"
                            />
                            {newProduct.image && (
                                <img
                                    src={URL.createObjectURL(newProduct.image)}
                                    alt="Preview"
                                    className="mt-4 w-full h-64 object-contain rounded border border-gray-700"
                                />
                            )}
                        </div>
                    )}

                    <div className="flex-1 flex flex-col gap-5">
                        {role === "branch_manager" && (
                            <div>
                                <label className="block text-sm font-semibold mb-2">Select Product</label>
                                <select
                                    name="product_id"
                                    value={newProduct.product_id}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {universalProducts.map((p) => (
                                        <option key={p.product_id} value={p.product_id}>
                                            {p.product_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {role === "admin" && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Product Type</label>
                                    <select
                                        name="product_type"
                                        value={newProduct.product_type}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                    >
                                        <option value="regular">Regular</option>
                                        <option value="discounted">Discounted</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Product Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={newProduct.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Product Details</label>
                                    <textarea
                                        name="details"
                                        value={newProduct.details}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                        rows="3"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Price (₱)</label>
                                        <input
                                            type="text"
                                            name="price"
                                            value={newProduct.price}
                                            onChange={handleNumericInput}
                                            onBlur={handlePriceBlur}
                                            className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Refill Price (₱)</label>
                                        <input
                                            type="text"
                                            name="refill_price"
                                            value={newProduct.refill_price}
                                            onChange={handleNumericInput}
                                            onBlur={handlePriceBlur}
                                            className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                        />
                                    </div>
                                </div>

                                {newProduct.product_type === "discounted" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Discounted Price (₱)</label>
                                            <input
                                                type="text"
                                                name="discounted_price"
                                                value={newProduct.discounted_price}
                                                onChange={handleNumericInput}
                                                onBlur={handlePriceBlur}
                                                className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Discount Until</label>
                                            <input
                                                type="date"
                                                name="discount_until"
                                                value={newProduct.discount_until}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {role === "branch_manager" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Stock</label>
                                    <input
                                        type="number"
                                        name="stock"
                                        min="0"
                                        value={newProduct.stock}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Stock Threshold</label>
                                    <input
                                        type="number"
                                        name="stock_threshold"
                                        min="0"
                                        value={newProduct.stock_threshold}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2 bg-gray-700 rounded hover:bg-gray-600 text-white font-semibold"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
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
