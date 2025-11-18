
import React, { useEffect, useState, useMemo } from "react";
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
    onTotalChange,
}) {
    const [products, setProducts] = useState([]);
    const [damagedProducts, setDamagedProducts] = useState([]);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const token = localStorage.getItem("token");

    // Fetch products
    useEffect(() => {
        if (!userRole || (userRole === "admin" && !selectedBranch)) return;

        const fetchProducts = async () => {
            try {
                const url =
                    userRole === "admin"
                        ? `${BASE_URL}/products/admin/all-products?branch=${selectedBranch}`
                        : `${BASE_URL}/products/my-products`;

                const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });

                setProducts(
                    data.map((p) => ({
                        ...p,
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
            const { data } = await axios.get(
                `${BASE_URL}/damaged-products/my-damaged-products`,
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

    const toLocalDate = (dateString) => new Date(dateString).toLocaleDateString("en-CA");

    // Compute damaged expenses
    const damagedExpenses = useMemo(
        () =>
            damagedProducts.map((dp) => {
                const unitPrice =
                    dp.product_type === "discounted"
                        ? Number(dp.discounted_price) || 0
                        : Number(dp.price) || 0;
                const quantity = dp.quantity || 0;
                const serverDate = dp.created_at || dp.date || new Date().toISOString();

                return {
                    id: dp.damage_id,
                    name: `${dp.product_name} (Damaged)`,
                    amount: unitPrice * quantity,
                    date: toLocalDate(serverDate),
                    branch: dp.branch || selectedBranch,
                    addedBy: dp.added_by || "N/A",
                };
            }),
        [damagedProducts, selectedBranch]
    );

    // Send total to parent
    useEffect(() => {
        if (onTotalChange) {
            const total = [...filteredExpenses, ...damagedExpenses].reduce((sum, e) => sum + e.amount, 0);
            onTotalChange(total);
        }
    }, [filteredExpenses, damagedExpenses, onTotalChange]);

    const handleAddNewExpense = () => {
        if (!newExpense.name || !newExpense.amount) return;

        handleAddExpense({
            ...newExpense,
            date: new Date().toLocaleDateString("en-CA"),
        });

        setNewExpense({ name: "", amount: 0 });
        setShowExpenseModal(false);
    };

    return (
        <div className="flex gap-6 w-full h-[700px] overflow-hidden">
            {/* LEFT SIDE – EXPENSES TABLE */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
                <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
                    <div className="overflow-y-auto min-h-[400px]">
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
                                    <>
                                        {filteredExpenses.map((e) => (
                                            <tr key={e.id} className="border-b hover:bg-gray-50 text-center">
                                                {userRole === "admin" && <td className="px-4 py-3">{e.branch}</td>}
                                                <td className="px-4 py-3 font-semibold">{e.name}</td>
                                                <td className="px-4 py-3 text-red-600 font-medium">
                                                    ₱{e.amount.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3">{toLocalDate(e.date)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 font-semibold text-red-700">
                                            <td className="px-4 py-3 text-right" colSpan={userRole === "admin" ? 3 : 2}>
                                                Total Expenses
                                            </td>
                                            <td className="px-4 py-3">
                                                ₱{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE – PRODUCTS AND DAMAGED LIST */}
            <div className="w-[500px] flex flex-col gap-6 overflow-hidden">
                {userRole !== "admin" && (
                    <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
                        <div className="overflow-y-auto min-h-[200px]">
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

                <DamagedProductsListModal
                    userRole={userRole}
                    selectedBranch={selectedBranch}
                    damagedProducts={damagedProducts}
                    additionalExpenses={filteredExpenses}
                />
            </div>

            <DamageModal
                product={selectedProduct}
                isOpen={showDamageModal}
                onClose={() => setShowDamageModal(false)}
                onSubmit={handleDamageSubmit}
            />
        </div>
    );
}
