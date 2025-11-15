import React, { useEffect, useState } from "react";
import { PlusCircle, Box } from "lucide-react";
import axios from "axios";
import DamageModal from "../Modals/DamageModal";
import DamagedProductsListModal from "../Modals/DamagedProductsListModal";
import toast from "react-hot-toast";

export default function ExpensesReportSection({
    filteredExpenses,
    userRole,
    selectedBranch = "All",
    showExpenseModal,
    setShowExpenseModal,
    newExpense,
    setNewExpense,
    handleAddExpense,
}) {
    const [products, setProducts] = useState([]);
    const [damagedProducts, setDamagedProducts] = useState([]);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            if (!userRole) return;
            if (userRole === "admin" && !selectedBranch) return;

            try {
                const url =
                    userRole === "admin"
                        ? `http://localhost:5000/products/admin/all-products?branch=${selectedBranch}`
                        : "http://localhost:5000/products/my-products";

                const token = localStorage.getItem("token");

                const { data } = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const formatted = data.map((p) => ({
                    ...p,
                    image_url: p.image_url
                        ? p.image_url.startsWith("http")
                            ? p.image_url
                            : `http://localhost:5000/products/images/${p.image_url}`
                        : null,
                }));

                setProducts(formatted);
            } catch (err) {
                console.error("❌ Failed to fetch products:", err);
                toast.error("Failed to fetch products");
            }
        };

        fetchProducts();
    }, [userRole, selectedBranch]);

    // Fetch damaged products
    const fetchDamagedProducts = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.get(
                "http://localhost:5000/damaged-products/my-damaged-products",
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setDamagedProducts(data.data || []);
        } catch (err) {
            console.error("❌ Failed to fetch damaged products:", err);
            toast.error("Failed to fetch damaged products");
        }
    };

    useEffect(() => {
        fetchDamagedProducts();
    }, [userRole, selectedBranch]);

    // Open damage modal
    const openDamageModal = (product) => {
        setSelectedProduct(product);
        setShowDamageModal(true);
    };

    // Handle damage submission
    const handleDamageSubmit = async ({ product, quantity, details }) => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.put(
                `http://localhost:5000/damaged-products/damage/${product.product_id}`,
                { quantity, damage_description: details },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local product stock
            setProducts((prev) =>
                prev.map((p) =>
                    p.product_id === product.product_id
                        ? { ...p, stock: data.newStock }
                        : p
                )
            );

            toast.success(`Damage reported successfully!`);
            setShowDamageModal(false);

            fetchDamagedProducts();
        } catch (err) {
            console.error("❌ Failed to report damage:", err);
            toast.error(err.response?.data?.error || "Failed to report damage");
        }
    };

    return (
        <div className="flex gap-6 w-full h-[700px] overflow-hidden">

            {/* LEFT SIDE – EXPENSES TABLE */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
                <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
                    <div className="overflow-y-auto h-full">
                        <table className="min-w-full text-sm text-gray-800 text-center">
                            <thead className="bg-gray-900 text-white sticky top-0 z-10">
                                <tr>
                                    {userRole === "admin" && (
                                        <th className="px-4 py-3 text-center">Municipality</th>
                                    )}
                                    <th className="px-4 py-3 text-center">Expense Name</th>
                                    <th className="px-4 py-3 text-center">Amount</th>
                                    <th className="px-4 py-3 text-center">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={userRole === "admin" ? 4 : 3}
                                            className="py-20 text-gray-500 text-center"
                                        >
                                            No expense data available.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((e) => (
                                        <tr key={e.id} className="border-b hover:bg-gray-50 text-center">
                                            {userRole === "admin" && (
                                                <td className="px-4 py-3">{e.branch}</td>
                                            )}
                                            <td className="px-4 py-3 font-semibold">{e.name}</td>
                                            <td className="px-4 py-3 text-red-600 font-medium">
                                                ₱{e.amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">{e.date}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE – ONLY SHOW PRODUCTS TABLE IF NOT ADMIN */}
            <div className="w-[500px] flex flex-col gap-6 overflow-hidden">

                {/* ❗ HIDE THIS ENTIRE TABLE IF ADMIN */}
                {userRole !== "admin" && (
                    <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
                        <div className="overflow-y-auto h-full">
                            <table className="min-w-full text-sm text-center">
                                <thead className="bg-gray-900 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3">Current Stock</th>
                                        <th className="px-4 py-3">Action</th>
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
                                            <tr key={p.product_id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 flex justify-center items-center gap-3">
                                                    {p.image_url ? (
                                                        <img
                                                            src={p.image_url}
                                                            alt={p.name}
                                                            className="w-10 h-10 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <Box className="w-10 h-10 text-gray-400" />
                                                    )}
                                                    <span className="font-medium">{p.name}</span>
                                                </td>
                                                <td className="px-4 py-3 font-medium">{p.stock || 0}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 mx-auto"
                                                        onClick={() => openDamageModal(p)}
                                                    >
                                                        <PlusCircle className="w-5 h-5" /> Damage
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

                {/* Damaged Products List - ALWAYS VISIBLE */}
                <DamagedProductsListModal
                    userRole={userRole}
                    selectedBranch={selectedBranch}
                    damagedProducts={damagedProducts}
                />
            </div>

            {/* DAMAGE MODAL */}
            <DamageModal
                product={selectedProduct}
                isOpen={showDamageModal}
                onClose={() => setShowDamageModal(false)}
                onSubmit={handleDamageSubmit}
            />
        </div>
    );
}
