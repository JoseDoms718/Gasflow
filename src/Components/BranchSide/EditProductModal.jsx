
import React, { useState } from "react";
import { Pencil, Check, Camera, Package } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
export default function EditProductModal({ selectedProduct, setSelectedProduct, setProducts }) {
    const [editedProduct, setEditedProduct] = useState(selectedProduct);
    const [editedImage, setEditedImage] = useState(null);
    const [isEditing, setIsEditing] = useState({});
    const [hasEdits, setHasEdits] = useState(false);

    const handleEditChange = (field, value) => {
        setEditedProduct((prev) => ({ ...prev, [field]: value }));
        setHasEdits(true);
    };

    const handleEditImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditedImage(file);
            setHasEdits(true);
        }
    };

    const toggleEdit = (field) => {
        setIsEditing((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSaveEdits = async () => {
        if (!editedProduct) return;
        const token = localStorage.getItem("token");
        const formData = new FormData();

        Object.entries(editedProduct).forEach(([key, value]) => {
            if (value !== null && value !== undefined) formData.append(key, value);
        });
        if (editedImage) formData.append("image", editedImage);

        try {
            await axios.put(
                `${BASE_URL}/products/update/${editedProduct.product_id}`,
                formData,
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
            );

            setProducts((prev) =>
                prev.map((p) =>
                    p.product_id === editedProduct.product_id
                        ? {
                            ...p,
                            ...editedProduct,
                            stock: Number(editedProduct.stock),
                            stock_threshold: Number(editedProduct.stock_threshold),
                            image_url: editedImage ? URL.createObjectURL(editedImage) : p.image_url,
                        }
                        : p
                )
            );

            toast.success("✅ Product updated successfully!");
            setSelectedProduct(null);
        } catch (err) {
            console.error("❌ Failed to update:", err);
            toast.error("Failed to update product.");
        }
    };

    const formatPrice = (value) => {
        const num = Number(value);
        if (isNaN(num)) return "0.00";
        return num.toFixed(2);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl h-[520px] overflow-hidden relative flex flex-col md:flex-row transition-all duration-300">
                {/* Close Button */}
                <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition text-xl"
                >
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
                    <button
                        onClick={() => document.getElementById("imageUpload").click()}
                        className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition"
                    >
                        <Camera size={20} />
                    </button>
                    <input id="imageUpload" type="file" accept="image/*" className="hidden" onChange={handleEditImage} />
                </div>

                {/* Product Info */}
                <div className="flex-1 p-7 flex flex-col justify-between overflow-y-auto">
                    <div>
                        {/* Product Name */}
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
                                <button onClick={() => toggleEdit("product_description")}>
                                    {isEditing.product_description ? <Check size={16} /> : <Pencil size={16} />}
                                </button>
                            </p>

                            {/* Stock & Threshold */}
                            <p className="flex items-center gap-2">
                                <span className="font-semibold text-white w-32">Stock:</span>
                                <span
                                    className={`inline-block px-3 py-1 text-sm font-semibold rounded-lg shadow-sm ${editedProduct.stock <= editedProduct.stock_threshold
                                        ? "bg-red-600 text-white"
                                        : editedProduct.stock <= editedProduct.stock_threshold + 5
                                            ? "bg-yellow-400 text-gray-800"
                                            : "bg-green-600 text-white"
                                        }`}
                                >
                                    {editedProduct.stock}
                                </span>
                            </p>

                            <p className="flex items-center gap-2">
                                <span className="font-semibold text-white w-32">Stock Threshold:</span>
                                {isEditing.stock_threshold ? (
                                    <input
                                        type="number"
                                        value={editedProduct.stock_threshold}
                                        onChange={(e) => handleEditChange("stock_threshold", e.target.value)}
                                        className="bg-gray-800 px-2 py-1 rounded w-24"
                                    />
                                ) : (
                                    editedProduct.stock_threshold
                                )}
                                <button onClick={() => toggleEdit("stock_threshold")}>{isEditing.stock_threshold ? <Check size={16} /> : <Pencil size={16} />}</button>
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
                            <div className="flex items-center gap-2">
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
                            </div>

                            {/* Refill Price */}
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-white w-32">Refill Price:</span>
                                {isEditing.refill_price ? (
                                    <input
                                        type="number"
                                        value={editedProduct.refill_price || ""}
                                        onChange={(e) => handleEditChange("refill_price", e.target.value)}
                                        className="bg-gray-800 px-2 py-1 rounded w-32"
                                    />
                                ) : (
                                    <span>{editedProduct.refill_price ? `₱${formatPrice(editedProduct.refill_price)}` : "—"}</span>
                                )}
                                <button onClick={() => toggleEdit("refill_price")}>{isEditing.refill_price ? <Check size={16} /> : <Pencil size={16} />}</button>
                            </div>

                            {/* Discounted Section */}
                            {editedProduct.product_type === "discounted" && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white w-32">Discounted Price:</span>
                                        {isEditing.discounted_price ? (
                                            <input
                                                type="number"
                                                value={editedProduct.discounted_price}
                                                onChange={(e) => handleEditChange("discounted_price", e.target.value)}
                                                className="bg-gray-800 px-2 py-1 rounded w-32"
                                            />
                                        ) : (
                                            <span className="text-green-400 font-semibold">₱{formatPrice(editedProduct.discounted_price)}</span>
                                        )}
                                        <button onClick={() => toggleEdit("discounted_price")}>
                                            {isEditing.discounted_price ? <Check size={16} /> : <Pencil size={16} />}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white w-32">Discount Until:</span>
                                        {isEditing.discount_until ? (
                                            <input
                                                type="date"
                                                value={editedProduct.discount_until ? editedProduct.discount_until.split("T")[0] : ""}
                                                onChange={(e) => handleEditChange("discount_until", e.target.value)}
                                                className="bg-gray-800 px-2 py-1 rounded w-48 text-white"
                                            />
                                        ) : (
                                            <span>{editedProduct.discount_until ? new Date(editedProduct.discount_until).toLocaleDateString() : "—"}</span>
                                        )}
                                        <button onClick={() => toggleEdit("discount_until")}>
                                            {isEditing.discount_until ? <Check size={16} /> : <Pencil size={16} />}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Save Button */}
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
    );
}
