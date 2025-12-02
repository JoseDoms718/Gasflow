import React, { useState, useEffect } from "react";
import { Package, Eye, Pencil, Check, Camera, Calendar } from "lucide-react";
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

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return toast.error("No token found! Please login.");

                const res = await axios.get(`${BASE_URL}/products/universal`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const formatted = (res.data || []).map((p) => ({
                    ...p,
                    image_url: p.image_url?.startsWith("http")
                        ? p.image_url
                        : p.image_url
                            ? `${BASE_URL}/products/images/${p.image_url}`
                            : null,
                    price: Number(p.price) || 0,
                    discounted_price: p.discounted_price != null ? Number(p.discounted_price) : null,
                    refill_price: p.refill_price != null ? Number(p.refill_price) : null,
                }));

                setProducts(formatted);
            } catch (err) {
                console.error("❌ Failed to fetch admin products:", err);
                toast.error("Failed to load products.");
                setProducts([]);
            }
        };

        fetchProducts();
    }, [refreshTrigger]);

    // Format price
    const formatPrice = (value) => (isNaN(Number(value)) ? "0.00" : Number(value).toFixed(2));

    // Open modal
    const openEditModal = (product) => {
        setViewProduct(product);
        setEditedProduct({ ...product, discount_until_prev: product.discount_until });
        setEditedImage(null);
        setIsEditing({});
        setHasEdits(false);
    };

    // Toggle field editing
    const toggleEdit = (field) => setIsEditing((prev) => ({ ...prev, [field]: !prev[field] }));

    // Handle input changes
    const handleEditChange = (field, value) => {
        let newValue = value;

        if (["price", "discounted_price", "refill_price"].includes(field)) {
            newValue = value === "" ? "" : Number(value);
            const price = Number(editedProduct.price);
            const discounted = Number(editedProduct.discounted_price);

            if (field === "discounted_price" && !isNaN(newValue) && newValue >= price) {
                newValue = price - 1;
                toast.error(`Discounted price cannot exceed regular price. Set to ₱${newValue}`);
            }

            if (field === "refill_price") {
                const limit = editedProduct.product_type === "discounted" ? discounted : price;
                if (!isNaN(newValue) && newValue >= limit) {
                    newValue = limit - 1;
                    toast.error(`Refill price cannot exceed ${editedProduct.product_type === "discounted" ? "discounted" : "main"} price. Set to ₱${newValue}`);
                }
            }
        }

        if (field === "discount_until") {
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const prevDate = editedProduct.discount_until_prev ? new Date(editedProduct.discount_until_prev) : null;

            if (selectedDate <= today) return toast.error("Discount until date must be a future date.");
            if (prevDate && selectedDate.getTime() === prevDate.getTime())
                return toast.error("Please choose a different date than the current discount until date.");
        }

        setEditedProduct((prev) => ({ ...prev, [field]: newValue }));
        setHasEdits(true);
    };

    // Handle image change
    const handleEditImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditedImage(file);
            setHasEdits(true);
        }
    };

    // Get tomorrow's date in YYYY-MM-DD for min attribute
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const dd = String(tomorrow.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    // Save edits
    const handleSaveEdits = async () => {
        if (!editedProduct) return;

        const requiredFields = ["price", "refill_price"];
        if (editedProduct.product_type === "discounted") requiredFields.push("discounted_price");

        for (const field of requiredFields) {
            const value = editedProduct[field];
            if (value === "" || value == null || value <= 0)
                return toast.error(`${field.replace("_", " ")} must be greater than 0.`);
        }

        // Price safeguards
        if (editedProduct.refill_price > editedProduct.price - 1)
            return toast.error("Refill price cannot exceed the main price minus 1.");

        if (editedProduct.product_type === "discounted") {
            if (editedProduct.discounted_price > editedProduct.price - 1)
                return toast.error("Discounted price cannot exceed the main price minus 1.");
            if (editedProduct.refill_price > editedProduct.discounted_price - 1)
                return toast.error("Refill price cannot exceed the discounted price minus 1.");
        }

        const payload = {
            product_name: editedProduct.product_name,
            product_type: editedProduct.product_type,
            price: editedProduct.price,
            refill_price: editedProduct.refill_price,
            ...(editedProduct.product_type === "discounted" && {
                discounted_price: editedProduct.discounted_price,
                discount_until: editedProduct.discount_until,
            }),
            product_description: editedProduct.product_description,
        };

        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => value != null && formData.append(key, value.toString()));
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
                                        ₱{formatPrice(p.product_type === "discounted" && p.discounted_price != null ? p.discounted_price : p.price)}
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
                        <button onClick={() => setViewProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>

                        {/* Image Section */}
                        <div className="flex-shrink-0 w-full md:w-1/2 h-full bg-gray-900 relative">
                            <img
                                src={editedImage ? URL.createObjectURL(editedImage) : editedProduct.image_url || ""}
                                alt="Product"
                                className="w-full h-full object-cover"
                            />
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
                                    ) : editedProduct.product_name}
                                    <button onClick={() => toggleEdit("product_name")}>{isEditing.product_name ? <Check size={18} /> : <Pencil size={18} />}</button>
                                </h2>

                                <hr className="border-gray-700 mb-5" />

                                <div className="space-y-2 text-[1.05rem] leading-relaxed text-gray-200">
                                    {[
                                        { label: "Details", field: "product_description", type: "textarea" },
                                        { label: "Type", field: "product_type", type: "select", options: ["regular", "discounted"] },
                                        { label: "Price", field: "price", type: "number" },
                                        { label: "Refill Price", field: "refill_price", type: "number", condition: (p) => ["regular", "discounted"].includes(p.product_type) },
                                        { label: "Discounted Price", field: "discounted_price", type: "number", condition: (p) => p.product_type === "discounted" },
                                        { label: "Discount Until", field: "discount_until", type: "date", condition: (p) => p.product_type === "discounted" },
                                    ].map(({ label, field, type, options, condition }) => {
                                        if (condition && !condition(editedProduct)) return null;
                                        const editing = isEditing[field];
                                        return (
                                            <p key={field} className="flex items-center gap-1">
                                                <span className="font-semibold text-white">{label}:</span>
                                                {editing ? (
                                                    type === "textarea" ? (
                                                        <textarea
                                                            value={editedProduct[field]}
                                                            onChange={(e) => handleEditChange(field, e.target.value)}
                                                            className="bg-gray-800 px-2 py-1 rounded w-full"
                                                        />
                                                    ) : type === "select" ? (
                                                        <select
                                                            value={editedProduct[field]}
                                                            onChange={(e) => handleEditChange(field, e.target.value)}
                                                            className="bg-gray-800 px-2 py-1 rounded"
                                                        >
                                                            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    ) : type === "date" ? (
                                                        <div className="relative">
                                                            <input
                                                                type="date"
                                                                value={editedProduct[field]?.split("T")[0] || ""}
                                                                min={getTomorrowDate()}
                                                                onChange={(e) => handleEditChange(field, e.target.value)}
                                                                className="bg-gray-800 text-white px-2 py-1 rounded w-32 appearance-none"
                                                            />
                                                            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={16} />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={editedProduct[field]}
                                                            onChange={(e) => handleEditChange(field, e.target.value)}
                                                            className="bg-gray-800 px-2 py-1 rounded w-32"
                                                        />
                                                    )
                                                ) : type === "date" ? (
                                                    <span>{editedProduct[field] ? new Date(editedProduct[field]).toLocaleDateString() : "N/A"}</span>
                                                ) : type === "number" ? (
                                                    <span>₱{formatPrice(editedProduct[field])}</span>
                                                ) : (
                                                    <span>{editedProduct[field] || "N/A"}</span>
                                                )}
                                                <button onClick={() => toggleEdit(field)}>{editing ? <Check size={16} /> : <Pencil size={16} />}</button>
                                            </p>
                                        );
                                    })}
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
