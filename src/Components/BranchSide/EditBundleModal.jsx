import React, { useState, useEffect } from "react";
import axios from "axios";
import { Package, Check, Pencil, X } from "lucide-react";
import { toast } from "react-hot-toast";

export default function EditBundleModal({ selectedBundle, setSelectedBundle, onSave, userRole }) {
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const token = localStorage.getItem("token");
    const isAdmin = userRole === "admin";

    const [editedBundle, setEditedBundle] = useState(null);
    const [isEditing, setIsEditing] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [touched, setTouched] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load selected bundle and set prices only from branch, not from items
    useEffect(() => {
        if (!selectedBundle) {
            setEditedBundle(null);
            return;
        }

        const currentBranchId =
            selectedBundle.selected_branch_id ??
            selectedBundle.branch_id ??
            selectedBundle.branch_prices?.[0]?.branch_id ??
            null;

        const branchPrice =
            (selectedBundle.branch_prices || []).find((b) => b.branch_id === currentBranchId) ||
            selectedBundle.branch_prices?.[0] ||
            {};

        const branch_bundle_price_id =
            branchPrice.branch_bundle_price_id ??
            selectedBundle.branch_prices?.[0]?.branch_bundle_price_id ??
            selectedBundle.branch_bundle_price_id ??
            null;

        const computedBranchPrice = branchPrice.branch_price ?? selectedBundle.branch_price ?? selectedBundle.price ?? 0;
        const computedBranchDiscounted = branchPrice.branch_discounted_price ?? selectedBundle.branch_discounted_price ?? null;

        setEditedBundle({
            ...selectedBundle,
            branch_price: computedBranchPrice,
            branch_discounted_price: computedBranchDiscounted,
            branch_bundle_price_id,
            selected_branch_id: currentBranchId,
            items: selectedBundle.items || [], // items for display only
        });

        setTouched(false);
        setIsEditing({});
    }, [selectedBundle]);

    // Validate changes
    useEffect(() => {
        if (!editedBundle || !selectedBundle) return;

        const priceValid = Number(editedBundle.branch_price) > 0;
        const discountedValid = editedBundle.branch_discounted_price === null || Number(editedBundle.branch_discounted_price) >= 0;
        const discountCheck =
            editedBundle.branch_discounted_price === null ||
            Number(editedBundle.branch_discounted_price) <= Number(editedBundle.branch_price);

        const changed =
            Number(editedBundle.branch_price) !== Number(selectedBundle.branch_price ?? selectedBundle.price ?? 0) ||
            (editedBundle.branch_discounted_price !== null &&
                Number(editedBundle.branch_discounted_price) !== Number(selectedBundle.branch_discounted_price ?? 0));

        setHasChanges(priceValid && discountedValid && discountCheck && changed);
    }, [editedBundle, selectedBundle]);

    if (!editedBundle) return null;

    const toggleEdit = (field) => setIsEditing((prev) => ({ ...prev, [field]: !prev[field] }));

    const handleEditChange = (field, value) => {
        setTouched(true);
        setEditedBundle((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const formatPrice = (value) => {
        if (value === null || value === undefined || value === "") return "0.00";
        const num = Number(value);
        return isNaN(num) ? "0.00" : num.toFixed(2);
    };

    const handleSave = async () => {
        if (!hasChanges || !editedBundle?.branch_bundle_price_id) return;

        setLoading(true);
        try {
            const res = await axios.put(
                `${BASE_URL}/bundles/branch/edit/bundle/${editedBundle.branch_bundle_price_id}`,
                {
                    branch_price: editedBundle.branch_price,
                    branch_discounted_price: editedBundle.branch_discounted_price,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Bundle prices updated successfully!");
            onSave?.(res.data?.data ?? editedBundle);
            setSelectedBundle(null);
            setTouched(false);
        } catch (err) {
            console.error("Failed to save bundle:", err);
            toast.error("Failed to update bundle prices.");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!editedBundle?.branch_bundle_price_id) {
            toast.error("Cannot sync: Branch bundle price ID is missing.");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.put(
                `${BASE_URL}/bundles/branch/bundle/sync/${editedBundle.branch_bundle_price_id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setEditedBundle((prev) => ({
                ...prev,
                branch_price: res.data.branch_price ?? prev.branch_price,
                branch_discounted_price: res.data.branch_discounted_price ?? prev.branch_discounted_price,
            }));

            toast.success("Bundle prices synced successfully!");
            onSave?.(res.data);
            setTouched(false);
        } catch (err) {
            console.error("Sync failed:", err);
            toast.error("Failed to sync bundle prices.");
        } finally {
            setLoading(false);
        }
    };

    const getBundleImageUrl = (filename) =>
        filename ? `${BASE_URL}/uploads/products/bundle/${filename}` : null;

    const canClickButton = Boolean(editedBundle.branch_bundle_price_id) && (!touched || hasChanges) && !loading;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] overflow-hidden relative flex flex-col">
                {/* IMAGE + CLOSE */}
                <div className="w-full h-56 bg-gray-900 relative flex items-center justify-center rounded-t-2xl overflow-hidden">
                    {editedBundle.bundle_image ? (
                        <img src={getBundleImageUrl(editedBundle.bundle_image)} alt={editedBundle.bundle_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Package size={70} className="text-gray-500" />
                        </div>
                    )}

                    <button onClick={() => setSelectedBundle(null)} className="absolute top-3 right-3 text-gray-200 hover:text-white bg-black bg-opacity-40 rounded-full p-1 flex items-center justify-center">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex flex-1 overflow-hidden p-5 gap-6">
                    {/* PRICES LEFT */}
                    <div className="w-1/3 flex flex-col gap-4">
                        <h2 className="text-2xl font-bold text-white text-center">{editedBundle.bundle_name}</h2>
                        <hr className="border-gray-700" />

                        <div className="flex flex-col gap-3 text-gray-200">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">Price:</span>
                                <div className="flex items-center gap-2">
                                    {isAdmin ? (
                                        isEditing.branch_price ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="bg-gray-800 px-2 py-1 rounded w-32"
                                                value={editedBundle.branch_price ?? ""}
                                                onChange={(e) => handleEditChange("branch_price", e.target.value)}
                                            />
                                        ) : (
                                            <span>₱{formatPrice(editedBundle.branch_price)}</span>
                                        )
                                    ) : (
                                        <span>₱{formatPrice(editedBundle.branch_price)}</span>
                                    )}
                                    {isAdmin && (
                                        <button onClick={() => toggleEdit("branch_price")}>
                                            {isEditing.branch_price ? <Check size={16} /> : <Pencil size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">Discounted Price:</span>
                                <div className="flex items-center gap-2">
                                    {isAdmin ? (
                                        isEditing.branch_discounted_price ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="bg-gray-800 px-2 py-1 rounded w-32"
                                                value={editedBundle.branch_discounted_price ?? ""}
                                                onChange={(e) => handleEditChange("branch_discounted_price", e.target.value)}
                                            />
                                        ) : (
                                            <span>₱{editedBundle.branch_discounted_price !== null ? formatPrice(editedBundle.branch_discounted_price) : "-"}</span>
                                        )
                                    ) : (
                                        <span>₱{editedBundle.branch_discounted_price !== null ? formatPrice(editedBundle.branch_discounted_price) : "-"}</span>
                                    )}
                                    {isAdmin && (
                                        <button onClick={() => toggleEdit("branch_discounted_price")}>
                                            {isEditing.branch_discounted_price ? <Check size={16} /> : <Pencil size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="font-semibold text-white">Description:</span>
                                <span className="text-gray-400">{editedBundle.description || "No description"}</span>
                            </div>
                        </div>
                    </div>

                    {/* PRODUCTS RIGHT */}
                    <div className="flex-1 flex flex-col">
                        <h3 className="font-bold text-white mb-2">Products in Bundle</h3>
                        <div className="flex-1 flex flex-col gap-2 overflow-y-auto border border-gray-700 rounded p-2">
                            {editedBundle.items && editedBundle.items.length > 0 ? (
                                editedBundle.items.map((p) => (
                                    <div key={p.product_id} className="flex items-center gap-3 border-b border-gray-700 pb-1 last:border-b-0">
                                        <div className="w-14 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                            {p.product_image ? (
                                                <img src={`${BASE_URL}/uploads/products/${p.product_image}`} alt={p.product_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-full h-full text-gray-500" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold">{p.product_name}</p>
                                            <p className="text-gray-400 text-sm">
                                                Price: ₱{formatPrice(p.price ?? p.product_price)}
                                            </p>
                                        </div>
                                        <p className="text-gray-200 text-sm">Qty: {p.quantity}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">No products in this bundle.</p>
                            )}
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <div className="p-5">
                        <button
                            onClick={touched ? handleSave : handleSync}
                            disabled={!canClickButton}
                            className={`w-full py-3 ${touched ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg font-semibold transition active:scale-95 ${!canClickButton ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {loading ? "Processing..." : touched ? "Save Changes" : "Sync Bundle Prices"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
