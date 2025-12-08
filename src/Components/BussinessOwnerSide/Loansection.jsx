import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function LoanSection() {
    const [loans, setLoans] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${BASE_URL}/orders/my-loans`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const loansWithFullImages = (res.data.loans || []).map((loan) => ({
                    ...loan,
                    image_url: loan.image_url
                        ? `${BASE_URL}/products/images/${loan.image_url}`
                        : null,
                }));

                setLoans(loansWithFullImages);
            } catch (err) {
                console.error(err);
                setLoans([]);
            }
        };

        fetchLoans();
    }, []);

    const formatPeso = (amount) =>
        new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

    const filteredLoans =
        statusFilter === "all"
            ? loans
            : loans.filter((loan) => loan.status?.toLowerCase() === statusFilter);

    const minRows = 5;
    const emptyRows =
        filteredLoans.length < minRows ? minRows - filteredLoans.length : 0;

    const handleSchedulePayment = (loan) => {
        alert(`Schedule payment for ${loan.product_name} (Loan ID: ${loan.loan_id})`);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "pending":
                return "bg-yellow-500 text-gray-900";
            case "paid":
                return "bg-green-500 text-white";
            case "overdue":
                return "bg-red-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    return (
        <section className="bg-gray-900 min-h-dvh pt-8 md:pt-12 pb-12">
            <div className="container mx-auto px-4 py-8 md:py-12 h-full flex flex-col">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
                    My Loans
                </h2>

                {/* Filter */}
                <div className="mb-6 flex items-center gap-3 justify-center">
                    <label className="text-white font-medium">Filter by Status:</label>
                    <select
                        className="px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>

                <div className="overflow-x-auto flex-grow max-h-[70vh] min-h-[40vh] border border-gray-700 rounded-lg relative shadow-lg">
                    <table className="min-w-[1000px] w-full table-fixed divide-y divide-gray-600 bg-gray-800 text-base">
                        <thead className="bg-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                                    Loaned Product
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-white">
                                    Amount
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-white">
                                    Issued Date
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-white">
                                    Due Date
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-white">
                                    Loaned From
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-white">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-white">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-600">
                            {filteredLoans.map((loan, idx) => (
                                <tr
                                    key={loan.loan_id || idx}
                                    className="bg-gray-800 hover:bg-gray-700 transition-colors"
                                >
                                    {/* Loaned Product */}
                                    <td className="px-4 py-3 text-white">
                                        <div className="flex items-center gap-3">
                                            {loan.image_url && (
                                                <img
                                                    src={loan.image_url}
                                                    alt={loan.product_name}
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                            )}
                                            <span className="font-medium">{loan.product_name || "-"}</span>
                                        </div>
                                    </td>

                                    {/* Amount */}
                                    <td className="px-4 py-3 text-center text-white">
                                        {loan.price !== undefined ? formatPeso(loan.price) : "---"}
                                    </td>

                                    {/* Issued Date */}
                                    <td className="px-4 py-3 text-center text-white">
                                        {loan.created_at ? new Date(loan.created_at).toLocaleDateString() : "-"}
                                    </td>

                                    {/* Due Date */}
                                    <td className="px-4 py-3 text-center text-white">
                                        {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : "-"}
                                    </td>

                                    {/* Loaned From */}
                                    <td className="px-4 py-3 text-center text-white">{loan.branch_name || "-"}</td>

                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                                                loan.status
                                            )}`}
                                        >
                                            {loan.status || "Pending"}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium transition-colors"
                                            onClick={() => handleSchedulePayment(loan)}
                                        >
                                            Schedule Payment
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {/* Empty Rows for min height */}
                            {emptyRows > 0 &&
                                Array(emptyRows)
                                    .fill(null)
                                    .map((_, idx) => (
                                        <tr key={`empty-${idx}`} className="bg-gray-800">
                                            <td colSpan={7}></td>
                                        </tr>
                                    ))}

                            {/* No Loans */}
                            {filteredLoans.length === 0 && (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="flex items-center justify-center h-[60vh] text-gray-400 text-lg">
                                            No Loans Found
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
