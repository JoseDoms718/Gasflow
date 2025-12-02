import React, { useState } from "react";
import { Package, Check, Pencil } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function EditProductModal({ selectedProduct, setSelectedProduct, onSave }) {
    if (!selectedProduct) return null;

    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const [isEditing, setIsEditing] = useState({});
    const [editedProduct, setEditedProduct] = useState({ ...selectedProduct });
    const [loading, setLoading] = useState(false);

    const toggleEdit = (field) => setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));
    const handleEditChange = (field, value) => setEditedProduct(prev => ({ ...prev, [field]: value }));

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
        {
            label: "Branch Price",
            field: "branch_price",
            value: formatPrice(getValue("branch_price", "price")),
            editable: true,
        },
        {
            label: "Branch Refill Price",
            field: "branch_refill_price",
            value: getValue("branch_refill_price", "refill_price") != null
                ? formatPrice(getValue("branch_refill_price", "refill_price"))
                : "—",
            editable: true,
        },
    ];

    if (editedProduct.product_type === "discounted") {
        infoItems.push(
            {
                label: "Branch Discounted Price",
                field: "branch_discounted_price",
                value: editedProduct.branch_discounted_price != null
                    ? formatPrice(getValue("branch_discounted_price", "discounted_price"))
                    : "—",
                editable: true,
            },
            {
                label: "Discount Until",
                field: "discount_until",
                value: editedProduct.discount_until
                    ? new Date(editedProduct.discount_until).toLocaleDateString()
                    : "—",
                editable: false,
            }
        );
    }

    // Make sure both branch_product_id and branch_id exist
    const branchProductId = editedProduct.branch_product_id;
    const branchId = editedProduct.branch_id;

    const handleSave = async () => {
        if (!branchProductId || !branchId) return toast.error("Branch product or branch ID is missing.");

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return toast.error("You must be logged in to update prices.");

            const payload = {
                price: Number(editedProduct.branch_price) || 0,
                refill_price: Number(editedProduct.branch_refill_price) || 0,
                discounted_price: editedProduct.product_type === "discounted"
                    ? Number(editedProduct.branch_discounted_price) || 0
                    : undefined,
                branch_id: branchId // ensure branch_id is sent if needed by backend
            };

            const res = await axios.put(
                `${BASE_URL}/products/branch/update/${branchProductId}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(res.data.message);
            onSave({ ...editedProduct });
            setSelectedProduct(null); // close modal
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update prices.");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!branchProductId || !branchId) return toast.error("Branch product or branch ID is missing.");

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return toast.error("You must be logged in to sync prices.");

            const res = await axios.put(
                `${BASE_URL}/products/branch/sync/${branchProductId}`,
                { branch_id: branchId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(res.data.message);

            if (res.data.updatedBranch) {
                const { price, discounted_price, refill_price } = res.data.updatedBranch;
                setEditedProduct(prev => ({
                    ...prev,
                    branch_price: price ?? prev.branch_price,
                    branch_refill_price: refill_price ?? prev.branch_refill_price,
                    branch_discounted_price: discounted_price ?? prev.branch_discounted_price,
                }));
            }

            onSave({ ...editedProduct });
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to sync prices.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-5xl h-[520px] overflow-hidden relative flex flex-col md:flex-row">
                <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                >
                    ✕
                </button>

                <div className="flex-shrink-0 w-full md:w-1/2 h-full bg-gray-900 relative flex items-center justify-center">
                    {editedProduct.image_url ? (
                        <img
                            src={editedProduct.image_url}
                            alt={editedProduct.product_name}
                            className="w-full h-full object-cover rounded-l-2xl"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-l-2xl">
                            <Package size={90} className="text-gray-500" />
                        </div>
                    )}
                </div>

                <div className="flex-1 p-7 flex flex-col overflow-y-auto">
                    <h2 className="text-3xl font-bold text-white mb-5">{editedProduct.product_name}</h2>
                    <hr className="border-gray-700 mb-5" />
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4 text-gray-200">
                        {infoItems.map((item, idx) => {
                            const editing = isEditing[item.field];
                            return (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="font-semibold text-white w-40">{item.label}:</span>
                                    {item.editable ? (
                                        <>
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="bg-gray-800 px-2 py-1 rounded w-full"
                                                    value={editedProduct[item.field] ?? ""}
                                                    onChange={(e) => handleEditChange(item.field, e.target.value)}
                                                />
                                            ) : (
                                                <span>₱{item.value}</span>
                                            )}
                                            <button onClick={() => toggleEdit(item.field)}>
                                                {editing ? <Check size={16} /> : <Pencil size={16} />}
                                            </button>
                                        </>
                                    ) : (
                                        <span>{item.value}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-auto flex gap-4">
                        <button
                            disabled={loading}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSync}
                        >
                            Sync with SRP
                        </button>
                        <button
                            disabled={loading}
                            onClick={handleSave}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
