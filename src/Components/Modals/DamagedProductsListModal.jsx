import React from "react";
import { Box } from "lucide-react";

export default function DamagedProductsListModal({ damagedProducts }) {
    return (
        <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
            <div className="overflow-y-auto h-full">
                <table className="min-w-full text-sm text-center">
                    <thead className="bg-gray-900 text-white sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Quantity</th>
                            <th className="px-4 py-3">Total Product Loss</th>
                        </tr>
                    </thead>
                    <tbody>
                        {damagedProducts.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="py-10 text-gray-500">
                                    No damaged products reported.
                                </td>
                            </tr>
                        ) : (
                            damagedProducts.map((dp) => {
                                const unitPrice =
                                    dp.product_type === "discounted"
                                        ? dp.discounted_price
                                        : dp.price;

                                const totalLoss = (unitPrice * dp.quantity).toFixed(2);

                                return (
                                    <tr key={dp.damage_id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 flex justify-center items-center gap-3">
                                            {dp.image_url ? (
                                                <img
                                                    src={
                                                        dp.image_url.startsWith("http")
                                                            ? dp.image_url
                                                            : `http://localhost:5000/products/images/${dp.image_url}`
                                                    }
                                                    alt={dp.product_name}
                                                    className="w-10 h-10 object-cover rounded"
                                                />
                                            ) : (
                                                <Box className="w-10 h-10 text-gray-400" />
                                            )}
                                            <span className="font-medium">{dp.product_name}</span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">{dp.quantity}</td>
                                        <td className="px-4 py-3 text-red-600 font-semibold">
                                            -₱{totalLoss}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
