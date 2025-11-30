import React, { useEffect, useState } from "react";
import { PlusCircle, Box } from "lucide-react";
import axios from "axios";
import DamageModal from "../Modals/DamageModal";
import DamagedProductsListModal from "../Modals/DamagedProductsListModal";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function ExpensesReportSection({
    filteredExpenses,
    userRole,
    selectedBranch = "All",
    showExpenseModal,
    setShowExpenseModal,
    newExpense,
    setNewExpense,
    handleAddExpense,
    onDamagedTotalChange,
}) {
    const [products, setProducts] = useState([]);
    const [damagedProducts, setDamagedProducts] = useState([]);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const token = localStorage.getItem("token");

    const toLocalDate = (dateString) =>
        dateString ? new Date(dateString).toLocaleDateString("en-CA") : "Invalid date";

    // Fetch products
    useEffect(() => {
        if (!userRole || (userRole === "admin" && !selectedBranch)) return;

        const fetchProducts = async () => {
            try {
                const url =
                    userRole === "admin"
                        ? `${BASE_URL}/products/admin/all-products?branch=${selectedBranch}`
                        : `${BASE_URL}/products/my-products`;

                const { data } = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setProducts(
                    data.map((p) => ({
                        ...p,
                        product_name: p.product_name || p.name,
                        image_url: p.image_url?.startsWith("http")
                            ? p.image_url
                            : `${BASE_URL}/products/images/${p.image_url}`,
                    }))
                );

            } catch (err) {
                console.error("❌ Failed to fetch products:", err);
                toast.error("Failed to fetch products");
            }
        };

        fetchProducts();
    }, [userRole, selectedBranch, token]);

    // Fetch damaged products
    const fetchDamagedProducts = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/damaged-products/my-damaged-products`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const list = data.data || [];

            const formattedDamaged = list.map((dp, idx) => ({
                ...dp,
                id: dp.id || idx,
                addedBy: dp.user_name || "N/A",
                branch: dp.municipality || "Unknown",
                date: dp.created_at ? toLocalDate(dp.created_at) : "Invalid date",
            }));

            setDamagedProducts(formattedDamaged);
            updateDamagedParent(formattedDamaged);
        } catch (err) {
            console.error("❌ Failed to fetch damaged products:", err);
            toast.error("Failed to fetch damaged products");
        }
    };

    useEffect(() => {
        fetchDamagedProducts();
    }, [userRole, token]);

    const openDamageModal = (product) => {
        setSelectedProduct(product);
        setShowDamageModal(true);
    };

    const handleDamageSubmit = async ({ product, quantity, details }) => {
        try {
            const { data } = await axios.put(
                `${BASE_URL}/damaged-products/damage/${product.product_id}`,
                { quantity, damage_description: details },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setProducts((prev) =>
                prev.map((p) =>
                    p.product_id === product.product_id ? { ...p, stock: data.newStock } : p
                )
            );

            toast.success("Damage reported successfully!");
            setShowDamageModal(false);
            fetchDamagedProducts();
        } catch (err) {
            console.error("❌ Failed to report damage:", err);
            toast.error(err.response?.data?.error || "Failed to report damage");
        }
    };

    const updateDamagedParent = (list) => {
        if (onDamagedTotalChange) {
            const total = list.reduce((sum, dp) => {
                const unitPrice =
                    dp.product_type === "discounted" ? Number(dp.discounted_price) || 0 : Number(dp.price) || 0;
                return sum + (dp.quantity || 0) * unitPrice;
            }, 0);
            onDamagedTotalChange(list, total);
        }
    };

    return (
        <div className="flex gap-6 w-full h-[700px] overflow-hidden">
            {/* LEFT SIDE – EXPENSES TABLE */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-gray-300">
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                        <table className="min-w-full text-sm text-gray-800 text-center">
                            <thead className="bg-gray-900 text-white sticky top-0 z-10">
                                <tr>
                                    {userRole === "admin" && <th className="px-4 py-3">Municipality</th>}
                                    <th className="px-4 py-3">Expense Name</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={userRole === "admin" ? 4 : 3} className="py-20 text-gray-500">
                                            No expense data available.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((e) => (
                                        <tr key={e.id} className="border-b hover:bg-gray-50 text-center">
                                            {userRole === "admin" && <td className="px-4 py-3">{e.branch || "N/A"}</td>}
                                            <td className="px-4 py-3 font-semibold">{e.name || "N/A"}</td>
                                            <td className="px-4 py-3 text-red-600 font-medium">
                                                ₱{Number(e.amount || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">{e.date || "Invalid date"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE – PRODUCTS */}
            {/* RIGHT SIDE – PRODUCTS */}
            <div className="w-[500px] flex flex-col gap-6 overflow-hidden">
                {userRole !== "admin" && (
                    <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden">

                        {/* SCROLLABLE TABLE AREA */}
                        <div className="flex-1 overflow-y-auto">
                            <table className="min-w-full text-sm text-center table-fixed">
                                <thead className="bg-gray-900 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 w-[60%] text-center">Product</th>
                                        <th className="px-4 py-3 w-[20%] text-center">Stock</th>
                                        <th className="px-4 py-3 w-[20%] text-center">Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {products.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-10 text-gray-500">
                                                No products available.
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((p) => (
                                            <tr
                                                key={p.product_id || p.id}
                                                className="border-b hover:bg-gray-50 h-[70px]"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3 max-w-[260px] mx-auto text-left">
                                                        {p.image_url ? (
                                                            <img
                                                                src={p.image_url}
                                                                alt={p.product_name || "N/A"}
                                                                className="w-10 h-10 object-cover rounded flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <Box className="w-10 h-10 text-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span className="font-medium break-words whitespace-normal leading-tight flex-1 text-left">
                                                            {p.product_name || "N/A"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-center">{p.stock ?? 0}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        className="px-3 py-2 bg-blue-600 text-white rounded text-xs flex items-center gap-1 mx-auto"
                                                        onClick={() => openDamageModal(p)}
                                                    >
                                                        <PlusCircle className="w-4 h-4" /> Damage
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <DamagedProductsListModal damagedProducts={damagedProducts} />
            </div>

            {/* Damage Modal */}
            <DamageModal
                product={selectedProduct}
                isOpen={showDamageModal}
                onClose={() => setShowDamageModal(false)}
                onSubmit={handleDamageSubmit}
            />

            {/* Add Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[400px]">
                        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
                        <input
                            type="text"
                            placeholder="Expense Name"
                            value={newExpense.name}
                            onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                            className="border p-2 w-full mb-4 rounded"
                        />
                        <input
                            type="number"
                            placeholder="Amount"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                            className="border p-2 w-full mb-4 rounded"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddExpense}
                                className="px-4 py-2 bg-blue-600 text-white rounded"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
