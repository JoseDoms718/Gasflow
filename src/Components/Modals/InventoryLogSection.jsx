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

    const [dateFilter, setDateFilter] = useState({
        month: currentMonth,
        year: currentYear,
    });

    // ✅ Added "all"
    const [viewType, setViewType] = useState("all");

    const months = Array.from({ length: 12 }, (_, i) =>
        String(i + 1).padStart(2, "0")
    );

    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    const viewOptions = ["all", "daily", "weekly", "monthly"];

    // ===============================
    // FETCH LOGS
    // ===============================
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `${BASE_URL}/orders/inventory/logs`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const sortedLogs = (res.data.logs || []).sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );

            setLogs(sortedLogs);
            setFilteredLogs(sortedLogs);
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

    // ===============================
    // FILTER LOGS
    // ===============================
    useEffect(() => {
        if (!logs.length) return;

        const filtered = logs.filter((log) => {
            const logDate = new Date(log.created_at);

            // Year filter
            if (
                dateFilter.year &&
                logDate.getFullYear() !== Number(dateFilter.year)
            ) {
                return false;
            }

            // Month filter
            if (
                dateFilter.month &&
                String(logDate.getMonth() + 1).padStart(2, "0") !==
                dateFilter.month
            ) {
                return false;
            }

            // View type logic
            if (viewType === "all") return true;

            if (viewType === "daily") {
                return (
                    logDate.getDate() === today.getDate() &&
                    logDate.getMonth() === today.getMonth() &&
                    logDate.getFullYear() === today.getFullYear()
                );
            }

            if (viewType === "weekly") {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);

                return logDate >= startOfWeek && logDate <= endOfWeek;
            }

            if (viewType === "monthly") return true;

            return true;
        });

        setFilteredLogs(filtered);
    }, [logs, dateFilter, viewType]);

    if (loading) {
        return (
            <p className="text-center text-gray-400 mt-6 text-lg">
                Loading inventory logs...
            </p>
        );
    }

    const displayedRows = [...filteredLogs];
    while (displayedRows.length < 8) {
        displayedRows.push({ _empty: true });
    }

    return (
        <div className="p-6 flex flex-col gap-4 w-full">
            {/* TITLE */}
            <h2 className="text-2xl font-bold text-gray-900">
                Inventory Logs
            </h2>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-4 items-center">
                <select
                    value={dateFilter.month}
                    onChange={(e) =>
                        setDateFilter({
                            ...dateFilter,
                            month: e.target.value,
                        })
                    }
                    className="px-4 py-2 border rounded-lg bg-white"
                >
                    {months.map((m) => (
                        <option key={m} value={m}>
                            {new Date(
                                0,
                                Number(m) - 1
                            ).toLocaleString("default", {
                                month: "long",
                            })}
                        </option>
                    ))}
                </select>

                <select
                    value={dateFilter.year}
                    onChange={(e) =>
                        setDateFilter({
                            ...dateFilter,
                            year: e.target.value,
                        })
                    }
                    className="px-4 py-2 border rounded-lg bg-white"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>

                <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className="px-4 py-2 border rounded-lg bg-white"
                >
                    {viewOptions.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* TABLE */}
            <div className="border border-gray-300 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-y-auto max-h-[75vh]">
                    <table className="min-w-full table-fixed text-sm text-center border-collapse">
                        <thead className="bg-gray-900 text-white sticky top-0 z-20">
                            <tr>
                                <th className="px-4 py-3">Product</th>
                                <th className="px-4 py-3">State</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Qty</th>
                                <th className="px-4 py-3">Prev</th>
                                <th className="px-4 py-3">New</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Created At</th>
                            </tr>
                        </thead>

                        <tbody>
                            {displayedRows.map((log, i) => (
                                <tr
                                    key={i}
                                    className={`hover:bg-gray-50 ${log._empty
                                            ? "opacity-0 pointer-events-none"
                                            : ""
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        {log.product_name ?? ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.state ?? ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.user_name ?? ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.quantity ?? ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.previous_stock ?? ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.new_stock ?? ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.description ?? ""}
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.created_at
                                            ? new Date(
                                                log.created_at
                                            ).toLocaleString()
                                            : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
