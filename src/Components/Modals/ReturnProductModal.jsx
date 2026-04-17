import { useState } from "react";
import { X, RotateCcw } from "lucide-react";

export default function ReturnProductModal({ onClose, onConfirm, order }) {
    const [reason, setReason] = useState("");

    const handleSubmit = () => {
        if (!reason) return;
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden bg-gray-800 border border-gray-600 animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-gray-600">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500/20 p-2 rounded-full">
                            <RotateCcw className="text-orange-400" size={18} />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Request Return
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-400 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">

                    {order && (
                        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-gray-300">
                            Order ID:{" "}
                            <span className="font-semibold text-white">
                                #{order.order_id}
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Reason for Return
                        </label>

                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                        >
                            <option value="">Select reason</option>
                            <option value="return">Return</option>
                            <option value="defect">Defective / Damaged</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-600 bg-gray-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!reason}
                        className={`px-4 py-2 text-sm rounded-lg font-medium transition ${reason
                                ? "bg-orange-500 hover:bg-orange-600 text-white shadow"
                                : "bg-orange-400/40 text-orange-100 cursor-not-allowed"
                            }`}
                    >
                        Submit Request
                    </button>
                </div>
            </div>
        </div>
    );
}
