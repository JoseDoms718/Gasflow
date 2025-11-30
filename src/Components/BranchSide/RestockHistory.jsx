import React, { useState, useEffect } from "react";
import { Package } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function RestockHistory({ refreshTrigger, onHistoryFetched, userRole, borderless = true }) {
    const [history, setHistory] = useState([]);
    const BASE_URL = import.meta.env.VITE_BASE_URL;

    // Only skip fetch for admin
    const isAdmin = userRole === "admin";

    useEffect(() => {
        if (!userRole || isAdmin) {
            // If admin, notify parent with empty array but do nothing else
            if (isAdmin && onHistoryFetched) onHistoryFetched([]);
            return;
        }

        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    toast.error("No token found! Please login.");
                    setHistory([]);
                    if (onHistoryFetched) onHistoryFetched([]);
                    return;
                }

                const endpoint = `${BASE_URL}/products/my-products-restock`;

                const res = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.data?.success) {
                    toast.error(res.data?.error || "Failed to fetch restock history.");
                    setHistory([]);
                    if (onHistoryFetched) onHistoryFetched([]);
                    return;
                }

                const formatted = (res.data.data || []).map((h) => ({
                    ...h,
                    previous_stock: h.previous_stock ?? 0,
                    new_stock: h.new_stock ?? 0,
                    image_url: h.image_url
                        ? h.image_url.startsWith("http")
                            ? h.image_url
                            : `${BASE_URL}/products/images/${h.image_url}`
                        : null,
                }));

                setHistory(formatted);
                if (onHistoryFetched) onHistoryFetched(formatted);
            } catch (err) {
                console.error("❌ Failed to fetch restock history:", err);
                toast.error("Failed to load restock history. See console for details.");
                setHistory([]);
                if (onHistoryFetched) onHistoryFetched([]);
            }
        };

        fetchHistory();
    }, [refreshTrigger, userRole]);

    if (isAdmin) {
        // Admin does not render this table at all
        return null;
    }

    return (
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="bg-gray-900 text-white sticky top-0 z-20 shadow-md">
                <table className="min-w-full table-fixed text-center text-sm">
                    <thead>
                        <tr>
                            <th className="w-20 px-2 py-3">Image</th>
                            <th className="w-20 px-2 py-3">Qty</th>
                            <th className="w-36 px-2 py-3">Date</th>
                        </tr>
                    </thead>
                </table>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
                <table className="min-w-full table-fixed text-gray-800 text-sm text-center border-collapse">
                    <tbody>
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-gray-500">
                                    No restock history
                                </td>
                            </tr>
                        ) : (
                            history.map((h) => (
                                <tr
                                    key={h.restock_id || `${h.product_id}-${h.restocked_at}`}
                                    className={`hover:bg-gray-50 ${borderless ? "" : "border-b"}`}
                                >
                                    {/* IMAGE */}
                                    <td className="w-20 px-2 py-3 text-center align-middle">
                                        {h.image_url ? (
                                            <img
                                                src={h.image_url}
                                                alt=""
                                                className="w-12 h-12 object-cover rounded-lg mx-auto"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto flex items-center justify-center text-gray-400">
                                                <Package size={20} />
                                            </div>
                                        )}
                                    </td>

                                    {/* QTY */}
                                    <td className="w-20 px-2 py-3 text-center align-middle break-words">
                                        {h.quantity}
                                    </td>

                                    {/* DATE */}
                                    <td className="w-36 px-2 py-3 text-center align-middle break-words">
                                        {h.restocked_at ? (
                                            <div className="flex flex-col leading-tight">
                                                <span>
                                                    {new Date(h.restocked_at).toLocaleDateString("en-PH", {
                                                        timeZone: "Asia/Manila",
                                                    })}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(h.restocked_at).toLocaleTimeString("en-PH", {
                                                        timeZone: "Asia/Manila",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                        ) : (
                                            "N/A"
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
