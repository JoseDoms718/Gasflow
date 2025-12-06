import React, { useState, useEffect } from "react";
import { Package, Eye } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

import EditProduct from "./EditProductModal";
import EditBundle from "./EditBundleModal";

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

                // Only show admin products if stock > 0 and owned by branch
                if (userRole === "admin") {
                    fetchedProducts = fetchedProducts.filter((p) => p.stock > 0 && p.branch_id);
                }

                // Branch manager bundles
                if (userRole === "branch_manager") {
                    const resBundles = await axios.get(`${BASE_URL}/bundles/branch/my-bundles`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    const branchBundles = (resBundles.data.branchBundles || []).map((b) => ({
                        branch_bundle_id: b.branch_bundle_id,
                        bundle_id: b.bundle_id,
                        product_name: b.bundle_name,
                        description: b.description,
                        // keep whole branch_prices array but also set sensible top-level defaults
                        branch_price: b.branch_prices?.[0]?.branch_price ?? b.price,
                        branch_discounted_price:
                            b.branch_prices?.[0]?.branch_discounted_price ?? b.discounted_price,
                        branch_bundle_price_id: b.branch_prices?.[0]?.branch_bundle_price_id ?? null,
                        stock: null,
                        items: b.items,
                        isBundle: true,
                        bundle_image: b.bundle_image,
                        branch_id: b.branch_id,
                        branch_name: b.branch_name,
                        branch_prices: b.branch_prices ?? [],
                    }));

                    fetchedProducts = [...branchBundles, ...fetchedProducts];
                }

                // Admin bundles
                if (userRole === "admin") {
                    const resAdminBundles = await axios.get(`${BASE_URL}/bundles/admin/get-bundles`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    const adminBundles = (resAdminBundles.data.bundles || []).map((b) => ({
                        branch_bundle_id: b.branch_bundle_id,
                        bundle_id: b.bundle_id,
                        product_name: b.bundle_name,
                        description: b.description,
                        branch_price: b.price,
                        branch_discounted_price: b.discounted_price,
                        stock: null,
                        items: b.products,
                        isBundle: true,
                        bundle_image: b.bundle_image,
                        branch_id: b.branch_id,
                        branch_name: b.branch_name,
                        branch_prices: b.branch_prices ?? [],
                        branch_bundle_price_id: b.branch_bundle_price_id ?? null, // <--- ADD THIS
                    }));

                    fetchedProducts = [...adminBundles, ...fetchedProducts];
                }

                setLocalProducts(fetchedProducts);
                setProducts?.(fetchedProducts);
            } catch (err) {
                console.error(err);
                toast.error("Failed to fetch products or bundles.");
            }
        };

        fetchProducts();
        // include token in deps so fetch runs if token changes
    }, [userRole, selectedBranch, refreshTrigger, token]);

    // Update list safely using explicit id resolution
    const resolveRowId = (row) =>
        row.branch_product_id ?? row.branch_bundle_id ?? row.product_id ?? row.id ?? null;

    const updateProductList = (updatedProduct) => {
        const updatedId = resolveRowId(updatedProduct);
        if (updatedId == null) return;

        setLocalProducts((prev) =>
            prev.map((p) => {
                const rowId = resolveRowId(p);
                return rowId === updatedId ? { ...p, ...updatedProduct } : p;
            })
        );
        setProducts?.((prev) =>
            prev?.map((p) => {
                const rowId = resolveRowId(p);
                return rowId === updatedId ? { ...p, ...updatedProduct } : p;
            })
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

    // Product view
    const handleViewProduct = (product) => setSelectedProduct(product);

    const handleViewBundle = (bundle) => {
        // Determine which branch to use
        const chosenBranchId =
            bundle.branch_id ?? selectedBranch ?? bundle.branch_prices?.[0]?.branch_id;

        // Find the matching branch price object
        const branchPrice =
            (bundle.branch_prices || []).find((b) => b.branch_id === chosenBranchId) ||
            bundle.branch_prices?.[0] ||
            {};

        // Use branch_bundle_price_id if available, fallback to top-level branch_bundle_id
        const branch_bundle_price_id =
            branchPrice.branch_bundle_price_id ?? bundle.branch_bundle_price_id ?? bundle.branch_bundle_id ?? null;

        setViewBundle({
            ...bundle,
            bundle_name: bundle.product_name ?? bundle.bundle_name,
            items: bundle.items || [],
            branch_price: branchPrice.branch_price ?? bundle.branch_price ?? bundle.price ?? 0,
            branch_discounted_price:
                branchPrice.branch_discounted_price ?? bundle.branch_discounted_price ?? bundle.discounted_price ?? 0,
            branch_bundle_price_id, // <-- always set
            branch_prices: bundle.branch_prices ?? [],
            selected_branch_id: chosenBranchId ?? null, // <-- branch context
        });
    };


    const handleRestockSubmit = async () => {
        const quantity = Number(restockQuantity);
        if (isNaN(quantity) || quantity <= 0)
            return toast.error("⚠️ Please enter a valid positive number.");
        if (!token) return toast.error("You must be logged in to restock.");

        // use branch_product_id (mapped earlier) rather than a non-existent `branch_price_id`
        if (!restockProduct?.branch_product_id) return toast.error("⚠️ Missing branch product ID.");

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
                            {userRole === "admin" && <th className="px-4 py-3 text-center">Branch</th>}
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
                                                <img src={p.image_url} alt={p.product_name} className="w-14 h-14 object-cover rounded-lg" />
                                            ) : (
                                                <div className="w-14 h-14 bg-gray-200 flex items-center justify-center rounded-lg">
                                                    <Package size={28} className="text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex items-center justify-center text-center">
                                            <span className="font-semibold break-words leading-tight">{p.product_name}</span>
                                        </div>
                                    </td>

                                    {userRole === "admin" && (
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex flex-col leading-tight">
                                                <span className="font-semibold">{p.branch_name || "—"}</span>
                                                <span className="text-xs text-gray-600">{p.municipality || ""}</span>
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
                                        <div className="flex justify-center">₱{formatPrice(p.branch_discounted_price ?? p.branch_price ?? p.price)}</div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex justify-center items-center gap-2">
                                            {p.isBundle ? (
                                                <button onClick={() => handleViewBundle(p)} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                            ) : userRole === "admin" ? (
                                                <button onClick={() => handleViewProduct(p)} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                            ) : (
                                                <button onClick={() => setRestockProduct(p)} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-400">
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

            {/* Restock Modal */}
            {restockProduct && userRole !== "admin" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Restock: {restockProduct.product_name}</h3>
                        <input
                            type="number"
                            min="1"
                            value={restockQuantity}
                            onChange={(e) => setRestockQuantity(e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full px-3 py-2 mb-4 rounded bg-gray-800 text-white"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setRestockProduct(null); setRestockQuantity(""); }} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                                Cancel
                            </button>
                            <button onClick={handleRestockSubmit} className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white">
                                Restock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {selectedProduct && (
                <EditProduct selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} onSave={updateProductList} />
            )}

            {/* Bundle Modal */}
            {viewBundle && <EditBundle selectedBundle={viewBundle} setSelectedBundle={setViewBundle} onSave={updateProductList} />}
        </div>
    );
}
