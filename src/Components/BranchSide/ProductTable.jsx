import React, { useState, useEffect } from "react";
import { Package, Eye, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

import EditProduct from "./EditProductModal";

// Detailed view-only modal for bundles
function ViewBundleModal({ bundle, setBundle }) {
    const BASE_URL = import.meta.env.VITE_BASE_URL;

    const productCardHeight = 100; // height for individual products
    const maxVisibleProducts = 5;  // max products visible at once
    const maxHeight = productCardHeight * maxVisibleProducts;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-5xl max-h-[95vh]">
                {/* Close button */}
                <X
                    onClick={() => setBundle(null)}
                    className="absolute top-4 right-4 w-7 h-7 text-white cursor-pointer hover:text-gray-300 z-50"
                />

                <div className="bg-gray-900 text-white p-8 rounded-lg shadow-lg flex gap-8 max-h-[95vh] overflow-hidden">
                    {/* LEFT: Bundle image + info */}
                    <div className="flex flex-col w-2/5 overflow-hidden">
                        {bundle.bundle_image ? (
                            <img
                                src={`${BASE_URL}/uploads/products/bundle/${bundle.bundle_image}`}
                                alt={bundle.product_name}
                                className="w-full h-[50vh] object-cover rounded-lg"
                            />
                        ) : (
                            <div className="w-full h-[50vh] bg-gray-700 flex items-center justify-center rounded-lg">
                                <Package size={32} className="text-gray-300" />
                            </div>
                        )}

                        <div
                            className="flex flex-col gap-3 mt-4 overflow-y-auto"
                            style={{ maxHeight: `calc(50vh - 1rem)` }}
                        >
                            <h3 className="text-3xl font-bold">{bundle.product_name}</h3>
                            <p className="text-base">
                                <strong>Description:</strong> {bundle.description}
                            </p>
                            <p className="text-base">
                                <strong>Price:</strong> ₱{bundle.branch_discounted_price ?? bundle.branch_price}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: Products in the bundle */}
                    <div
                        className="flex flex-col w-3/5 overflow-y-auto"
                        style={{ maxHeight }}
                    >
                        <h4 className="text-2xl font-semibold mb-4 sticky top-0 bg-gray-900 z-10">
                            Products in this bundle
                        </h4>
                        <div className="flex flex-col gap-3">
                            {bundle.items.map((item, index) => {
                                const totalPrice = (item.product_discounted_price ?? item.product_price) * item.required_qty;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 p-3 bg-gray-800 rounded"
                                        style={{ height: productCardHeight - 8 }}
                                    >
                                        {item.product_image ? (
                                            <img
                                                src={`${BASE_URL}/uploads/products/${item.product_image}`}
                                                alt={item.product_name}
                                                className="w-16 h-16 object-cover rounded"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-600 flex items-center justify-center rounded">
                                                <Package size={24} className="text-gray-300" />
                                            </div>
                                        )}

                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold truncate text-lg">{item.product_name}</p>
                                            <p className="text-sm text-gray-300 truncate">
                                                Quantity: {item.required_qty}
                                            </p>
                                            <p className="text-sm text-gray-300 truncate">
                                                Price: ₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProductTable({
    userRole,
    selectedBranch,
    setProducts,
    onRestock,
    borderless = false,
    refreshTrigger = 0,
}) {
    const [products, setLocalProducts] = useState([]);
    const [restockProduct, setRestockProduct] = useState(null);
    const [restockQuantity, setRestockQuantity] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [viewBundle, setViewBundle] = useState(null);
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchProducts = async () => {
            if (!token) return;
            try {
                const productEndpoint =
                    userRole === "admin"
                        ? `${BASE_URL}/products/admin/all-products?branch=${selectedBranch}`
                        : `${BASE_URL}/products/my-products`;

                const resProducts = await axios.get(productEndpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                let fetchedProducts = (resProducts.data || []).map((p) => ({
                    ...p,
                    isBundle: false,
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
                }));

                if (userRole === "branch_manager") {
                    const resBundles = await axios.get(
                        `${BASE_URL}/bundles/branch/my-bundles`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    const branchBundles = (resBundles.data.branchBundles || []).map(
                        (b) => ({
                            branch_bundle_id: b.branch_bundle_id,
                            bundle_id: b.bundle_id,
                            product_name: b.bundle_name,
                            description: b.description,
                            branch_price: b.branch_price,
                            branch_discounted_price: b.branch_discounted_price,
                            stock: null,
                            items: b.items,
                            isBundle: true,
                            bundle_image: b.bundle_image,
                            branch_id: b.branch_id,
                        })
                    );

                    fetchedProducts = [...branchBundles, ...fetchedProducts];
                }

                setLocalProducts(fetchedProducts);
                setProducts?.(fetchedProducts);
            } catch (err) {
                console.error(err);
                toast.error("Failed to fetch products or bundles.");
            }
        };

        fetchProducts();
    }, [userRole, selectedBranch, refreshTrigger]);

    const updateProductList = (updatedProduct) => {
        setLocalProducts((prev) =>
            prev.map((p) =>
                (p.branch_product_id || p.branch_bundle_id) ===
                    (updatedProduct.branch_product_id || updatedProduct.branch_bundle_id)
                    ? { ...p, ...updatedProduct }
                    : p
            )
        );
        setProducts?.((prev) =>
            prev.map((p) =>
                (p.branch_product_id || p.branch_bundle_id) ===
                    (updatedProduct.branch_product_id || updatedProduct.branch_bundle_id)
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
        if (product.isBundle) {
            setViewBundle(product);
        } else {
            setSelectedProduct(product);
        }
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
                { quantity, branch_id: restockProduct.branch_id },
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
            toast.error(err.response?.data?.error || "Failed to restock product.");
        }
    };

    return (
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto max-h-[75vh]">
                <table className="min-w-full table-fixed text-sm text-center text-gray-800 border-collapse">
                    <thead className="bg-gray-900 text-white sticky top-0 z-20">
                        <tr>
                            <th className="px-4 py-3 text-center rounded-tl-lg">Image</th>
                            <th className="px-4 py-3 text-center">Name</th>
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
                                <td
                                    className="p-6 text-gray-500"
                                    colSpan={userRole === "admin" ? 6 : 5}
                                >
                                    No products available.
                                </td>
                            </tr>
                        ) : (
                            products.map((p, i) => (
                                <tr
                                    key={i}
                                    className={`hover:bg-gray-50 ${borderless ? "" : "border-b border-gray-200"
                                        }`}
                                >
                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex items-center justify-center">
                                            {p.isBundle ? (
                                                p.bundle_image ? (
                                                    <img
                                                        src={`${BASE_URL}/uploads/products/bundle/${p.bundle_image}`}
                                                        alt={p.product_name}
                                                        className="w-14 h-14 object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 bg-gray-200 flex items-center justify-center rounded-lg">
                                                        <Package size={28} className="text-gray-500" />
                                                    </div>
                                                )
                                            ) : p.image_url ? (
                                                <img
                                                    src={p.image_url}
                                                    alt={p.product_name}
                                                    className="w-14 h-14 object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 bg-gray-200 flex items-center justify-center rounded-lg">
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
                                            {p.isBundle ? (
                                                <span className="px-3 py-1 text-sm font-semibold rounded-lg shadow-sm bg-purple-500 text-white">
                                                    Bundle
                                                </span>
                                            ) : (
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
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex justify-center">
                                            ₱
                                            {formatPrice(
                                                p.branch_discounted_price ?? p.branch_price ?? p.price
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex justify-center items-center gap-2">
                                            {p.isBundle && (
                                                <button
                                                    onClick={() => handleView(p)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                            )}

                                            {!p.isBundle && userRole !== "admin" && (
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

            {selectedProduct && (
                <EditProduct
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                    onSave={updateProductList}
                />
            )}

            {viewBundle && (
                <ViewBundleModal
                    bundle={viewBundle}
                    setBundle={setViewBundle}
                />
            )}
        </div>
    );
}
