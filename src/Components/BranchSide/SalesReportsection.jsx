import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { PlusCircle, X, Download } from "lucide-react";
import axios from "axios";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [branch, setBranch] = useState("All");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [userRole, setUserRole] = useState(null);
  const [userMunicipality, setUserMunicipality] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [newExpense, setNewExpense] = useState({ name: "", amount: "" });

  const branches = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  // Fetch user info, expenses, and transactions
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchData = async () => {
      try {
        const { data: me } = await axios.get("http://localhost:5000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const role = me.user.role;
        const municipality = me.user.municipality;
        setUserRole(role);
        setUserMunicipality(municipality);

        const { data: expensesRes } = await axios.get("http://localhost:5000/expenses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (expensesRes.success) {
          const formatted = expensesRes.expenses.map((e) => ({
            id: e.expense_id,
            name: e.expenses_details,
            amount: parseFloat(e.expenses_cost),
            date: new Date(e.created_at).toISOString().split("T")[0],
            branch: e.municipality || "Unknown",
            addedBy: e.user_name || "N/A",
          }));
          setExpenses(formatted);
        }

        const { data: transactionsRes } = await axios.get(
          "http://localhost:5000/orders/my-sold",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (transactionsRes.success) {
          const formattedTrans = transactionsRes.orders.flatMap((order) =>
            order.items.map((item) => ({
              id: item.product_id,
              productName: item.product_name,
              quantity: item.quantity,
              totalPrice: parseFloat(item.price) * parseFloat(item.quantity),
              date: order.delivered_at
                ? new Date(order.delivered_at).toISOString().split("T")[0]
                : new Date(order.ordered_at).toISOString().split("T")[0],
              branch: order.municipality || order.barangay || "Unknown",
              addedBy: item.seller_name || "N/A",
            }))
          );
          setTransactions(formattedTrans);
        }
      } catch (err) {
        console.error(err);
        if (err.response) console.error(err.response.data);
      }
    };

    fetchData();
  }, []);

  // Add expense
  const handleAddExpense = async () => {
    if (!newExpense.name.trim() || !newExpense.amount || newExpense.amount <= 0) {
      return toast.error("Please fill all fields correctly.");
    }

    const token = localStorage.getItem("token");
    if (!token) return toast.error("You are not authenticated.");

    try {
      const res = await axios.post(
        "http://localhost:5000/expenses",
        { expenses_details: newExpense.name, expenses_cost: newExpense.amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const refreshed = await axios.get("http://localhost:5000/expenses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshed.data.success) {
          const formatted = refreshed.data.expenses.map((e) => ({
            id: e.expense_id,
            name: e.expenses_details,
            amount: parseFloat(e.expenses_cost),
            date: new Date(e.created_at).toISOString().split("T")[0],
            branch: e.municipality || "Unknown",
            addedBy: e.user_name || "N/A",
          }));
          setExpenses(formatted);
        }
        setShowExpenseModal(false);
        setNewExpense({ name: "", amount: "" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense. Try again.");
    }
  };

  // Filters
  const filteredTransactions = transactions.filter((t) => {
    const [y, m] = t.date.split("-");
    const branchMatch =
      userRole === "admin" ? branch === "All" || t.branch === branch : t.branch === userMunicipality;
    return branchMatch && m === month && y === year;
  });
  const filteredExpenses = expenses.filter((e) => {
    const [y, m] = e.date.split("-");
    const branchMatch =
      userRole === "admin" ? branch === "All" || e.branch === branch : e.branch === userMunicipality;
    return branchMatch && m === month && y === year;
  });

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.totalPrice, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Export Excel
  const handleExportExcel = () => {
    const data =
      activeTab === "sales"
        ? filteredTransactions.map((t) => ({
          "Added By": t.addedBy,
          Municipality: t.branch,
          Product: t.productName,
          Quantity: t.quantity,
          "Total Price (₱)": t.totalPrice,
          "Delivery Date": t.date,
        }))
        : filteredExpenses.map((e) => ({
          "Added By": e.addedBy,
          Municipality: e.branch,
          "Expense Name": e.name,
          "Amount (₱)": e.amount,
          Date: e.date,
        }));

    if (!data.length) return toast.error("No data to export for this period.");

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length + 2, ...data.map((r) => String(r[key]).length + 2)),
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === "sales" ? "Sales" : "Expenses");
    const fileName = `${activeTab === "sales" ? "Sales" : "Expenses"}_${month}-${year}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
  };

  // Charts
  const productRevenueMap = filteredTransactions.reduce((acc, t) => {
    acc[t.productName] = (acc[t.productName] || 0) + t.totalPrice;
    return acc;
  }, {});
  const pieOptions = { labels: Object.keys(productRevenueMap), legend: { position: "bottom" } };
  const pieSeries = Object.values(productRevenueMap);

  const dateRevenueMap = filteredTransactions.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.totalPrice;
    return acc;
  }, {});
  const sortedDates = Object.keys(dateRevenueMap).sort((a, b) => new Date(a) - new Date(b));
  const lineOptions = {
    chart: { id: "sales-trend" },
    xaxis: { categories: sortedDates },
    stroke: { curve: "smooth" },
    yaxis: { labels: { formatter: (val) => `₱${val.toFixed(2)}` } },
    tooltip: { y: { formatter: (val) => `₱${val.toFixed(2)}` } },
  };
  const lineSeries = [{ name: "Total Sales", data: sortedDates.map((d) => dateRevenueMap[d]) }];

  return (
    <div className="p-6 w-full h-[750px] flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Reports</h2>

      {/* Tabs + Revenue Summary */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex border-b">
          {["sales", "expenses"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold ${activeTab === tab
                  ? "border-b-4 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-blue-500"
                }`}
            >
              {tab === "sales" ? "Sales Report" : "Expenses Report"}
            </button>
          ))}
        </div>

        {/* Revenue / Expenses / Net Summary */}
        <div className="text-lg font-semibold text-gray-800 flex gap-4">
          Revenue: <span className="text-green-600">₱{totalRevenue.toFixed(2)}</span> |{" "}
          Expenses: <span className="text-red-600">₱{totalExpenses.toFixed(2)}</span> |{" "}
          Net: <span className="text-blue-600">₱{netIncome.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters + Buttons */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex gap-4 items-center">
          {userRole === "admin" && (
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="border border-gray-300 rounded p-2"
            >
              <option value="All">All Municipalities</option>
              {branches.map((b, idx) => (
                <option key={idx} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}

          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded p-2"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, "0");
              return (
                <option key={m} value={m}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              );
            })}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-300 rounded p-2"
          >
            {["2023", "2024", "2025", "2026"].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          {activeTab === "expenses" && (
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
            >
              <PlusCircle className="w-5 h-5" /> Add Expense
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
          >
            <Download className="w-5 h-5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Main Content (Sales / Expenses) */}
      {activeTab === "sales" ? (
        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* Sales Table */}
          <div className="flex-1 border border-gray-300 rounded-lg overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500 py-20">
                No sales data available for this period.
              </div>
            ) : (
              <table className="w-full border-collapse text-center">
                <thead className="bg-gray-900 text-white sticky top-0 z-10">
                  <tr>
                    {userRole === "admin" && (
                      <>
                        <th className="px-4 py-3 border-b border-gray-700">Added By</th>
                        <th className="px-4 py-3 border-b border-gray-700">Municipality</th>
                      </>
                    )}
                    <th className="px-4 py-3 border-b border-gray-700">Product</th>
                    <th className="px-4 py-3 border-b border-gray-700">Quantity</th>
                    <th className="px-4 py-3 border-b border-gray-700">Total Price</th>
                    <th className="px-4 py-3 border-b border-gray-700">Delivery Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 border-t border-gray-300">
                      {userRole === "admin" && (
                        <>
                          <td className="px-4 py-3">{t.addedBy}</td>
                          <td className="px-4 py-3">{t.branch}</td>
                        </>
                      )}
                      <td className="px-4 py-3 font-semibold">{t.productName}</td>
                      <td className="px-4 py-3">{t.quantity}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">
                        ₱{t.totalPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Charts */}
          <div className="w-[45%] flex flex-col gap-6">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 border border-gray-300 rounded-lg bg-white">
                No chart data available for this period.
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg p-4 border border-gray-300">
                  <Chart options={pieOptions} series={pieSeries} type="pie" height={250} />
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-300 flex-1">
                  <Chart options={lineOptions} series={lineSeries} type="line" height="100%" />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        // Expenses Table
        <div className="flex-1 border border-gray-300 rounded-lg overflow-y-auto">
          {filteredExpenses.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500 py-20">
              No expense data available for this period.
            </div>
          ) : (
            <table className="w-full border-collapse text-center">
              <thead className="bg-gray-900 text-white sticky top-0 z-10">
                <tr>
                  {userRole === "admin" && (
                    <>
                      <th className="px-4 py-3 border-b border-gray-700">Added By</th>
                      <th className="px-4 py-3 border-b border-gray-700">Municipality</th>
                    </>
                  )}
                  <th className="px-4 py-3 border-b border-gray-700">Expense Name</th>
                  <th className="px-4 py-3 border-b border-gray-700">Amount</th>
                  <th className="px-4 py-3 border-b border-gray-700">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 border-t border-gray-300">
                    {userRole === "admin" && (
                      <>
                        <td className="px-4 py-3">{e.addedBy}</td>
                        <td className="px-4 py-3">{e.branch}</td>
                      </>
                    )}
                    <td className="px-4 py-3 font-semibold">{e.name}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">₱{e.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg w-[400px] p-6 shadow-lg relative">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Add New Expense</h3>

            <input
              type="text"
              placeholder="Expense Name"
              value={newExpense.name}
              onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              className="w-full border border-gray-300 rounded p-2 mb-3"
            />
            <input
              type="number"
              placeholder="Amount"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              className="w-full border border-gray-300 rounded p-2 mb-4"
            />

            <button
              onClick={handleAddExpense}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded shadow"
            >
              Save Expense
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
