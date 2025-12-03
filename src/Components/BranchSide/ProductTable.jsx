import React, { useState, useEffect } from "react";
import { Package, Eye } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

import EditProduct from "./EditProductModal";

export default function ProductTable({
    userRole,
    selectedBranch,
    setProducts, // parent sync
    onRestock,
    borderless = false,
    refreshTrigger = 0,
}) {
    const [products, setLocalProducts] = useState([]);
    const [restockProduct, setRestockProduct] = useState(null);
    const [restockQuantity, setRestockQuantity] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const token = localStorage.getItem("token");

    // Fetch products whenever branch, role, or refreshTrigger changes
    useEffect(() => {
        const fetchProducts = async () => {
            if (!token) return;

            try {
                const endpoint =
                    userRole === "admin"
                        ? `${BASE_URL}/products/admin/all-products?branch=${selectedBranch}`
                        : `${BASE_URL}/products/my-products`;

                const res = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const formatted = (res.data || [])
                    .map((p) => ({
                        ...p,
                        branch_product_id: p.id,
                        branch_price: p.branch_price,
                        branch_refill_price: p.branch_refill_price,
                        branch_discounted_price: p.branch_discounted_price,
                        stock: p.stock,
                        stock_threshold: p.stock_threshold,
                        branch_id: p.branch_id,
                        branch_name: p.branch_name,
                        municipality: p.municipality,
                        image_url: p.image_url || null,
                    }))
                    .filter(
                        (p) =>
                            userRole !== "admin" ||
                            (p.branch_id && p.stock != null)
                    );

                setLocalProducts(formatted);
                setProducts?.(formatted);
            } catch (err) {
                if (err.response?.status === 403 && userRole !== "admin") {
                    toast.error("You do not have permission to view products.");
                } else if (userRole !== "admin") {
                    toast.error("Failed to fetch products.");
                }
                console.error(err);
            }
        };

        fetchProducts();
    }, [userRole, selectedBranch, refreshTrigger]);

    // Utility to update product in both local and parent states
    const updateProductList = (updatedProduct) => {
        setLocalProducts((prev) =>
            prev.map((p) =>
                p.branch_price_id === updatedProduct.branch_price_id
                    ? { ...p, ...updatedProduct }
                    : p
            )
        );
        setProducts?.((prev) =>
            prev.map((p) =>
                p.branch_price_id === updatedProduct.branch_price_id
                    ? { ...p, ...updatedProduct }
                    : p
            )
        );
    };

    const formatPrice = (value) => {
        const num = Number(value);
        if (isNaN(num)) return "0.00";
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleView = (product) => {
        if (!product.branch_product_id && userRole !== "admin") {
            return toast.error("Branch product ID is missing. Cannot edit this product.");
        }
        setSelectedProduct(product);
    };

    const handleRestockSubmit = async () => {
        const quantity = Number(restockQuantity);
        if (isNaN(quantity) || quantity <= 0)
            return toast.error("⚠️ Please enter a valid positive number.");
        if (!token) return toast.error("You must be logged in to restock.");
        if (!restockProduct.branch_price_id)
            return toast.error("⚠️ Missing branch price ID.");

        try {
            const res = await axios.put(
                `${BASE_URL}/products/restock/${restockProduct.product_id}`,
                { quantity, branch_id: restockProduct.branch_id }, // <-- replace branch_price_id with branch_id
                { headers: { Authorization: `Bearer ${token}` } }
            );


            const newStock = res.data.newStock;

            updateProductList({ ...restockProduct, stock: newStock });
            onRestock?.();

            setRestockProduct(null);
            setRestockQuantity("");
            toast.success(`✅ Restocked successfully! New stock: ${newStock}`);
        } catch (err) {
            console.error("❌ Error restocking:", err);
            toast.error(
                err.response?.data?.error || "Failed to restock product."
            );
        }
    };

    return (
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
                <table className="min-w-full table-fixed text-sm text-center text-gray-800 border-collapse">
                    <thead className="bg-gray-900 text-white sticky top-0 z-20">
                        <tr>
                            <th className="px-4 py-3 text-center rounded-tl-lg">Image</th>
                            <th className="px-4 py-3 text-center">Name</th>

                            {/* NEW: Admin branch column */}
                            {userRole === "admin" && (
                                <th className="px-4 py-3 text-center">Branch</th>
                            )}

                            <th className="px-4 py-3 text-center">Stock</th>
                            <th className="px-4 py-3 text-center">Price</th>
                            <th className="px-4 py-3 text-center rounded-tr-lg">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td className="p-6 text-gray-500" colSpan={userRole === "admin" ? 6 : 5}>
                                    No products available.
                                </td>
                            </tr>
                        ) : (
                            products.map((p, i) => (
                                <tr key={i} className={`hover:bg-gray-50 ${borderless ? "" : "border-b border-gray-200"}`}>
                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex items-center justify-center">
                                            {p.image_url ? (
                                                <img
                                                    src={p.image_url}
                                                    alt={p.product_name}
                                                    className="w-12 h-12 object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded-lg">
                                                    <Package size={28} className="text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex items-center justify-center text-center">
                                            <span className="font-semibold break-words leading-tight">
                                                {p.product_name}
                                            </span>
                                        </div>
                                    </td>

                                    {/* NEW: Branch column */}
                                    {userRole === "admin" && (
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex flex-col leading-tight">
                                                <span className="font-semibold">
                                                    {p.branch_name || "—"}
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                    {p.municipality || ""}
                                                </span>
                                            </div>
                                        </td>
                                    )}

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex justify-center">
                                            <span
                                                className={`px-3 py-1 text-sm font-semibold rounded-lg shadow-sm ${p.stock <= p.stock_threshold
                                                    ? "bg-red-600 text-white"
                                                    : p.stock <= p.stock_threshold + 5
                                                        ? "bg-yellow-400 text-gray-800"
                                                        : "bg-green-600 text-white"
                                                    }`}
                                            >
                                                {p.stock}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex justify-center">
                                            ₱
                                            {formatPrice(
                                                p.product_type === "discounted"
                                                    ? p.branch_discounted_price ??
                                                    p.discounted_price ??
                                                    p.price
                                                    : p.branch_price ?? p.price
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex justify-center items-center gap-2">
                                            {userRole !== "branch_manager" && (
                                                <button
                                                    onClick={() => handleView(p)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                            )}

                                            {userRole !== "admin" && (
                                                <button
                                                    onClick={() => setRestockProduct(p)}
                                                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-400"
                                                >
                                                    Restock
                                                </button>
                                            )}
                                        </div>
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

            {/* EDIT MODAL */}
            {selectedProduct && (
                <EditProduct
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                    onSave={updateProductList}
                />
            )}
        </div>
    );
}
