import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function InventoryLogSection() {
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const token = localStorage.getItem("token");

    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    const currentYear = today.getFullYear();

    const [dateFilter, setDateFilter] = useState({ month: currentMonth, year: currentYear });
    const [viewType, setViewType] = useState("daily");

    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
    const viewOptions = ["daily", "weekly", "monthly"];

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${BASE_URL}/orders/inventory/logs`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLogs(res.data.logs || []);
            setFilteredLogs(res.data.logs || []);
        } catch (err) {
            console.error("❌ Failed to fetch inventory logs:", err);
            toast.error("Failed to fetch inventory logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        if (!logs.length) return;

        const filtered = logs.filter((log) => {
            const logDate = new Date(log.created_at);

            if (dateFilter.year && logDate.getFullYear() !== Number(dateFilter.year)) return false;
            if (dateFilter.month && String(logDate.getMonth() + 1).padStart(2, "0") !== dateFilter.month) return false;

            if (viewType === "daily") {
                return logDate.getDate() === today.getDate() &&
                    logDate.getMonth() === today.getMonth() &&
                    logDate.getFullYear() === today.getFullYear();
            } else if (viewType === "weekly") {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                return logDate >= weekStart && logDate <= weekEnd;
            } else if (viewType === "monthly") {
                return logDate.getMonth() === today.getMonth() &&
                    logDate.getFullYear() === today.getFullYear();
            }

            return true;
        });

        setFilteredLogs(filtered);
    }, [logs, dateFilter, viewType]);

    if (loading) return <p className="text-center text-gray-400 mt-4 text-lg">Loading inventory logs...</p>;

    const displayedRows = [...filteredLogs];
    while (displayedRows.length < 8) displayedRows.push({ id: `empty-${displayedRows.length}` });

    return (
        <div className="p-6 flex flex-col gap-4 w-full">
            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Inventory Logs</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center mb-4">
                <select
                    value={dateFilter.month}
                    onChange={(e) => setDateFilter({ ...dateFilter, month: e.target.value })}
                    className="px-4 py-3 border rounded-lg bg-white text-base"
                >
                    {months.map((m) => (
                        <option key={m} value={m}>
                            {new Date(0, Number(m) - 1).toLocaleString("default", { month: "long" })}
                        </option>
                    ))}
                </select>

                <select
                    value={dateFilter.year}
                    onChange={(e) => setDateFilter({ ...dateFilter, year: e.target.value })}
                    className="px-4 py-3 border rounded-lg bg-white text-base"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className="px-4 py-3 border rounded-lg bg-white text-base"
                >
                    {viewOptions.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-y-auto max-h-[75vh]">
                    <table className="min-w-full table-fixed text-base text-center text-gray-800 border-collapse">
                        <thead className="bg-gray-900 text-white sticky top-0 z-20 rounded-t-lg">
                            <tr>
                                <th className="px-6 py-4 text-center rounded-tl-lg">Product</th>
                                <th className="px-6 py-4 text-center">State</th>
                                <th className="px-6 py-4 text-center">User</th>
                                <th className="px-6 py-4 text-center">Type</th>
                                <th className="px-6 py-4 text-center">Quantity</th>
                                <th className="px-6 py-4 text-center">Previous Stock</th>
                                <th className="px-6 py-4 text-center">New Stock</th>
                                <th className="px-6 py-4 text-center">Description</th>
                                <th className="px-6 py-4 text-center rounded-tr-lg">Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedRows.map((log, i) => (
                                <tr key={i} className={`hover:bg-gray-50 ${log.product_name ? "" : "opacity-0 pointer-events-none"}`}>
                                    <td className="px-6 py-4">{log.product_name || ""}</td>
                                    <td className="px-6 py-4">{log.state || ""}</td>
                                    <td className="px-6 py-4">{log.user_name || ""}</td>
                                    <td className="px-6 py-4">{log.type || ""}</td>
                                    <td className="px-6 py-4">{log.quantity || ""}</td>
                                    <td className="px-6 py-4">{log.previous_stock || ""}</td>
                                    <td className="px-6 py-4">{log.new_stock || ""}</td>
                                    <td className="px-6 py-4">{log.description || ""}</td>
                                    <td className="px-6 py-4">{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
