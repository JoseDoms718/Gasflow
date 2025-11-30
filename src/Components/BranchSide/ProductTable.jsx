import React, { useState, useEffect } from "react";
import { Package } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function ProductTable({
    products,
    userRole,
    selectedBranch,
    setSelectedProduct,
    setProducts,
    onRestock,
    borderless = false,
}) {
    const [restockProduct, setRestockProduct] = useState(null);
    const [restockQuantity, setRestockQuantity] = useState("");
    const [localProducts, setLocalProducts] = useState(products);
    const BASE_URL = import.meta.env.VITE_BASE_URL;

    useEffect(() => setLocalProducts(products), [products]);

    const formatPrice = (value) => {
        const num = Number(value);
        if (isNaN(num)) return "0.00";
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleRestockSubmit = async () => {
        const quantity = Number(restockQuantity);
        if (isNaN(quantity) || quantity <= 0) {
            toast.error("⚠️ Please enter a valid positive number.");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) return toast.error("You must be logged in to restock.");

        try {
            const res = await axios.put(
                `${BASE_URL}/products/restock/${restockProduct.product_id}`,
                {
                    quantity,
                    branch_id: restockProduct.branch_id // <-- send branch_id
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newStock = res.data.newStock;

            setLocalProducts((prev) =>
                prev.map((p) =>
                    p.product_id === restockProduct.product_id
                        ? { ...p, stock: newStock }
                        : p
                )
            );

            if (setProducts) {
                setProducts((prev) =>
                    prev.map((p) =>
                        p.product_id === restockProduct.product_id
                            ? { ...p, stock: newStock }
                            : p
                    )
                );
            }

            if (onRestock) onRestock();

            setRestockProduct(null);
            setRestockQuantity("");
            toast.success(`✅ Restocked successfully! New stock: ${newStock}`);
        } catch (err) {
            console.error("❌ Error restocking product:", err);
            toast.error(err.response?.data?.error || "Failed to restock product.");
        }
    };


    return (
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="bg-gray-900 text-white sticky top-0 z-20 shadow-md">
                <table className="min-w-full text-center text-sm">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Image</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Stock</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3 rounded-tr-lg">Action</th>
                        </tr>
                    </thead>
                </table>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
                <table className="min-w-full text-gray-800 text-center text-sm border-collapse">
                    <tbody>
                        {localProducts.length === 0 ? (
                            <tr>
                                <td className="p-6 text-gray-500" colSpan={5}>
                                    No products available.
                                </td>
                            </tr>
                        ) : (
                            localProducts.map((p, i) => (
                                <tr
                                    key={i}
                                    className={`hover:bg-gray-50 ${borderless ? "" : "border-b"
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        {p.image_url ? (
                                            <img
                                                src={p.image_url}
                                                alt={p.product_name}
                                                className="w-12 h-12 object-cover rounded-lg mx-auto"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded-lg">
                                                <Package size={28} className="text-gray-500" />
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 font-semibold">{p.product_name}</td>

                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-block px-3 py-1 text-sm font-semibold rounded-lg shadow-sm ${p.stock <= p.stock_threshold
                                                ? "bg-red-600 text-white"
                                                : p.stock <= p.stock_threshold + 5
                                                    ? "bg-yellow-400 text-gray-800"
                                                    : "bg-green-600 text-white"
                                                }`}
                                        >
                                            {p.stock}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3">
                                        ₱{formatPrice(p.discounted_price || p.price)}
                                    </td>

                                    <td className="px-4 py-3 flex justify-center gap-2">
                                        {/* Hide View button for branch_manager */}
                                        {userRole !== "branch_manager" && (
                                            <button
                                                onClick={() => setSelectedProduct(p)}
                                                className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                                View
                                            </button>
                                        )}

                                        {userRole !== "admin" && (
                                            <button
                                                onClick={() => setRestockProduct(p)}
                                                className="px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-400"
                                            >
                                                Restock
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* RESTOCK MODAL */}
            {restockProduct && userRole !== "admin" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">
                            Restock: {restockProduct.product_name}
                        </h3>
                        <input
                            type="number"
                            min="1"
                            value={restockQuantity}
                            onChange={(e) => setRestockQuantity(e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full px-3 py-2 mb-4 rounded bg-gray-800 text-white"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setRestockProduct(null);
                                    setRestockQuantity("");
                                }}
                                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRestockSubmit}
                                className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white"
                            >
                                Restock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
