
import React, { useState, useEffect, useRef } from "react";
import { Package } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function RestockHistory({ refreshTrigger, onHistoryFetched, borderless = true }) {
    const [history, setHistory] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const fetchedOnce = useRef(false);
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("No token found! Please login.");
                setHistory([]);
                if (onHistoryFetched) onHistoryFetched([]);
                return;
            }

            const userRes = await axios.get(`${BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const role = userRes.data?.user?.role?.trim().toLowerCase();
            if (!role) {
                toast.error("User role not defined.");
                setHistory([]);
                if (onHistoryFetched) onHistoryFetched([]);
                return;
            }
            setUserRole(role);

            const endpoint =
                role === "admin"
                    ? `${BASE_URL}/products/admin/branch-managers-restock`
                    : `${BASE_URL}/products/my-products-restock`;

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

            if (!fetchedOnce.current) {
                fetchedOnce.current = true;
            }
        } catch (err) {
            console.error("❌ Failed to fetch restock history:", err);
            toast.error("Failed to load restock history. See console for details.");
            setHistory([]);
            if (onHistoryFetched) onHistoryFetched([]);
        }
    };

    useEffect(() => {
        fetchedOnce.current = false;
        fetchHistory();
    }, [refreshTrigger]);

    const role = userRole || "seller";

    return (
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="bg-gray-900 text-white sticky top-0 z-20 shadow-md">
                <table className="min-w-full text-center text-sm">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Product</th>
                            <th className="px-4 py-3">Quantity Restocked</th>
                            <th className="px-4 py-3">Last Restocked</th>
                            {role === "admin" && (
                                <th className="px-4 py-3 rounded-tr-lg">Restocked By</th>
                            )}
                        </tr>
                    </thead>
                </table>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
                <table className="min-w-full text-gray-800 text-sm text-center border-collapse">
                    <tbody>
                        {history.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={role === "admin" ? 4 : 3}
                                    className="p-6 text-center text-gray-500"
                                >
                                    No restock history available.
                                </td>
                            </tr>
                        ) : (
                            history.map((h) => (
                                <tr
                                    key={h.restock_id || `${h.product_id}-${h.restocked_at}`}
                                    className={`hover:bg-gray-50 ${borderless ? "" : "border-b"}`}
                                >
                                    <td className="px-4 py-3 flex items-center gap-2 justify-center">
                                        {h.image_url ? (
                                            <img
                                                src={h.image_url}
                                                alt={h.product_name}
                                                className="w-12 h-12 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded-lg text-gray-400">
                                                <Package size={20} />
                                            </div>
                                        )}
                                        <span className="font-semibold text-gray-900">
                                            {h.product_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{h.quantity}</td>
                                    <td className="px-4 py-3">
                                        {h.restocked_at
                                            ? new Date(h.restocked_at).toLocaleString("en-PH", {
                                                timeZone: "Asia/Manila",
                                            })
                                            : "N/A"}
                                    </td>
                                    {role === "admin" && (
                                        <td className="px-4 py-3">{h.restocked_by_name || "-"}</td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
