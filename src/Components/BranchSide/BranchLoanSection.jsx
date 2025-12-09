import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, CalendarPlus, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast"; // optional, for notifications

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function BranchLoanSection() {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BASE_URL}/orders/branch-loans`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLoans(res.data.loans || []);
            } catch (err) {
                setError("Failed to fetch branch loans");
            } finally {
                setLoading(false);
            }
        };
        fetchLoans();
    }, []);

    const formatPeso = (amount) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount || 0);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            case "paid":
                return "bg-green-100 text-green-800";
            case "overdue":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const filteredLoans =
        statusFilter === "all"
            ? loans
            : loans.filter(
                (loan) => loan.status?.toLowerCase() === statusFilter
            );

    // --- Handle marking loan as paid ---
    const handleMarkPaid = async (loan) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `${BASE_URL}/orders/loan/${loan.loan_id}/pay`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update the loan status in local state
            setLoans((prevLoans) =>
                prevLoans.map((l) =>
                    l.loan_id === loan.loan_id ? { ...l, status: "paid" } : l
                )
            );

            toast.success("Loan marked as paid!");
        } catch (err) {
            console.error("Failed to mark loan as paid:", err);
            toast.error("Failed to mark loan as paid.");
        }
    };

    return (
        <div className="p-8 w-full">
            <h2 className="text-3xl font-bold mb-6">Branch Loans</h2>

            {/* Filter */}
            <div className="mb-6 flex items-center gap-4">
                <label className="font-semibold text-lg">Status:</label>
                <select
                    className="border rounded px-4 py-2 text-base"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="min-w-full bg-white text-base">
                    <thead className="bg-gray-900 text-white sticky top-0">
                        <tr>
                            <th className="px-5 py-4 text-left">Loaned Product</th>
                            <th className="px-5 py-4 text-center">Amount</th>
                            <th className="px-5 py-4 text-center">Issued</th>
                            <th className="px-5 py-4 text-center">Due</th>
                            <th className="px-5 py-4 text-center">Branch</th>
                            <th className="px-5 py-4 text-center">Borrower</th>
                            <th className="px-5 py-4 text-center">Status</th>
                            <th className="px-5 py-4 text-center">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan="8" className="py-10 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        )}

                        {!loading && error && (
                            <tr>
                                <td colSpan="8" className="py-10 text-center text-red-500">
                                    {error}
                                </td>
                            </tr>
                        )}

                        {!loading && filteredLoans.length === 0 && (
                            <tr>
                                <td colSpan="8" className="py-10 text-center text-gray-500">
                                    No loans found
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            filteredLoans.map((loan) => (
                                <tr
                                    key={loan.loan_id}
                                    className="border-t hover:bg-gray-50 transition"
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-4">
                                            {loan.image_url && (
                                                <img
                                                    src={`${BASE_URL}/products/images/${loan.image_url}`}
                                                    alt={loan.product_name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            )}
                                            <span className="font-semibold">
                                                {loan.product_name || "-"}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 text-center whitespace-nowrap">
                                        {formatPeso(Math.abs(loan.price))}
                                    </td>

                                    <td className="px-5 py-4 text-center">
                                        {loan.created_at
                                            ? new Date(loan.created_at).toLocaleDateString()
                                            : "-"}
                                    </td>

                                    <td className="px-5 py-4 text-center">
                                        {loan.due_date
                                            ? new Date(loan.due_date).toLocaleDateString()
                                            : "-"}
                                    </td>

                                    <td className="px-5 py-4 text-center">
                                        {loan.branch_name}
                                    </td>

                                    <td className="px-5 py-4 text-center">
                                        {loan.user_name}
                                    </td>

                                    <td className="px-5 py-4 text-center">
                                        <span
                                            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(
                                                loan.status
                                            )}`}
                                        >
                                            {loan.status || "Pending"}
                                        </span>
                                    </td>

                                    {/* Extend + Paid */}
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setSelectedLoan(loan)}
                                                className="px-4 h-11 rounded-full bg-indigo-500 text-white flex items-center gap-2 hover:bg-indigo-600 transition"
                                                title="Extend loan"
                                            >
                                                <CalendarPlus size={18} />
                                                <span className="font-medium">Extend</span>
                                            </button>

                                            <button
                                                onClick={() => handleMarkPaid(loan)}
                                                className="px-4 h-11 rounded-full bg-green-500 text-white flex items-center gap-2 hover:bg-green-600 transition"
                                                title="Mark as paid"
                                                disabled={loan.status?.toLowerCase() === "paid"}
                                            >
                                                <CheckCircle size={18} />
                                                <span className="font-medium">Paid</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedLoan && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
                    <div className="bg-gray-900 text-white w-full max-w-lg rounded-xl p-6 relative">
                        <button
                            onClick={() => setSelectedLoan(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={22} />
                        </button>

                        <h3 className="text-xl font-bold mb-5">Loan Details</h3>

                        <div className="grid grid-cols-2 gap-4 text-base mb-4">
                            <div><b>Product:</b> {selectedLoan.product_name}</div>
                            <div><b>Amount:</b> {formatPeso(Math.abs(selectedLoan.price))}</div>
                            <div><b>Issued:</b> {new Date(selectedLoan.created_at).toLocaleDateString()}</div>
                            <div><b>Due:</b> {new Date(selectedLoan.due_date).toLocaleDateString()}</div>
                            <div><b>Branch:</b> {selectedLoan.branch_name}</div>
                            <div><b>Borrower:</b> {selectedLoan.user_name}</div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="font-semibold text-white">Select new due date:</label>
                            <input
                                type="date"
                                className="rounded px-3 py-2 text-black bg-white"
                                min={new Date().toISOString().slice(0, 10)} // prevent past dates
                                value={selectedLoan.new_due_date || selectedLoan.due_date}
                                onChange={(e) =>
                                    setSelectedLoan({ ...selectedLoan, new_due_date: e.target.value })
                                }
                            />
                            <button
                                className="mt-2 w-full bg-white hover:bg-gray-200 text-black rounded py-2 font-semibold"
                                onClick={async () => {
                                    if (!selectedLoan.new_due_date) {
                                        toast.error("Please select a new due date.");
                                        return;
                                    }
                                    try {
                                        const token = localStorage.getItem("token");
                                        const res = await axios.patch(
                                            `${BASE_URL}/orders/${selectedLoan.loan_id}/extend-date`,
                                            { new_due_date: selectedLoan.new_due_date },
                                            { headers: { Authorization: `Bearer ${token}` } }
                                        );

                                        // Update the loan in local state
                                        setLoans((prev) =>
                                            prev.map((loan) =>
                                                loan.loan_id === selectedLoan.loan_id
                                                    ? { ...loan, due_date: selectedLoan.new_due_date }
                                                    : loan
                                            )
                                        );

                                        toast.success(res.data.message);
                                        setSelectedLoan(null);
                                    } catch (err) {
                                        console.error("Failed to extend due date:", err);
                                        toast.error("Failed to extend due date.");
                                    }
                                }}
                            >
                                Save New Due Date
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
