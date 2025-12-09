import React, { useState, useEffect } from "react";
import { Package, Eye, Pencil, Check, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function AdminBundles({ refreshTrigger, borderless = true }) {
    const [bundles, setBundles] = useState([]);
    const [viewBundle, setViewBundle] = useState(null);
    const [editedBundle, setEditedBundle] = useState({});
    const [isEditing, setIsEditing] = useState({});
    const [hasEdits, setHasEdits] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const BASE_URL = import.meta.env.VITE_BASE_URL;

    // Fetch bundles
    useEffect(() => {
        const fetchBundles = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BASE_URL}/bundles`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.data.success) return toast.error("Failed to load bundles.");

                const grouped = res.data.bundles.reduce((acc, row) => {
                    const existing = acc.find(b => b.bundle_id === row.bundle_id);
                    const item = row.product_id && {
                        product_id: row.product_id,
                        product_name: row.product_name,
                        product_image: row.product_image,
                        product_price: row.product_price,
                        product_discounted_price: row.product_discounted_price,
                        quantity: row.quantity,
                    };
                    if (existing) item && existing.items.push(item);
                    else acc.push({ ...row, items: item ? [item] : [] });
                    return acc;
                }, []);

                setBundles(grouped);
            } catch (err) {
                console.error("❌ Failed to fetch bundles:", err);
                toast.error("Failed to load bundles.");
            }
        };
        fetchBundles();
    }, [refreshTrigger]);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BASE_URL}/products/universal`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setAllProducts(res.data.products || res.data || []);
            } catch (err) {
                console.error("❌ Error fetching products:", err);
            }
        };
        fetchProducts();
    }, []);

    const openEditModal = (bundle) => {
        setViewBundle(bundle);
        setEditedBundle({ ...bundle, items: [...bundle.items] });
        setIsEditing({});
        setHasEdits(false);
    };

    const toggleEdit = (field) => setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));

    const calculateTotalPrice = () =>
        editedBundle.items?.reduce(
            (acc, i) => acc + ((i.product_discounted_price ?? i.product_price) * i.quantity),
            0
        ) || 0;

    const handleEditChange = (field, value) => {
        setEditedBundle(prev => {
            let newValue = value;

            // Only allow integers for discounted price and price
            if (field === "discounted_price" || field === "bundle_price") {
                newValue = newValue.replace(/\D/g, ""); // remove non-digits
            }


            // Auto-adjust discounted price if it exceeds total
            if (field === "discounted_price") {
                const total = calculateTotalPrice();
                if (Number(newValue) >= total) {
                    newValue = total - 1;
                    toast.error("Discounted price cannot exceed total price. Adjusted automatically.");
                }
            }

            return { ...prev, [field]: newValue };
        });
        setHasEdits(true);
    };

    const handleProductToggle = (product) => {
        const exists = editedBundle.items.some(i => i.product_id === product.product_id);
        setEditedBundle(prev => ({
            ...prev,
            items: exists
                ? prev.items.filter(i => i.product_id !== product.product_id)
                : [...prev.items, {
                    product_id: product.product_id,
                    product_name: product.product_name,
                    product_image: product.image_url || product.product_image,
                    product_price: product.price,
                    product_discounted_price: product.discounted_price,
                    quantity: 1,
                }],
        }));
        setHasEdits(true);
    };

    const changeProductQuantity = (product_id, qty) => {
        setEditedBundle(prev => ({
            ...prev,
            items: prev.items.map(i => i.product_id === product_id ? { ...i, quantity: qty } : i),
        }));
        setHasEdits(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditedBundle(prev => ({
                ...prev,
                bundle_image_file: file,
                bundle_image: URL.createObjectURL(file),
            }));
            setHasEdits(true);
        }
    };

    const handleSaveEdits = async () => {
        const total = calculateTotalPrice();
        let discounted = editedBundle.discounted_price !== "" && editedBundle.discounted_price !== null
            ? Number(editedBundle.discounted_price)
            : null;

        // Prevent saving if discounted price is null, zero, or exceeds total
        if (discounted === null || discounted <= 0) {
            toast.error("Discounted price cannot be empty or zero.");
            return;
        }

        if (discounted >= total) {
            discounted = total - 1;
            toast.error("Discounted price cannot exceed total price. Adjusted automatically.");
            setEditedBundle(prev => ({ ...prev, discounted_price: discounted }));
            return;
        }

        // Prevent saving if bundle name is empty
        if (!editedBundle.bundle_name || editedBundle.bundle_name.trim() === "") {
            toast.error("Bundle name cannot be empty.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();

            formData.append("bundle_name", editedBundle.bundle_name);
            formData.append("description", editedBundle.description || "");
            formData.append("price", total);
            formData.append("discounted_price", discounted);
            formData.append("role", editedBundle.role || "retailer");
            formData.append("products", JSON.stringify(
                editedBundle.items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity
                }))
            ));

            if (editedBundle.bundle_image_file) {
                formData.append("bundle_image", editedBundle.bundle_image_file);
            }

            await axios.put(`${BASE_URL}/bundles/edit/${editedBundle.bundle_id}`, formData, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
            });

            toast.success("Bundle updated successfully!");
            setViewBundle(null);
        } catch (err) {
            console.error("❌ Failed to save edits:", err);
            toast.error("Failed to update bundle.");
        }
    };


    const formatPrice = (value) => Number(value || 0).toFixed(2);

    return (
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="bg-gray-900 text-white sticky top-0 z-20 shadow-md">
                <table className="min-w-full text-center text-sm">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 text-left">Bundle</th>
                            <th className="px-4 py-3 w-28">Discounted Price (₱)</th>
                            <th className="px-4 py-3 w-28">Action</th>
                        </tr>
                    </thead>
                </table>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
                <table className="min-w-full text-gray-800 text-sm text-center border-collapse">
                    <tbody>
                        {bundles.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-gray-500">
                                    No bundles available.
                                </td>
                            </tr>
                        ) : bundles.map(b => (
                            <tr key={b.bundle_id} className={`hover:bg-gray-50 ${borderless ? "" : "border-b"}`}>
                                <td className="px-4 py-3 flex items-center gap-3 justify-start">
                                    <div className="w-14 h-14 flex-shrink-0">
                                        {b.bundle_image ? (
                                            <img
                                                src={b.bundle_image.startsWith("http") ? b.bundle_image : `${BASE_URL}/uploads/products/bundle/${b.bundle_image}`}
                                                alt={b.bundle_name}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg text-gray-400">
                                                <Package size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-semibold text-gray-900 break-words whitespace-normal max-w-[200px]">{b.bundle_name}</span>
                                </td>
                                <td className="px-4 py-3 w-28">
                                    ₱{formatPrice(b.discounted_price || 0)}
                                </td>
                                <td className="px-4 py-3 w-28">
                                    <button onClick={() => openEditModal(b)} className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm w-full">
                                        <Eye className="w-4 h-4" /> View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* EDIT MODAL */}
            {viewBundle && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl h-[600px] overflow-hidden relative flex flex-col md:flex-row">
                        <button onClick={() => setViewBundle(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>

                        {/* LEFT */}
                        <div className="flex-shrink-0 w-full md:w-1/2 h-full bg-gray-900 relative">
                            {editedBundle.bundle_image ? (
                                <img
                                    src={editedBundle.bundle_image.startsWith("http") ? editedBundle.bundle_image : `${BASE_URL}/uploads/products/bundle/${editedBundle.bundle_image}`}
                                    alt={editedBundle.bundle_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    <Package size={120} />
                                </div>
                            )}
                            {isEditing.bundle_image && (
                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute bottom-4 left-4 bg-gray-800 text-gray-100 px-2 py-1 rounded" />
                            )}
                        </div>

                        {/* RIGHT (scrollable) */}
                        <div className="flex-1 flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-4">
                                {/* Bundle Name */}
                                <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-2">
                                    {isEditing.bundle_name ? (
                                        <input
                                            type="text"
                                            value={editedBundle.bundle_name}
                                            onChange={e => handleEditChange("bundle_name", e.target.value)}
                                            className="bg-gray-800 px-2 py-1 rounded w-full"
                                        />
                                    ) : editedBundle.bundle_name}
                                    <button onClick={() => toggleEdit("bundle_name")}>
                                        {isEditing.bundle_name ? <Check size={18} /> : <Pencil size={18} />}
                                    </button>
                                </h2>

                                <hr className="border-gray-700" />

                                {/* Description */}
                                <div className="flex items-start gap-2">
                                    <span className="font-semibold">Description:</span>
                                    {isEditing.description ? (
                                        <textarea
                                            value={editedBundle.description}
                                            onChange={e => handleEditChange("description", e.target.value)}
                                            className="bg-gray-800 px-2 py-1 rounded w-full"
                                        />
                                    ) : <span>{editedBundle.description || "N/A"}</span>}
                                    <button onClick={() => toggleEdit("description")}>
                                        {isEditing.description ? <Check size={16} /> : <Pencil size={16} />}
                                    </button>
                                </div>

                                {/* Price */}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="font-semibold">Price:</span>
                                    <span>₱{formatPrice(calculateTotalPrice())}</span>
                                </div>

                                {/* Discounted Price */}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="font-semibold">Discounted Price:</span>
                                    {isEditing.discounted_price ? (
                                        <input
                                            type="number"
                                            min={0}
                                            value={editedBundle.discounted_price}
                                            onChange={e => handleEditChange("discounted_price", e.target.value)}
                                            className="bg-gray-800 px-2 py-1 rounded w-24"
                                        />
                                    ) : (
                                        <span>{editedBundle.discounted_price ? `₱${formatPrice(editedBundle.discounted_price)}` : "N/A"}</span>
                                    )}
                                    <button onClick={() => toggleEdit("discounted_price")}>
                                        {isEditing.discounted_price ? <Check size={16} /> : <Pencil size={16} />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="font-semibold">Role:</span>

                                    {isEditing.role ? (
                                        <select
                                            value={editedBundle.role}
                                            onChange={(e) => handleEditChange("role", e.target.value)}
                                            className="bg-gray-800 px-2 py-1 rounded"
                                        >
                                            <option value="business_owner">Business Owner</option>
                                            <option value="retailer">Retailer</option>
                                            <option value="users">Users</option>
                                            <option value="all">All</option>
                                        </select>
                                    ) : (
                                        <span className="capitalize">{editedBundle.role}</span>
                                    )}

                                    <button onClick={() => toggleEdit("role")}>
                                        {isEditing.role ? <Check size={16} /> : <Pencil size={16} />}
                                    </button>
                                </div>

                                {/* Items */}
                                <div className="mt-4 flex flex-col">
                                    <div className="flex items-center justify-between font-semibold mb-2">
                                        <span>Items:</span>
                                        <button onClick={() => toggleEdit("items")}>
                                            {isEditing.items ? <Check size={16} /> : <Pencil size={16} />}
                                        </button>
                                    </div>

                                    {/* Current items */}
                                    <div className="max-h-[168px] overflow-y-auto">
                                        {editedBundle.items?.length ? (
                                            <ul className="space-y-2">
                                                {editedBundle.items.map(i => {
                                                    const totalPrice = (i.product_discounted_price ?? i.product_price) * i.quantity;
                                                    return (
                                                        <li key={i.product_id} className="flex items-center gap-3">
                                                            <div className="w-12 h-12 flex-shrink-0">
                                                                {i.product_image ? (
                                                                    <img
                                                                        src={i.product_image.startsWith("http") ? i.product_image : `${BASE_URL}/uploads/products/${i.product_image}`}
                                                                        alt={i.product_name}
                                                                        className="w-full h-full object-cover rounded-lg"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg text-gray-400">
                                                                        <Package size={20} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 flex items-center justify-between">
                                                                <span className="font-semibold">{i.product_name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span>Qty:</span>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={i.quantity}
                                                                        onChange={e => changeProductQuantity(i.product_id, parseInt(e.target.value))}
                                                                        className={`bg-gray-800 px-1 py-0 rounded w-14 ${!isEditing.items ? "pointer-events-none opacity-50" : ""}`}
                                                                    />
                                                                    <span>₱{formatPrice(totalPrice)}</span>
                                                                    {isEditing.items && (
                                                                        <button onClick={() => handleProductToggle(i)} className="ml-2 text-red-400 hover:text-red-600">
                                                                            <X size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : <span className="text-gray-400">No items</span>}
                                    </div>

                                    {/* Add Products */}
                                    {isEditing.items && (
                                        <div className="mt-3">
                                            <span className="font-semibold">Add Products:</span>
                                            <div className="grid grid-cols-2 gap-2 max-h-[calc(2*3.5rem)] overflow-y-auto mt-1">
                                                {allProducts.map(p => {
                                                    const checked = editedBundle.items?.some(i => i.product_id === p.product_id);
                                                    return (
                                                        <label key={p.product_id} className="flex items-center gap-2 bg-gray-800 px-2 py-1 rounded cursor-pointer">
                                                            <input type="checkbox" checked={checked} onChange={() => handleProductToggle(p)} className="accent-green-500" />
                                                            <span className="text-sm">{p.product_name} - ₱{formatPrice(p.price)}{p.discounted_price ? " (Discounted)" : ""}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FIXED SAVE BUTTON */}
                            {hasEdits && (
                                <div className="p-4 bg-[#0f172a] border-t border-gray-700">
                                    <button onClick={handleSaveEdits} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition">
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
