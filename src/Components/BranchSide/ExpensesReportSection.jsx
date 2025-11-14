import React from "react";
import { PlusCircle, Box } from "lucide-react";

export default function ExpensesReportSection({
    filteredExpenses,
    userRole,
    showExpenseModal,
    setShowExpenseModal,
    newExpense,
    setNewExpense,
    handleAddExpense,
}) {
    return (
        <div className="flex gap-6 w-full h-[700px] overflow-hidden">

            {/* LEFT SIDE – EXPENSES TABLE */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
                <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">

                    <div className="overflow-y-auto h-full">
                        <table className="min-w-full text-sm text-gray-800 text-center">
                            <thead className="bg-gray-900 text-white sticky top-0 z-10">
                                <tr>
                                    {userRole === "admin" && (
                                        <>
                                            <th className="px-4 py-3 text-center">Added By</th>
                                            <th className="px-4 py-3 text-center">Municipality</th>
                                        </>
                                    )}
                                    <th className="px-4 py-3 text-center">Expense Name</th>
                                    <th className="px-4 py-3 text-center">Amount</th>
                                    <th className="px-4 py-3 text-center">Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={userRole === "admin" ? 5 : 3}
                                            className="py-20 text-gray-500 text-center"
                                        >
                                            No expense data available.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((e) => (
                                        <tr
                                            key={e.id}
                                            className="border-b hover:bg-gray-50 text-center"
                                        >
                                            {userRole === "admin" && (
                                                <>
                                                    <td className="px-4 py-3">{e.addedBy}</td>
                                                    <td className="px-4 py-3">{e.branch}</td>
                                                </>
                                            )}
                                            <td className="px-4 py-3 font-semibold">{e.name}</td>
                                            <td className="px-4 py-3 text-red-600 font-medium">
                                                ₱{e.amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">{e.date}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE – TWO TABLES */}
            <div className="w-[500px] flex flex-col gap-6 overflow-hidden">

                {/* PRODUCTS TABLE */}
                <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
                    <div className="overflow-y-auto h-full">
                        <table className="min-w-full text-sm text-center">
                            <thead className="bg-gray-900 text-white sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-center">Product</th>
                                    <th className="px-4 py-3 text-center">Current Stock</th>
                                    <th className="px-4 py-3 text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 flex justify-center items-center gap-3">
                                        <Box className="w-10 h-10 text-gray-400" />
                                        <span className="font-medium">11kg</span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">25</td>
                                    <td className="px-4 py-3">
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 mx-auto">
                                            <PlusCircle className="w-5 h-5" /> Damage
                                        </button>
                                    </td>
                                </tr>

                                <tr className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 flex justify-center items-center gap-3">
                                        <Box className="w-10 h-10 text-gray-400" />
                                        <span className="font-medium">7kg</span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">12</td>
                                    <td className="px-4 py-3">
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 mx-auto">
                                            <PlusCircle className="w-5 h-5" /> Damage
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DAMAGED PRODUCTS TABLE */}
                <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
                    <div className="overflow-y-auto h-full">
                        <table className="min-w-full text-sm text-center">
                            <thead className="bg-gray-900 text-white sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-center">Product</th>
                                    <th className="px-4 py-3 text-center">Qty</th>
                                    <th className="px-4 py-3 text-center">Loss</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 flex justify-center items-center gap-3">
                                        <Box className="w-10 h-10 text-gray-400" />
                                        <span className="font-medium">11kg</span>
                                    </td>
                                    <td className="px-4 py-3">1</td>
                                    <td className="px-4 py-3 text-red-600 font-semibold">
                                        -₱500
                                    </td>
                                </tr>

                                <tr className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 flex justify-center items-center gap-3">
                                        <Box className="w-10 h-10 text-gray-400" />
                                        <span className="font-medium">Butane</span>
                                    </td>
                                    <td className="px-4 py-3">3</td>
                                    <td className="px-4 py-3 text-red-600 font-semibold">
                                        -₱300
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
