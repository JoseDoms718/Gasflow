import React from "react";
import { X } from "lucide-react";

export default function WalkInOrderModal({
    selectedProduct,
    setSelectedProduct,
    formData,
    setFormData,
    quantity,
    setQuantity,
    handleSubmit,
    handlePhoneChange,
    handleInputChange,
    handleToggleRefill,
    barangays,
    loading,
    formatPrice,
    BASE_URL
}) {
    if (!selectedProduct) return null;

    const isBundle = !!selectedProduct.bundle_id;

    const name = isBundle ? selectedProduct.bundle_name : selectedProduct.product_name;
    const stock = selectedProduct.stock ?? 1;
    const price = isBundle
        ? selectedProduct.branch_discounted_price || selectedProduct.branch_price
        : selectedProduct.isRefill
            ? selectedProduct.refill_price
            : selectedProduct.discounted_price || selectedProduct.price;

    const maxQuantity = isBundle ? 99 : stock;

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
            onClick={() => setSelectedProduct(null)}
        >
            <div
                className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-md overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-white transition"
                >
                    <X className="w-6 h-6" />
                </button>

                <img
                    src={
                        isBundle
                            ? selectedProduct.bundle_image.startsWith("http")
                                ? selectedProduct.bundle_image
                                : `${BASE_URL}/products/bundles/${selectedProduct.bundle_image}`
                            : selectedProduct.image_url.startsWith("http")
                                ? selectedProduct.image_url
                                : `${BASE_URL}/products/images/${selectedProduct.image_url}`
                    }
                    alt={name}
                    className="h-48 w-full object-cover"
                />

                <div className="p-5">
                    <h2 className="text-xl font-semibold text-white text-center">{name}</h2>

                    {!isBundle && (
                        <p className="text-center text-sm text-gray-400 mt-1">
                            Stock Available:{" "}
                            <span className={`${selectedProduct.stock > 0 ? "text-green-400" : "text-red-500"} font-semibold`}>
                                {selectedProduct.stock}
                            </span>
                        </p>
                    )}

                    <div className="text-center mt-2">
                        {!isBundle && selectedProduct.discounted_price && (
                            <p className="text-gray-400 line-through text-sm">₱{formatPrice(selectedProduct.price)}</p>
                        )}
                        <p className="text-green-400 font-bold text-lg">₱{formatPrice(price)}</p>
                    </div>

                    {!isBundle && selectedProduct.refill_price && (
                        <div className="flex justify-center gap-4 mt-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="purchaseType"
                                    value="full"
                                    checked={!selectedProduct.isRefill}
                                    onChange={() => handleToggleRefill(false)}
                                />
                                Regular
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="purchaseType"
                                    value="refill"
                                    checked={selectedProduct.isRefill}
                                    onChange={() => handleToggleRefill(true)}
                                />
                                Refill
                            </label>
                        </div>
                    )}

                    {isBundle && (
                        <div className="mt-3 text-gray-300 text-sm">
                            <p className="font-semibold mb-2">Includes:</p>
                            <ul className="flex flex-col gap-2">
                                {selectedProduct.items.map((item) => (
                                    <li key={item.product_id} className="flex items-center gap-2">
                                        <img
                                            src={
                                                item.product_image.startsWith("http")
                                                    ? item.product_image
                                                    : `${BASE_URL}/products/images/${item.product_image}`
                                            }
                                            alt={item.product_name}
                                            className="w-10 h-10 object-cover rounded"
                                        />
                                        <span>
                                            {item.product_name} x{item.required_qty * quantity}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <input
                            type="text"
                            name="name"
                            placeholder="Customer Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                            required
                        />

                        <input
                            type="text"
                            name="contact"
                            placeholder="+63XXXXXXXXXX"
                            value={formData.contact || "+63"}
                            onChange={handlePhoneChange}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                            required
                        />

                        <div className="flex gap-3">
                            <select
                                name="municipality"
                                value={formData.municipality}
                                onChange={handleInputChange}
                                className="w-1/2 p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                                required
                            >
                                <option value="">Select Municipality</option>
                                <option value="Boac">Boac</option>
                                <option value="Gasan">Gasan</option>
                                <option value="Mogpog">Mogpog</option>
                                <option value="Santa Cruz">Santa Cruz</option>
                                <option value="Torrijos">Torrijos</option>
                                <option value="Buenavista">Buenavista</option>
                            </select>

                            <select
                                name="barangay"
                                value={formData.barangay}
                                onChange={(e) => {
                                    const selected = barangays.find((b) => b.name === e.target.value);
                                    setFormData({
                                        ...formData,
                                        barangay: e.target.value,
                                        barangay_id: selected ? selected.id : "",
                                    });
                                }}
                                className="w-1/2 p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                                required
                                disabled={!barangays.length}
                            >
                                <option value="">Select Barangay</option>
                                {barangays.map((b) => (
                                    <option key={b.id} value={b.name}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* New Delivery Address Field */}
                        <input
                            type="text"
                            name="delivery_address"
                            placeholder="Delivery Address"
                            value={formData.delivery_address || ""}
                            onChange={handleInputChange}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
                            required
                        />

                        <div className="flex items-center justify-between">
                            <span className="text-sm">Quantity</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded"
                                >
                                    -
                                </button>
                                <span>{quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded"
                                    disabled={quantity >= maxQuantity}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <p className="text-lg font-semibold text-center mt-2">
                            Total: ₱{formatPrice(price * quantity)}
                        </p>

                        <button
                            type="submit"
                            disabled={loading || (!isBundle && stock <= 0)}
                            className={`w-full mt-3 p-2 rounded font-semibold transition ${loading || (!isBundle && stock <= 0) ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
                                }`}
                        >
                            {(!isBundle && stock <= 0) ? "Out of Stock" : loading ? "Processing..." : "Buy Now"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
