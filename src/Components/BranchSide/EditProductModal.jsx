import React, { useState, useEffect } from "react";
import { Package, Check, Pencil, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function EditProductModal({ selectedProduct, setSelectedProduct, onSave }) {
    if (!selectedProduct) return null;

    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const [editedProduct, setEditedProduct] = useState({ ...selectedProduct });
    const [isEditing, setIsEditing] = useState({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const toggleEdit = (field) => setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));

    const handleEditChange = (field, value) => {
        let num = value === "" ? "" : Number(value);

        if (field === "branch_discounted_price" || field === "branch_refill_price") {
            const maxPrice = Number(editedProduct.branch_price) - 1;
            const maxDiscounted = editedProduct.product_type === "discounted"
                ? Number(editedProduct.branch_discounted_price) - 1
                : maxPrice;

            if (field === "branch_refill_price" && editedProduct.product_type === "discounted") {
                // Refill cannot exceed discounted price - 1
                if (num !== "" && num > maxDiscounted) num = maxDiscounted;
            } else if (field === "branch_discounted_price") {
                // Discounted price cannot exceed branch price - 1
                if (num !== "" && num > maxPrice) num = maxPrice;
            } else {
                // Normal upper bound: branch price - 1
                if (num !== "" && num > maxPrice) num = maxPrice;
            }

            if (num !== "" && num < 0) num = 0;
        }

        setEditedProduct(prev => ({ ...prev, [field]: num }));
    };

    // Detect changes to show/hide Save button
    useEffect(() => {
        const changed = Object.keys(editedProduct).some(
            key => editedProduct[key] !== selectedProduct[key]
        );
        setHasChanges(changed);
    }, [editedProduct, selectedProduct]);

    const formatPrice = (value) => {
        const num = Number(value);
        return isNaN(num) ? "0.00" : num.toFixed(2);
    };

    const getValue = (branchField, fallbackField) =>
        editedProduct[branchField] != null ? editedProduct[branchField] : editedProduct[fallbackField];

    const infoItems = [
        { label: "Details", value: editedProduct.product_description || "No details provided." },
        { label: "Stock", value: editedProduct.stock },
        { label: "Stock Threshold", value: editedProduct.stock_threshold },
        { label: "Type", value: editedProduct.product_type },
        { label: "Branch Price", field: "branch_price", value: formatPrice(getValue("branch_price", "price")), editable: true },
        {
            label: "Branch Refill Price",
            field: "branch_refill_price",
            value: getValue("branch_refill_price", "refill_price") != null
                ? formatPrice(getValue("branch_refill_price", "refill_price"))
                : "—",
            editable: true
        }
    ];

    if (editedProduct.product_type === "discounted") {
        infoItems.push(
            {
                label: "Branch Discounted Price",
                field: "branch_discounted_price",
                value: editedProduct.branch_discounted_price != null
                    ? formatPrice(getValue("branch_discounted_price", "discounted_price"))
                    : "—",
                editable: true
            },
            {
                label: "Discount Until",
                field: "discount_until",
                value: editedProduct.discount_until
                    ? new Date(editedProduct.discount_until).toLocaleDateString()
                    : "—",
                editable: false
            }
        );
    }

    const branchProductId = editedProduct.branch_price_id;

    const handleSave = async () => {
        if (!branchProductId) return toast.error("Branch product ID is missing.");

        // Validate inputs
        const requiredFields = ["branch_price", "branch_refill_price"];
        if (editedProduct.product_type === "discounted") requiredFields.push("branch_discounted_price");

        for (const field of requiredFields) {
            const value = editedProduct[field];
            if (value === "" || value == null || value <= 0) {
                return toast.error(`Cannot save. ${field.replace("_", " ")} must be greater than 0.`);
            }
        }

        if (editedProduct.branch_refill_price > editedProduct.branch_price - 1)
            return toast.error("Branch refill price cannot exceed branch price minus 1.");

        if (editedProduct.product_type === "discounted") {
            if (editedProduct.branch_discounted_price > editedProduct.branch_price - 1)
                return toast.error("Branch discounted price cannot exceed branch price minus 1.");
            if (editedProduct.branch_refill_price > editedProduct.branch_discounted_price - 1)
                return toast.error("Branch refill price cannot exceed discounted price minus 1.");
        }


        const payload = {
            price: Number(editedProduct.branch_price),
            refill_price: Number(editedProduct.branch_refill_price),
            discounted_price: editedProduct.product_type === "discounted"
                ? Number(editedProduct.branch_discounted_price)
                : undefined
        };

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return toast.error("You must be logged in to update prices.");

            const res = await axios.put(
                `${BASE_URL}/products/branch/update/${branchProductId}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(res.data.message);
            onSave?.({ ...editedProduct });
            setSelectedProduct(null);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update prices.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const handleSync = async () => {
        if (!branchProductId) return toast.error("Branch product ID is missing.");

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return toast.error("You must be logged in to sync.");

            const res = await axios.put(
                `${BASE_URL}/products/branch/sync/${branchProductId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("✅ Prices synced successfully!");

            const { price, discounted_price, refill_price, ...rest } = res.data.syncedPrices || {};

            const updatedProduct = {
                ...editedProduct,
                branch_price: price ?? editedProduct.branch_price,
                branch_discounted_price: discounted_price != null ? Math.min(discounted_price, price - 1) : editedProduct.branch_discounted_price,
                branch_refill_price: refill_price != null ? Math.min(refill_price, price - 1) : editedProduct.branch_refill_price,
                ...rest
            };

            onSave?.(updatedProduct); // Update parent immediately
            setSelectedProduct(null);  // Close modal
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to sync prices.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl h-[600px] overflow-hidden relative flex flex-col">

                {/* IMAGE with close button */}
                <div className="w-full h-56 bg-gray-900 relative flex items-center justify-center rounded-t-2xl overflow-hidden">
                    {editedProduct.image_url ? (
                        <img
                            src={editedProduct.image_url}
                            alt={editedProduct.product_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Package size={70} className="text-gray-500" />
                        </div>
                    )}

                    {/* CLOSE BUTTON */}
                    <button
                        onClick={() => setSelectedProduct(null)}
                        className="absolute top-3 right-3 text-gray-200 hover:text-white bg-black bg-opacity-40 rounded-full p-1 flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* DETAILS */}
                <div className="p-5 flex flex-col overflow-y-auto flex-1">
                    <h2 className="text-2xl font-bold text-white mb-4 text-center">{editedProduct.product_name}</h2>
                    <hr className="border-gray-700 mb-4" />

                    <div className="flex flex-col gap-2 text-gray-200">
                        {infoItems.map((item, idx) => {
                            const editing = isEditing[item.field];
                            return (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="font-semibold text-white">{item.label}:</span>
                                    {item.editable ? (
                                        <div className="flex items-center gap-2">
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="bg-gray-800 px-2 py-1 rounded w-24"
                                                    value={editedProduct[item.field] ?? ""}
                                                    onChange={(e) => handleEditChange(item.field, e.target.value)}
                                                />
                                            ) : (
                                                <span>₱{item.value}</span>
                                            )}
                                            <button onClick={() => toggleEdit(item.field)}>
                                                {editing ? <Check size={16} /> : <Pencil size={16} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <span>{item.value}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* BUTTONS */}
                    <div className="mt-auto flex gap-4 pt-4">
                        {!hasChanges ? (
                            <button
                                disabled={loading}
                                onClick={handleSync}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sync with products
                            </button>
                        ) : (
                            <button
                                disabled={loading}
                                onClick={handleSave}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
