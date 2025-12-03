import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_BASE_URL;

export default function LoanSection() {
    const [loans, setLoans] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all"); // Filter state

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${API_URL}/loans/myLoans`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLoans(res.data.loans || []);
            } catch (err) {
                console.error(err);
                setLoans([]);
            }
        };

        fetchLoans();
    }, []);

    const formatPeso = (amount) =>
        new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

    // Filter loans based on status
    const filteredLoans =
        statusFilter === "all" ? loans : loans.filter((loan) => loan.status?.toLowerCase() === statusFilter);

    // Placeholder items for each status
    const placeholderLoans = [
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Pending" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Paid" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
        { product: "LPG Cylinder", amount: 1200, issued_date: "-", due_date: "-", status: "Overdue" },
    ];

    // Decide what to display: filtered real loans or placeholders
    let loansToDisplay = [];
    if (filteredLoans.length > 0) {
        loansToDisplay = filteredLoans;
    } else {
        loansToDisplay = placeholderLoans.filter(
            (p) => statusFilter === "all" || p.status.toLowerCase() === statusFilter
        );
    }

    // Ensure table always fills the height even if few rows
    const minRows = 5;
    const emptyRows = loansToDisplay.length < minRows ? minRows - loansToDisplay.length : 0;

    return (
        <section className="bg-gray-900 min-h-dvh pt-8 md:pt-12 pb-12">
            <div className="container mx-auto px-4 py-8 md:py-12 h-full flex flex-col">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">My Loans</h2>

                {/* Filter */}
                <div className="mb-4">
                    <label className="text-white mr-2">Filter by Status:</label>
                    <select
                        className="px-3 py-1 rounded border border-gray-400 bg-gray-800 text-white"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>

                <div className="overflow-x-auto flex-grow max-h-[70vh] min-h-[40vh] border border-gray-700 rounded-lg relative">
                    <table className="min-w-[900px] w-full divide-y divide-gray-600 bg-gray-800 text-base">
                        <thead className="bg-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-white">Loan Name</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-white">Amount</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-white">Issued Date</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-white">Due Date</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-white">Status</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-600 min-h-[40vh]">
                            {loansToDisplay.map((loan, idx) => (
                                <tr key={loan.id || idx} className="bg-gray-800">
                                    <td className="px-4 py-3 text-white">{loan.product || "-"}</td>
                                    <td className="px-4 py-3 text-white">
                                        {loan.amount !== undefined ? formatPeso(loan.amount) : "---"}
                                    </td>
                                    <td className="px-4 py-3 text-white">{loan.issued_date || "-"}</td>
                                    <td className="px-4 py-3 text-white">{loan.due_date || "-"}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-600 text-white">
                                            {loan.status || "Pending"}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {/* Add empty rows to fill table height */}
                            {emptyRows > 0 &&
                                Array(emptyRows)
                                    .fill(null)
                                    .map((_, idx) => (
                                        <tr key={`empty-${idx}`} className="bg-gray-800">
                                            <td colSpan={5}></td>
                                        </tr>
                                    ))}

                            {/* If no real loans and no placeholders */}
                            {loansToDisplay.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
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
