import React from "react";
import { Package } from "lucide-react";

export default function EditProductModal({ selectedProduct, setSelectedProduct }) {
    if (!selectedProduct) return null;

    const formatPrice = (value) => {
        const num = Number(value);
        if (isNaN(num)) return "0.00";
        return num.toFixed(2);
    };

    // Organize product info
    const infoItems = [
        { label: "Details", value: selectedProduct.product_description || "No details provided." },
        { label: "Stock", value: selectedProduct.stock, type: "stock" },
        { label: "Stock Threshold", value: selectedProduct.stock_threshold },
        { label: "Type", value: selectedProduct.product_type },
        { label: "Price", value: `₱${formatPrice(selectedProduct.price)}` },
        { label: "Refill Price", value: selectedProduct.refill_price ? `₱${formatPrice(selectedProduct.refill_price)}` : "—" },
    ];

    if (selectedProduct.product_type === "discounted") {
        infoItems.push(
            { label: "Discounted Price", value: `₱${formatPrice(selectedProduct.discounted_price)}`, type: "discount" },
            { label: "Discount Until", value: selectedProduct.discount_until ? new Date(selectedProduct.discount_until).toLocaleDateString() : "—" }
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-5xl h-[520px] overflow-hidden relative flex flex-col md:flex-row transition-all duration-300">

                {/* Close Button */}
                <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition text-xl"
                >
                    ✕
                </button>

                {/* Left: Image */}
                <div className="flex-shrink-0 w-full md:w-1/2 h-full bg-gray-900 relative flex items-center justify-center">
                    {selectedProduct.image_url ? (
                        <img
                            src={selectedProduct.image_url}
                            alt={selectedProduct.product_name}
                            className="w-full h-full object-cover rounded-l-2xl"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-l-2xl">
                            <Package size={90} className="text-gray-500" />
                        </div>
                    )}
                </div>

                {/* Right: Product Info */}
                <div className="flex-1 p-7 flex flex-col overflow-y-auto">
                    <h2 className="text-3xl font-bold text-white mb-5">{selectedProduct.product_name}</h2>
                    <hr className="border-gray-700 mb-5" />

                    <div className="grid grid-cols-2 gap-x-10 gap-y-4 text-gray-200">
                        {infoItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="font-semibold text-white w-36">{item.label}:</span>
                                {item.type === "stock" ? (
                                    <span
                                        className={`inline-block px-3 py-1 text-sm font-semibold rounded-lg shadow-sm ${selectedProduct.stock <= selectedProduct.stock_threshold
                                            ? "bg-red-600 text-white"
                                            : selectedProduct.stock <= selectedProduct.stock_threshold + 5
                                                ? "bg-yellow-400 text-gray-800"
                                                : "bg-green-600 text-white"
                                            }`}
                                    >
                                        {item.value}
                                    </span>
                                ) : item.type === "discount" ? (
                                    <span className="text-green-400 font-semibold">{item.value}</span>
                                ) : (
                                    <span>{item.value}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
