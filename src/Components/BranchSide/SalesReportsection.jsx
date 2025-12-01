import React, { useState, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import { PlusCircle, Download } from "lucide-react";
import axios from "axios";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

import ExpensesReportSection from "./ExpensesReportSection";

const BASE_URL = import.meta.env.VITE_BASE_URL;

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
  const [damagedProducts, setDamagedProducts] = useState([]);
  const [newExpense, setNewExpense] = useState({ name: "", amount: "" });
  const [damagedTotal, setDamagedTotal] = useState(0);

  const branches = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  const toLocalDate = (dateString) => new Date(dateString).toLocaleDateString("en-CA");

  // Fetch data from endpoints
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchData = async () => {
      try {
        // User info
        const { data: me } = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserRole(me.user.role);
        setUserMunicipality(me.user.municipality);

        // Expenses endpoint
        const { data: expensesRes } = await axios.get(`${BASE_URL}/expenses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (expensesRes.success) {
          setExpenses(
            expensesRes.expenses.map((e) => ({
              id: e.expense_id,
              name: e.expenses_details,
              amount: parseFloat(e.expenses_cost),
              date: e.created_at ? toLocalDate(e.created_at) : "N/A",
              branch: e.municipality || "Unknown",
              addedBy: e.user_name || "N/A",
            }))
          );
        }

        // Transactions endpoint
        const { data: transactionsRes } = await axios.get(`${BASE_URL}/orders/my-sold`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (transactionsRes.success) {
          setTransactions(
            transactionsRes.orders.flatMap((order) =>
              order.items.map((item, index) => ({
                id: `${order.order_id}-${item.product_id}-${index}`,
                product_id: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                totalPrice: parseFloat(item.price) * parseFloat(item.quantity),
                date: order.delivered_at
                  ? toLocalDate(order.delivered_at)
                  : toLocalDate(order.ordered_at),
                branch: order.municipality || "Unknown",
                addedBy: item.seller_name || "N/A",
                buyer: order.full_name || "N/A",
              }))
            )
          );
        }

        // Damaged products endpoint
        const { data: damagedRes } = await axios.get(`${BASE_URL}/damaged-products/my-damaged-products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const damagedList = damagedRes.success ? damagedRes.data : [];
        setDamagedProducts(damagedList);

        // Damaged total calculation
        const total = damagedList.reduce((sum, dp) => {
          const quantity = dp.quantity || 0;
          const unitPrice =
            dp.product_type === "discounted"
              ? Number(dp.discounted_price) || 0
              : Number(dp.price) || 0;
          return sum + unitPrice * quantity;
        }, 0);
        setDamagedTotal(total);
      } catch (err) {
        console.error("❌ Failed to fetch reports data:", err);
        toast.error("Failed to fetch reports data");
      }
    };

    fetchData();
  }, []);

  // Add expense
  const handleAddExpense = async () => {
    if (!newExpense.name.trim() || !newExpense.amount || newExpense.amount <= 0)
      return toast.error("Please fill all fields correctly.");

    const token = localStorage.getItem("token");
    if (!token) return toast.error("You are not authenticated.");

    try {
      const res = await axios.post(
        `${BASE_URL}/expenses`,
        { expenses_details: newExpense.name, expenses_cost: newExpense.amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        // Refresh expenses after adding
        const refreshed = await axios.get(`${BASE_URL}/expenses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshed.data.success) {
          setExpenses(
            refreshed.data.expenses.map((e) => ({
              id: e.expense_id,
              name: e.expenses_details,
              amount: parseFloat(e.expenses_cost),
              date: toLocalDate(e.created_at),
              branch: e.municipality || "Unknown",
              addedBy: e.user_name || "N/A",
            }))
          );
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

  // Filter by date & branch
  const filterByDateAndBranch = (items) =>
    items.filter((item) => {
      const date = new Date(item.date);
      const iYear = date.getFullYear();
      const iMonth = String(date.getMonth() + 1).padStart(2, "0");
      const iDay = date.getDate();

      const branchMatch =
        userRole === "admin" ? branch === "All" || item.branch === branch : true;
      if (!branchMatch) return false;

      const today = new Date();
      if (timeFilter === "daily") {
        return iYear === today.getFullYear() && iMonth === String(today.getMonth() + 1).padStart(2, "0") && iDay === today.getDate();
      }

      if (timeFilter === "weekly") {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return date >= startOfWeek && date <= endOfWeek;
      }

      return iMonth === month && iYear.toString() === year;
    });

  const filteredTransactions = useMemo(() => filterByDateAndBranch(transactions), [transactions, month, year, timeFilter, branch]);
  const filteredExpenses = useMemo(() => filterByDateAndBranch(expenses), [expenses, month, year, timeFilter, branch]);
  const filteredDamagedProducts = useMemo(() => {
    return filterByDateAndBranch(
      damagedProducts.map((dp) => ({
        ...dp,
        date: dp.damaged_at ? new Date(dp.damaged_at) : new Date(),
        branch: dp.municipality || dp.branch || "Unknown",
        addedBy: dp.user_name || "N/A",
      }))
    );
  }, [damagedProducts, month, year, timeFilter, branch]);

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.totalPrice, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalNet = totalRevenue - (totalExpenses + damagedTotal);

  // Charts
  const productQuantityMap = filteredTransactions.reduce((acc, t) => {
    acc[t.productName] = (acc[t.productName] || 0) + t.quantity;
    return acc;
  }, {});
  const pieOptions = { labels: Object.keys(productQuantityMap), legend: { position: "bottom" }, tooltip: { y: { formatter: (val) => `${val} pcs` } } };
  const pieSeries = Object.values(productQuantityMap);

  const dateRevenueMap = filteredTransactions.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.totalPrice;
    return acc;
  }, {});
  const sortedDates = Object.keys(dateRevenueMap).sort((a, b) => new Date(a) - new Date(b));
  const lineOptions = { chart: { id: "sales-trend" }, xaxis: { categories: sortedDates }, stroke: { curve: "smooth" }, yaxis: { labels: { formatter: (val) => `₱${val.toFixed(2)}` } }, tooltip: { y: { formatter: (val) => `₱${val.toFixed(2)}` } } };
  const lineSeries = [{ name: "Total Sales", data: sortedDates.map((d) => dateRevenueMap[d]) }];

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
              className={`px-4 py-2 font-semibold ${activeTab === tab ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-600 hover:text-blue-500"}`}
            >
              {tab === "sales" ? "Sales Report" : "Expenses Report"}
            </button>
          ))}
        </div>

        <div className="text-lg font-semibold text-gray-800 flex gap-4">
          Revenue: <span className="text-green-600">₱{totalRevenue.toFixed(2)}</span> |{" "}
          Expenses: <span className="text-red-600">₱{(totalExpenses + damagedTotal).toFixed(2)}</span> |{" "}
          Net: <span className="text-blue-600">₱{totalNet.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters & Buttons */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex gap-4 items-center">
          {userRole === "admin" && (
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="border border-gray-300 rounded p-2">
              <option value="All">All Municipalities</option>
              {branches.map((b, idx) => <option key={idx} value={b}>{b}</option>)}
            </select>
          )}

          <select value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-300 rounded p-2">
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, "0");
              return <option key={m} value={m}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>;
            })}
          </select>

          <select value={year} onChange={(e) => setYear(e.target.value)} className="border border-gray-300 rounded p-2">
            {["2023", "2024", "2025", "2026"].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="border border-gray-300 rounded p-2">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex gap-4">
          {activeTab === "expenses" && userRole !== "admin" && (
            <button onClick={() => setShowExpenseModal(true)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow">
              <PlusCircle className="w-5 h-5" /> Add Expense
            </button>
          )}
          <button onClick={() => toast.info("Export logic not shown here")} className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow">
            <Download className="w-5 h-5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === "sales" ? (
        <div className="flex flex-1 gap-6 overflow-hidden">
          <div className="flex-1 border border-gray-300 rounded-lg overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500 py-20">No sales data available for this period.</div>
            ) : (
              <table className="w-full border-collapse text-center">
                <thead className="bg-gray-900 text-white sticky top-0 z-10">
                  <tr>
                    {userRole === "admin" && <th className="px-4 py-3 border-b border-gray-700">Municipality</th>}
                    <th className="px-4 py-3 border-b border-gray-700">Product</th>
                    <th className="px-4 py-3 border-b border-gray-700">Quantity</th>
                    <th className="px-4 py-3 border-b border-gray-700">Total Price</th>
                    <th className="px-4 py-3 border-b border-gray-700">Delivery Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredTransactions.map((t, idx) => (
                    <tr key={t.id} className={`border-t border-gray-300 ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-gray-100`}>
                      {userRole === "admin" && <td className="px-4 py-3">{t.branch}</td>}
                      <td className="px-4 py-3 font-semibold">{t.productName}</td>
                      <td className="px-4 py-3">{t.quantity}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">₱{t.totalPrice.toFixed(2)}</td>
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
          selectedBranch={branch}
          showExpenseModal={showExpenseModal}
          setShowExpenseModal={setShowExpenseModal}
          newExpense={newExpense}
          setNewExpense={setNewExpense}
          handleAddExpense={handleAddExpense}
          onDamagedTotalChange={(list, total) => setDamagedProducts(list) || setDamagedTotal(total)}
        />
      )}
    </div>
  );
}
