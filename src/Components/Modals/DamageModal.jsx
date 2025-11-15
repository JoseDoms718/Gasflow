import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function DamageModal({ product, isOpen, onClose, onSubmit }) {
    const [quantity, setQuantity] = useState(1);
    const [details, setDetails] = useState("");

    // Reset state when a new product is selected or modal is opened
    useEffect(() => {
        if (isOpen && product) {
            setQuantity(1);
            setDetails("");
        }
    }, [product, isOpen]);

    if (!isOpen || !product) return null;

    const handleSubmit = () => {
        if (quantity <= 0) return alert("Enter a valid quantity");
        if (quantity > product.stock) return alert("Quantity exceeds available stock");
        onSubmit({ product, quantity, details });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg w-[400px] p-6 relative">
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    onClick={onClose}
                >
                    <X />
                </button>
                <h2 className="text-lg font-bold mb-4">Report Damage: {product.name}</h2>
                <div className="flex flex-col gap-3">
                    <label className="font-medium">Quantity (Available: {product.stock})</label>
                    <input
                        type="number"
                        min={1}
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="border px-3 py-2 rounded w-full"
                    />
                    <label className="font-medium">Details / Reason</label>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="border px-3 py-2 rounded w-full"
                        rows={3}
                    />
                    <button
                        onClick={handleSubmit}
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Submit Damage
                    </button>
                </div>
            </div>
        </div>
    );
}
