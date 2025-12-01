import React, { useState, useEffect } from "react";
import { Package, Eye, Pencil, Check, Camera } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function AdminProducts({ refreshTrigger, borderless = true }) {
    const [products, setProducts] = useState([]);
    const [viewProduct, setViewProduct] = useState(null);
    const [editedProduct, setEditedProduct] = useState({});
    const [editedImage, setEditedImage] = useState(null);
    const [isEditing, setIsEditing] = useState({});
    const [hasEdits, setHasEdits] = useState(false);
    const BASE_URL = import.meta.env.VITE_BASE_URL;

    // Fetch products from universal endpoint
    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return toast.error("No token found! Please login.");

            const endpoint = `${BASE_URL}/products/universal`;
            const res = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });

            const formatted = (res.data || []).map((p) => ({
                ...p,
                image_url: p.image_url
                    ? p.image_url.startsWith("http")
                        ? p.image_url
                        : `${BASE_URL}/products/images/${p.image_url}`
                    : null,
                price: Number(p.price) || 0,
                discounted_price: p.discounted_price !== null ? Number(p.discounted_price) : null,
                refill_price: p.refill_price !== null ? Number(p.refill_price) : null,
                stock: p.stock ?? 0,
                stock_threshold: p.stock_threshold ?? 0,
            }));

            setProducts(formatted);
        } catch (err) {
            console.error("❌ Failed to fetch admin products:", err);
            toast.error("Failed to load products. See console for details.");
            setProducts([]);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [refreshTrigger]);

    const formatPrice = (value) => (isNaN(Number(value)) ? "0.00" : Number(value).toFixed(2));

    const openEditModal = (product) => {
        setViewProduct(product);
        setEditedProduct({ ...product });
        setEditedImage(null);
        setIsEditing({});
        setHasEdits(false);
    };

    const handleEditChange = (field, value) => {
        let newValue = value;
        if (["price", "discounted_price", "refill_price"].includes(field)) {
            newValue = Number(value);
            const price = Number(editedProduct.price);
            if (field !== "price" && !isNaN(newValue) && newValue >= price) {
                newValue = price - 1;
                toast.error(
                    `${field === "discounted_price" ? "Discounted" : "Refill"} price cannot exceed regular price. Automatically set to ₱${newValue}`
                );
            }
        }
        setEditedProduct((prev) => ({ ...prev, [field]: newValue }));
        setHasEdits(true);
    };

    const toggleEdit = (field) => setIsEditing((prev) => ({ ...prev, [field]: !prev[field] }));

    const handleEditImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditedImage(file);
            setHasEdits(true);
        }
    };

    const handleSaveEdits = async () => {
        if (!editedProduct) return;

        const payload = {
            product_name: editedProduct.product_name,
            product_type: editedProduct.product_type,
            price: editedProduct.price,
        };

        if (editedProduct.product_type === "regular" && editedProduct.refill_price !== undefined) {
            payload.refill_price = editedProduct.refill_price;
        }

        if (editedProduct.product_type === "discounted") {
            if (editedProduct.discounted_price !== undefined) payload.discounted_price = editedProduct.discounted_price;
            if (editedProduct.discount_until) payload.discount_until = editedProduct.discount_until;
        }

        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) formData.append(key, value.toString());
        });
        if (editedImage) formData.append("image", editedImage);

        try {
            const token = localStorage.getItem("token");
            await axios.put(`${BASE_URL}/products/update/${editedProduct.product_id}`, formData, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
            });

            setProducts((prev) =>
                prev.map((p) =>
                    p.product_id === editedProduct.product_id
                        ? { ...p, ...payload, image_url: editedImage ? URL.createObjectURL(editedImage) : p.image_url }
                        : p
                )
            );

            toast.success("✅ Product updated successfully!");
            setViewProduct(null);
        } catch (err) {
            console.error("❌ Failed to update product:", err);
            toast.error("Failed to update product.");
        }
    };

    return (
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="bg-gray-900 text-white sticky top-0 z-20 shadow-md">
                <table className="min-w-full text-center text-sm">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg text-left">Product</th>
                            <th className="px-4 py-3 w-28">Price (₱)</th>
                            <th className="px-4 py-3 w-28 rounded-tr-lg">Action</th>
                        </tr>
                    </thead>
                </table>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
                <table className="min-w-full text-gray-800 text-sm text-center border-collapse">
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-gray-500">
                                    No products available.
                                </td>
                            </tr>
                        ) : (
                            products.map((p) => (
                                <tr key={p.product_id} className={`hover:bg-gray-50 ${borderless ? "" : "border-b"}`}>
                                    <td className="px-4 py-3 flex items-center gap-3 justify-start">
                                        <div className="w-14 h-14 flex-shrink-0">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg text-gray-400">
                                                    <Package size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-semibold text-gray-900 break-words whitespace-normal max-w-[200px]" title={p.product_name}>
                                            {p.product_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 w-28">
                                        ₱ {formatPrice(p.product_type === "discounted" && p.discounted_price !== null ? p.discounted_price : p.price)}
                                    </td>
                                    <td className="px-4 py-3 w-28">
                                        <button
                                            onClick={() => openEditModal(p)}
                                            className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm w-full"
                                        >
                                            <Eye className="w-4 h-4" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* EDIT MODAL */}
            {viewProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl h-[520px] overflow-hidden relative flex flex-col md:flex-row">
                        {/* Close Button */}
                        <button onClick={() => setViewProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">
                            ✕
                        </button>

                        {/* Image Section */}
                        <div className="flex-shrink-0 w-full md:w-1/2 h-full bg-gray-900 relative">
                            {editedImage ? (
                                <img src={URL.createObjectURL(editedImage)} alt="Preview" className="w-full h-full object-cover" />
                            ) : editedProduct.image_url ? (
                                <img src={editedProduct.image_url} alt={editedProduct.product_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <Package size={90} className="text-gray-500" />
                                </div>
                            )}
                            <button onClick={() => document.getElementById("editImageInput").click()} className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 p-2 rounded-full">
                                <Camera size={20} />
                            </button>
                            <input id="editImageInput" type="file" accept="image/*" className="hidden" onChange={handleEditImage} />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 p-7 flex flex-col justify-between overflow-y-auto">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-2">
                                    {isEditing.product_name ? (
                                        <input
                                            type="text"
                                            value={editedProduct.product_name}
                                            onChange={(e) => handleEditChange("product_name", e.target.value)}
                                            className="bg-gray-800 px-2 py-1 rounded w-full"
                                        />
                                    ) : (
                                        editedProduct.product_name
                                    )}
                                    <button onClick={() => toggleEdit("product_name")}>{isEditing.product_name ? <Check size={18} /> : <Pencil size={18} />}</button>
                                </h2>

                                <hr className="border-gray-700 mb-5" />

                                <div className="space-y-3.5 text-[1.05rem] leading-relaxed text-gray-200">
                                    {/* Description */}
                                    <p className="flex items-center gap-2">
                                        <span className="font-semibold text-white w-32">Details:</span>
                                        {isEditing.product_description ? (
                                            <textarea
                                                value={editedProduct.product_description}
                                                onChange={(e) => handleEditChange("product_description", e.target.value)}
                                                className="bg-gray-800 px-2 py-1 rounded w-full"
                                            />
                                        ) : (
                                            editedProduct.product_description || "No details provided."
                                        )}
                                        <button onClick={() => toggleEdit("product_description")}>{isEditing.product_description ? <Check size={16} /> : <Pencil size={16} />}</button>
                                    </p>

                                    {/* Type */}
                                    <p className="flex items-center gap-2">
                                        <span className="font-semibold text-white w-32">Type:</span>
                                        {isEditing.product_type ? (
                                            <select
                                                value={editedProduct.product_type}
                                                onChange={(e) => handleEditChange("product_type", e.target.value)}
                                                className="bg-gray-800 px-2 py-1 rounded"
                                            >
                                                <option value="regular">Regular</option>
                                                <option value="discounted">Discounted</option>
                                            </select>
                                        ) : (
                                            <span className="capitalize">{editedProduct.product_type}</span>
                                        )}
                                        <button onClick={() => toggleEdit("product_type")}>{isEditing.product_type ? <Check size={16} /> : <Pencil size={16} />}</button>
                                    </p>

                                    {/* Price */}
                                    <p className="flex items-center gap-2">
                                        <span className="font-semibold text-white w-32">Price:</span>
                                        {isEditing.price ? (
                                            <input
                                                type="number"
                                                value={editedProduct.price}
                                                onChange={(e) => handleEditChange("price", e.target.value)}
                                                className="bg-gray-800 px-2 py-1 rounded w-32"
                                            />
                                        ) : (
                                            <span>₱{formatPrice(editedProduct.price)}</span>
                                        )}
                                        <button onClick={() => toggleEdit("price")}>{isEditing.price ? <Check size={16} /> : <Pencil size={16} />}</button>
                                    </p>

                                    {/* Refill Price (Regular) */}
                                    {editedProduct.product_type === "regular" && (
                                        <p className="flex items-center gap-2">
                                            <span className="font-semibold text-white w-32">Refill Price:</span>
                                            {isEditing.refill_price ? (
                                                <input
                                                    type="number"
                                                    value={editedProduct.refill_price}
                                                    onChange={(e) => handleEditChange("refill_price", e.target.value)}
                                                    className="bg-gray-800 px-2 py-1 rounded w-32"
                                                />
                                            ) : (
                                                <span>₱{formatPrice(editedProduct.refill_price)}</span>
                                            )}
                                            <button onClick={() => toggleEdit("refill_price")}>{isEditing.refill_price ? <Check size={16} /> : <Pencil size={16} />}</button>
                                        </p>
                                    )}

                                    {/* Discounted (Discounted) */}
                                    {editedProduct.product_type === "discounted" && (
                                        <>
                                            <p className="flex items-center gap-2">
                                                <span className="font-semibold text-white w-32">Discounted Price:</span>
                                                {isEditing.discounted_price ? (
                                                    <input
                                                        type="number"
                                                        value={editedProduct.discounted_price}
                                                        onChange={(e) => handleEditChange("discounted_price", e.target.value)}
                                                        className="bg-gray-800 px-2 py-1 rounded w-32"
                                                    />
                                                ) : (
                                                    <span>₱{formatPrice(editedProduct.discounted_price)}</span>
                                                )}
                                                <button onClick={() => toggleEdit("discounted_price")}>{isEditing.discounted_price ? <Check size={16} /> : <Pencil size={16} />}</button>
                                            </p>

                                            <p className="flex items-center gap-2">
                                                <span className="font-semibold text-white w-32">Discount Until:</span>
                                                {isEditing.discount_until ? (
                                                    <input
                                                        type="date"
                                                        value={editedProduct.discount_until?.split("T")[0] || ""}
                                                        onChange={(e) => handleEditChange("discount_until", e.target.value)}
                                                        className="bg-gray-800 px-2 py-1 rounded w-32"
                                                    />
                                                ) : (
                                                    <span>{editedProduct.discount_until ? new Date(editedProduct.discount_until).toLocaleDateString() : "N/A"}</span>
                                                )}
                                                <button onClick={() => toggleEdit("discount_until")}>{isEditing.discount_until ? <Check size={16} /> : <Pencil size={16} />}</button>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {hasEdits && (
                                <button
                                    onClick={handleSaveEdits}
                                    className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition active:scale-95"
                                >
                                    Save Changes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
