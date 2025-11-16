import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { PlusCircle, Download } from "lucide-react";
import axios from "axios";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

import ExpensesReportSection from "./ExpensesReportSection";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [branch, setBranch] = useState("All");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [userRole, setUserRole] = useState(null);
  const [userMunicipality, setUserMunicipality] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [newExpense, setNewExpense] = useState({ name: "", amount: "" });

  const branches = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchData = async () => {
      try {
        const { data: me } = await axios.get("http://localhost:5000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserRole(me.user.role);
        setUserMunicipality(me.user.municipality);

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
            order.items.map((item, index) => ({
              id: `${order.order_id}-${item.product_id}-${index}`, // unique key fix
              product_id: item.product_id,
              productName: item.product_name,
              quantity: item.quantity,
              totalPrice: parseFloat(item.price) * parseFloat(item.quantity),
              date: order.delivered_at
                ? new Date(order.delivered_at).toISOString().split("T")[0]
                : new Date(order.ordered_at).toISOString().split("T")[0],
              branch: order.municipality || order.barangay || "Unknown",
              addedBy: item.seller_name || "N/A",
              buyer: order.full_name || "N/A",
            }))
          );
          setTransactions(formattedTrans);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

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
        toast.success("Expense added successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense. Try again.");
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    const tYear = date.getFullYear();
    const tMonth = String(date.getMonth() + 1).padStart(2, "0");
    const tDay = date.getDate();

    const branchMatch = userRole === "admin" ? branch === "All" || t.branch === branch : true;
    if (!branchMatch) return false;

    const today = new Date();
    if (timeFilter === "daily") {
      return tYear === today.getFullYear() &&
        tMonth === String(today.getMonth() + 1).padStart(2, "0") &&
        tDay === today.getDate();
    }

    if (timeFilter === "weekly") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return date >= startOfWeek && date <= endOfWeek;
    }

    return tMonth === month && tYear.toString() === year;
  });

  const filteredExpenses = expenses.filter((e) => {
    const date = new Date(e.date);
    const eYear = date.getFullYear();
    const eMonth = String(date.getMonth() + 1).padStart(2, "0");
    const eDay = date.getDate();

    const branchMatch = userRole === "admin" ? branch === "All" || e.branch === branch : true;
    if (!branchMatch) return false;

    const today = new Date();
    if (timeFilter === "daily") {
      return eYear === today.getFullYear() &&
        eMonth === String(today.getMonth() + 1).padStart(2, "0") &&
        eDay === today.getDate();
    }

    if (timeFilter === "weekly") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return date >= startOfWeek && date <= endOfWeek;
    }

    return eMonth === month && eYear.toString() === year;
  });

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.totalPrice, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  const handleExportExcel = () => {
    const data =
      activeTab === "sales"
        ? filteredTransactions.map((t) =>
          userRole === "admin"
            ? {
              "Added By": t.addedBy,
              Municipality: t.branch,
              Product: t.productName,
              Quantity: t.quantity,
              "Total Price (₱)": t.totalPrice,
              "Delivery Date": t.date,
            }
            : {
              Buyer: t.buyer,
              Product: t.productName,
              Quantity: t.quantity,
              "Total Price (₱)": t.totalPrice,
              "Delivery Date": t.date,
              Municipality: t.branch,
            }
        )
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

  const productQuantityMap = filteredTransactions.reduce((acc, t) => {
    acc[t.productName] = (acc[t.productName] || 0) + t.quantity;
    return acc;
  }, {});

  const pieOptions = {
    labels: Object.keys(productQuantityMap),
    legend: { position: "bottom" },
    tooltip: { y: { formatter: (val) => `${val} pcs` } },
  };
  const pieSeries = Object.values(productQuantityMap);

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

  const lineSeries = [
    { name: "Total Sales", data: sortedDates.map((d) => dateRevenueMap[d]) },
  ];

  return (
    <div className="p-6 w-full h-[750px] flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Reports</h2>

      {/* Tabs */}
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

        <div className="text-lg font-semibold text-gray-800 flex gap-4">
          Revenue: <span className="text-green-600">₱{totalRevenue.toFixed(2)}</span> |{" "}
          Expenses: <span className="text-red-600">₱{totalExpenses.toFixed(2)}</span> |{" "}
          Net: <span className="text-blue-600">₱{netIncome.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters & Buttons */}
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

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="border border-gray-300 rounded p-2"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex gap-4">
          {activeTab === "expenses" && userRole !== "admin" && (
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

      {/* Main Content */}
      {activeTab === "sales" ? (
        <div className="flex flex-1 gap-6 overflow-hidden">
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
                      <th className="px-4 py-3 border-b border-gray-700">Municipality</th>
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
                      {userRole === "admin" && <td className="px-4 py-3">{t.branch}</td>}
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
        <ExpensesReportSection
          filteredExpenses={filteredExpenses}
          userRole={userRole}
          branches={branches}
          showExpenseModal={showExpenseModal}
          setShowExpenseModal={setShowExpenseModal}
          newExpense={newExpense}
          setNewExpense={setNewExpense}
          handleAddExpense={handleAddExpense}
        />
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Expense</h2>

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Expense Name"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                className="border border-gray-300 rounded p-2"
              />

              <input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="border border-gray-300 rounded p-2"
              />
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleAddExpense}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
