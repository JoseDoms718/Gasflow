import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Calendar } from "lucide-react";

export default function AddProductModal({ setShowForm, setProducts }) {
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.role;
    const token = localStorage.getItem("token");

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
    const [selectedInfo, setSelectedInfo] = useState(null);

    useEffect(() => {
        if (role === "branch_manager") {
            axios
                .get(`${BASE_URL}/products/universal`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => setUniversalProducts(res.data))
                .catch((err) =>
                    console.error("Failed loading universal products:", err)
                );
        }
    }, []);

    const updateField = (name, value) =>
        setNewProduct((prev) => ({ ...prev, [name]: value }));

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateField(name, value);

        if (name === "product_id") {
            const info = universalProducts.find((p) => p.product_id == value);
            setSelectedInfo(info || null);
        }
    };

    const handleNumericInput = (e) => {
        if (role !== "admin") return;
        const { name, value } = e.target;
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            let newVal = value;

            const priceNum = parseFloat(newProduct.price);
            const discountedNum = parseFloat(newProduct.discounted_price);

            if (name === "refill_price" && newProduct.price) {
                const val = parseFloat(value);
                if (!isNaN(val)) {
                    if (
                        newProduct.product_type === "discounted" &&
                        !isNaN(discountedNum) &&
                        val >= discountedNum
                    ) {
                        newVal = (discountedNum - 1).toFixed(2);
                    } else if (val >= priceNum) {
                        newVal = (priceNum - 1).toFixed(2);
                    }
                }
            }

            if (name === "discounted_price" && !isNaN(priceNum)) {
                const val = parseFloat(value);
                if (val >= priceNum) newVal = (priceNum - 1).toFixed(2);
            }

            updateField(name, newVal);
        }
    };

    const handlePriceBlur = (e) => {
        if (role !== "admin") return;
        const { name, value } = e.target;
        let num = parseFloat(value);
        if (isNaN(num) || num <= 0) updateField(name, "");
        else updateField(name, num.toFixed(2));

        const priceNum = parseFloat(newProduct.price);
        const discountedNum = parseFloat(newProduct.discounted_price);

        if (name === "refill_price") {
            const refillNum = parseFloat(newProduct.refill_price);
            if (
                refillNum >= discountedNum &&
                newProduct.product_type === "discounted"
            ) {
                updateField(
                    "refill_price",
                    (discountedNum - 1).toFixed(2)
                );
            } else if (refillNum >= priceNum) {
                updateField("refill_price", (priceNum - 1).toFixed(2));
            }
        }

        if (name === "discounted_price" && !isNaN(priceNum)) {
            const discNum = parseFloat(newProduct.discounted_price);
            if (discNum >= priceNum) {
                updateField(
                    "discounted_price",
                    (priceNum - 1).toFixed(2)
                );
            }
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) updateField("image", file);
    };

    const handleAdminAddProduct = async (e) => {
        e.preventDefault();

        if (!newProduct.image)
            return toast.error("You must upload an image.");
        if (!newProduct.name)
            return toast.error("Product name is required.");

        const priceNum = parseFloat(newProduct.price);
        const refillNum = parseFloat(newProduct.refill_price);
        const discNum = parseFloat(newProduct.discounted_price);

        if (isNaN(priceNum) || priceNum <= 0)
            return toast.error("Price must be greater than 0.");

        if (!isNaN(refillNum) && refillNum >= priceNum)
            return toast.error("Refill price cannot exceed main price.");

        try {
            const formData = new FormData();
            formData.append("product_name", newProduct.name);
            formData.append("product_description", newProduct.details);
            formData.append("price", priceNum.toFixed(2));
            formData.append(
                "refill_price",
                refillNum?.toFixed(2) || ""
            );
            formData.append(
                "discounted_price",
                discNum?.toFixed(2) || ""
            );
            formData.append("product_type", newProduct.product_type);
            formData.append("discount_until", newProduct.discount_until);
            formData.append("image", newProduct.image);

            const res = await axios.post(
                `${BASE_URL}/products/admin/add-product`,
                formData,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setProducts((prev) => [res.data.product, ...prev]);
            toast.success("Product added!");
            setShowForm(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to add product.");
        }
    };

    const handleBranchAddProduct = async (e) => {
        e.preventDefault();
        if (!newProduct.product_id)
            return toast.error("Please select a product.");
        if (newProduct.stock === "" || newProduct.stock < 0)
            return toast.error("Stock must be 0 or higher.");

        try {
            const payload = {
                product_id: newProduct.product_id,
                stock: newProduct.stock,
                stock_threshold: newProduct.stock_threshold,
            };

            const res = await axios.post(
                `${BASE_URL}/products/branch/add-product`,
                payload,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setProducts((prev) => [res.data.product, ...prev]);
            toast.success("Product added!");
            setShowForm(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to add product.");
        }
    };

    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
                <h3 className="text-xl font-bold mb-6 text-center">
                    Add New Product
                </h3>

                <form
                    className="flex flex-col md:flex-row gap-6"
                    onSubmit={
                        role === "admin"
                            ? handleAdminAddProduct
                            : handleBranchAddProduct
                    }
                >
                    {role === "admin" && (
                        <div className="flex-1 flex flex-col items-center">
                            <label className="block text-sm font-semibold mb-2">
                                Insert Image
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="w-full text-sm text-gray-300 file:bg-green-500 file:text-white file:px-4 file:py-2 file:rounded"
                            />
                            {newProduct.image && (
                                <img
                                    src={URL.createObjectURL(
                                        newProduct.image
                                    )}
                                    alt="Preview"
                                    className="mt-4 w-full h-64 object-contain rounded border border-gray-700"
                                />
                            )}
                        </div>
                    )}

                    <div className="flex-1 flex flex-col gap-5">
                        {role === "branch_manager" && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Select Product
                                    </label>
                                    <select
                                        name="product_id"
                                        value={newProduct.product_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                        required
                                    >
                                        <option value="">
                                            Select Product
                                        </option>
                                        {universalProducts.map((p) => (
                                            <option
                                                key={p.product_id}
                                                value={p.product_id}
                                            >
                                                {p.product_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedInfo && (
                                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                        <h4 className="text-lg font-bold mb-3">Product Details</h4>

                                        <div className="flex gap-4">
                                            {/* IMAGE LEFT */}
                                            <div className="w-48 h-48 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={selectedInfo.image_url}
                                                    alt="Product"
                                                    className="object-contain w-full h-full"
                                                />
                                            </div>

                                            {/* INFO RIGHT */}
                                            <div className="flex-1 flex flex-col gap-1">
                                                <p>
                                                    <strong>Name:</strong> {selectedInfo.product_name}
                                                </p>
                                                <p>
                                                    <strong>Description:</strong> {selectedInfo.product_description}
                                                </p>
                                                <p>
                                                    <strong>Price:</strong> ₱{selectedInfo.price}
                                                </p>

                                                {selectedInfo.refill_price && (
                                                    <p>
                                                        <strong>Refill Price:</strong> ₱{selectedInfo.refill_price}
                                                    </p>
                                                )}

                                                {selectedInfo.discounted_price && (
                                                    <p>
                                                        <strong>Discounted Price:</strong> ₱{selectedInfo.discounted_price}
                                                    </p>
                                                )}

                                                {selectedInfo.discount_until && (
                                                    <p>
                                                        <strong>Discount Until:</strong>{" "}
                                                        {new Date(selectedInfo.discount_until).toLocaleDateString("en-US")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {role === "admin" && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Product Type
                                    </label>
                                    <select
                                        name="product_type"
                                        value={newProduct.product_type}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                    >
                                        <option value="regular">
                                            Regular
                                        </option>
                                        <option value="discounted">
                                            Discounted
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Product Name
                                    </label>
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
                                    <label className="block text-sm font-semibold mb-2">
                                        Product Details
                                    </label>
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
                                        <label className="block text-sm font-semibold mb-2">
                                            Price (₱)
                                        </label>
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
                                        <label className="block text-sm font-semibold mb-2">
                                            Refill Price (₱)
                                        </label>
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

                                {newProduct.product_type ===
                                    "discounted" && (
                                        <div className="grid grid-cols-2 gap-4 items-center">
                                            <div>
                                                <label className="block text-sm font-semibold mb-2">
                                                    Discounted Price (₱)
                                                </label>
                                                <input
                                                    type="text"
                                                    name="discounted_price"
                                                    value={
                                                        newProduct.discounted_price
                                                    }
                                                    onChange={
                                                        handleNumericInput
                                                    }
                                                    onBlur={handlePriceBlur}
                                                    className="w-full px-4 py-2 rounded bg-gray-800 text-white text-base"
                                                />
                                            </div>

                                            <div className="relative">
                                                <label className="block text-sm font-semibold mb-2">
                                                    Discount Until
                                                </label>
                                                <input
                                                    type="date"
                                                    name="discount_until"
                                                    value={
                                                        newProduct.discount_until
                                                    }
                                                    onChange={handleChange}
                                                    min={getTomorrowDate()}
                                                    className="w-full bg-gray-800 text-white rounded px-3 py-2"
                                                />
                                            </div>
                                        </div>
                                    )}
                            </>
                        )}

                        {role === "branch_manager" && (
                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Stock
                                    </label>
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
                                    <label className="block text-sm font-semibold mb-2">
                                        Stock Threshold
                                    </label>
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
