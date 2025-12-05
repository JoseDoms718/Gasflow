import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AddBranchBundleModal({ setShowBundleForm, refreshBundles }) {
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const token = localStorage.getItem("token");

    const [bundles, setBundles] = useState([]);
    const [selectedBundle, setSelectedBundle] = useState(null);

    // Fetch eligible bundles for branch
    useEffect(() => {
        const fetchBundles = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/bundles/branch/check-available`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setBundles(res.data.availableBundles || []);
                } else {
                    console.error(res.data.error);
                    toast.error(res.data.error || "Failed to fetch bundles");
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to fetch bundles");
            }
        };

        fetchBundles();
    }, []);

    const handleSelectBundle = (bundle) => setSelectedBundle(bundle);

    const handleAddBundle = async () => {
        if (!selectedBundle) return toast.error("Please select a bundle.");

        try {
            await axios.post(
                `${BASE_URL}/bundles/branch/add-bundle`,
                { bundle_id: selectedBundle.bundle_id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Bundle added to branch successfully!");
            refreshBundles?.();
            setShowBundleForm(false);
        } catch (err) {
            console.error("Failed to add bundle:", err);
            toast.error("Failed to add bundle.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white rounded-lg shadow-lg w-full max-w-6xl h-[36rem] flex flex-col">
                <h3 className="text-xl font-bold p-4 text-center border-b border-gray-700">
                    Add Bundle to Branch
                </h3>

                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT PANEL */}
                    <div className="w-1/2 h-full border-r border-gray-700 p-2 overflow-y-auto">
                        {bundles.length ? (
                            bundles.map((bundle) => (
                                <div
                                    key={bundle.bundle_id}
                                    onClick={() => handleSelectBundle(bundle)}
                                    className={`p-3 mb-2 rounded cursor-pointer border ${selectedBundle?.bundle_id === bundle.bundle_id
                                        ? "border-purple-500 bg-gray-800"
                                        : "border-gray-700 hover:bg-gray-800"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                            {bundle.bundle_image ? (
                                                <img
                                                    src={`${BASE_URL}/uploads/products/bundle/${bundle.bundle_image}`}
                                                    alt={bundle.bundle_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-gray-400 text-xs flex items-center justify-center h-full">
                                                    No Image
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold">{bundle.bundle_name}</h4>
                                            <p className="text-gray-400 text-sm">{bundle.description}</p>
                                            <p className="text-sm mt-1">Price: ₱{parseFloat(bundle.price).toFixed(2)}</p>
                                            {bundle.discounted_price && (
                                                <p className="text-sm mt-1">
                                                    Discount: ₱{parseFloat(bundle.discounted_price).toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-sm text-center mt-4">No bundles available.</p>
                        )}
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="w-1/2 h-full flex flex-col">
                        {selectedBundle ? (
                            <>
                                {/* SCROLLABLE PRODUCT LIST */}
                                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                                    <h4 className="font-bold text-lg">{selectedBundle.bundle_name}</h4>
                                    <p>{selectedBundle.description}</p>
                                    <p>Price: ₱{parseFloat(selectedBundle.price).toFixed(2)}</p>
                                    {selectedBundle.discounted_price && (
                                        <p>Discounted Price: ₱{parseFloat(selectedBundle.discounted_price).toFixed(2)}</p>
                                    )}

                                    <h5 className="font-semibold mt-2">Products in Bundle:</h5>
                                    <div className="flex flex-col gap-3">
                                        {selectedBundle.items.map((item) => {
                                            const price = item.product_discounted_price || item.product_price;
                                            const totalPrice = (parseFloat(price) * item.required_qty).toFixed(2);
                                            return (
                                                <div
                                                    key={item.product_id}
                                                    className="flex gap-4 items-center border p-2 rounded"
                                                >
                                                    <div className="w-16 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                                        {item.product_image ? (
                                                            <img
                                                                src={`${BASE_URL}/uploads/products/${item.product_image}`}
                                                                alt={item.product_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-gray-400 text-xs flex items-center justify-center h-full">
                                                                No Image
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex flex-col">
                                                        <span className="font-semibold">{item.product_name}</span>
                                                        <span>Qty: {item.required_qty}</span>
                                                        <span>Total: ₱{totalPrice}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* BUTTON BELOW PRODUCT LIST */}
                                <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-900">
                                    <button
                                        onClick={handleAddBundle}
                                        className="w-full px-5 py-2 bg-purple-500 rounded hover:bg-purple-600 text-white font-semibold flex items-center gap-2 justify-center"
                                    >
                                        <PlusCircle className="w-5 h-5" /> Add Bundle to Branch
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                Select a bundle to see details
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setShowBundleForm(false)}
                    className="mt-4 w-full py-2 bg-gray-700 rounded hover:bg-gray-600 text-white font-semibold"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
