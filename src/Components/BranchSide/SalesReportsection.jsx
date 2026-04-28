import React, { useState, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import { PlusCircle, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

  // Fetch data
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchData = async () => {
      try {
        const { data: me } = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserRole(me.user.role);
        setUserMunicipality(me.user.municipality);

        // Expenses
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

        // Transactions
        const { data: transactionsRes } = await axios.get(`${BASE_URL}/orders/my-sold`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (transactionsRes.success) {
          setTransactions(
            transactionsRes.orders.flatMap((order) => {
              if (!order.delivered_at) return []; // Skip undelivered orders
              return order.items.map((item, index) => {
                const itemQuantity = Number(item.quantity) || 0;
                const deliveryFee = Number(order.delivery_fee || 0);
                const deliveryFeePerItem = deliveryFee / order.items.length;

                return {
                  id: `${order.order_id}-${item.type === "bundle" ? item.branch_bundle_id : item.product_id}-${index}`,
                  type: item.type,
                  product_id: item.product_id || null,
                  productName: item.product_name || "",
                  bundle_name: item.bundle_name || "",
                  bundle_image: item.bundle_image || "",
                  image_url: item.image_url || "",
                  quantity: itemQuantity,
                  price: Number(item.price) || 0,
                  branch_price_at_sale: Number(item.branch_price_at_sale) || 0,
                  sold_discounted_price: Number(item.sold_discounted_price) || 0,
                  deliveryFee: deliveryFeePerItem,
                  totalPrice: itemQuantity * (Number(item.price) || 0) + deliveryFeePerItem,
                  date: toLocalDate(order.delivered_at),
                  branch: order.municipality || "Unknown",
                  addedBy: item.seller_name || "N/A",
                  buyer: order.full_name || "N/A",
                };
              });
            })
          );
        }

        // Damaged products
        const { data: damagedRes } = await axios.get(`${BASE_URL}/damaged-products/my-damaged-products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const damagedList = damagedRes.success ? damagedRes.data : [];
        setDamagedProducts(damagedList);

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

  const handleExportPDF = async () => {
    const salesTransactions = filteredTransactions.filter(t => t.type !== "loan");
    const loanTransactions = filteredTransactions.filter(t => t.type === "loan");
    try {
      const doc = new jsPDF();

      const timestamp = new Date().toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      });

      const safeNum = (val) => Number(val || 0);

      // HEADER
      doc.setFontSize(16);
      doc.text("Sales Report", 14, 15);

      doc.setFontSize(11);
      const salesRevenue = salesTransactions.reduce((sum, t) => {
        const qty = safeNum(t.quantity);
        const price = safeNum(t.price);
        const delivery = safeNum(t.deliveryFee);
        return sum + (price * qty) + delivery;
      }, 0);

      const loanExpense = loanTransactions.reduce((sum, t) => {
        const qty = safeNum(t.quantity);
        const price = safeNum(t.price);
        const delivery = safeNum(t.deliveryFee);
        return sum + (price * qty) + delivery;
      }, 0);
      doc.text(`Revenue: PHP ${salesRevenue.toFixed(2)}`, 14, 24);
      doc.text(`Loan Expense: PHP ${loanExpense.toFixed(2)}`, 14, 30);
      doc.text(`Expenses: PHP ${(safeNum(totalExpenses) + safeNum(damagedTotal)).toFixed(2)}`, 14, 36);
      doc.text(
        `Net: PHP ${(salesRevenue - totalExpenses - loanExpense).toFixed(2)}`,
        14,
        42
      );

      // TABLE DATA
      const tableData = filteredTransactions.map((t) => {
        const qty = safeNum(t.quantity);
        const price = safeNum(t.price);
        const delivery = safeNum(t.deliveryFee);
        const branchPrice = safeNum(t.branch_price_at_sale);
        const soldPrice = safeNum(t.sold_discounted_price || t.price);

        const base = price * qty + delivery;

        const loss =
          t.type === "loan"
            ? 0
            : (branchPrice - soldPrice) * qty;

        const totalPrice =
          t.type === "loan"
            ? -base
            : base - loss;

        return [
          t.branch || "N/A",
          t.type || "N/A",
          t.type === "bundle" ? t.bundle_name : t.productName,
          qty,
          `PHP ${price.toFixed(2)}`,
          `PHP ${delivery.toFixed(2)}`,
          `PHP ${loss.toFixed(2)}`,
          `PHP ${totalPrice.toFixed(2)}`,
          t.date || "N/A",
        ];
      });

      autoTable(doc, {
        startY: 50,
        head: [
          [
            "Municipality",
            "Type",
            "Product",
            "Qty",
            "Price",
            "Delivery",
            "Loss",
            "Total",
            "Date",
          ],
        ],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
      });

      doc.save(`Sales_Report_${year}_${month}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to export PDF");
    }
  };
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

  // Filter
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

  const totalRevenue = filteredTransactions.reduce((sum, t) => {
    if (t.type === "loan") return sum; // ❌ exclude loans

    const qty = t.quantity || 0;
    const price = t.price || 0;
    const delivery = t.deliveryFee || 0;

    return sum + price * qty + delivery;
  }, 0);

  const loanTotal = filteredTransactions
    .filter(t => t.type === "loan")
    .reduce((sum, t) => {
      const qty = t.quantity || 0;
      const price = t.price || 0;
      const delivery = t.deliveryFee || 0;
      return sum + price * qty + delivery;
    }, 0);

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  // Total loss from cost - sold
  const totalLoss = filteredTransactions.reduce((sum, t) => {
    const quantity = t.quantity || 0;
    const costPrice = t.branch_price_at_sale || 0;
    const sellingPrice = t.sold_discounted_price || t.price || 0;
    return sum + quantity * (costPrice - sellingPrice);
  }, 0);

  const totalNet = totalRevenue - totalExpenses - loanTotal;

  // Charts
  const productQuantityMap = filteredTransactions.reduce((acc, t) => {
    const name = t.type === "bundle" ? t.bundle_name : t.productName;
    acc[name] = (acc[name] || 0) + t.quantity;
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
    <div className="p-6 w-full h-screen flex flex-col min-h-0">
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
          Expenses: <span className="text-red-600">
            ₱{(totalExpenses + loanTotal + damagedTotal).toFixed(2)}
          </span>
          Net: <span className="text-blue-600">
            ₱{totalNet.toFixed(2)}
          </span>
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
          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
          >
            <Download className="w-5 h-5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === "sales" ? (
        <div className="flex flex-col h-[calc(100vh-120px)] gap-4 min-h-0">

          {/* TABLE SECTION */}
          <div className="flex-1 min-h-0 border border-gray-300 rounded-lg overflow-hidden flex flex-col">

            {filteredTransactions.length === 0 ? (
              <div className="flex-1 flex justify-center items-center text-gray-500">
                No sales data available for this period.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">

                <table className="w-full border-collapse text-center">

                  <thead className="bg-gray-900 text-white sticky top-0 z-10">
                    <tr>
                      {userRole === "admin" && (
                        <th className="px-4 py-3 border-b border-gray-700">Municipality</th>
                      )}
                      <th className="px-4 py-3 border-b border-gray-700">Product</th>
                      <th className="px-4 py-3 border-b border-gray-700">Type</th>
                      <th className="px-4 py-3 border-b border-gray-700">Quantity</th>
                      <th className="px-4 py-3 border-b border-gray-700">Price</th>
                      <th className="px-4 py-3 border-b border-gray-700">Delivery Fee</th>
                      <th className="px-4 py-3 border-b border-gray-700">Loss</th>
                      <th className="px-4 py-3 border-b border-gray-700">Total Price</th>
                      <th className="px-4 py-3 border-b border-gray-700">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map((t, idx) => {
                      const qty = t.quantity || 0;
                      const price = t.price || 0;
                      const delivery = t.deliveryFee || 0;

                      const loss =
                        t.type === "loan"
                          ? 0
                          : ((t.branch_price_at_sale || 0) -
                            (t.sold_discounted_price || t.price || 0)) * qty;

                      const totalPrice = (price * qty) + delivery - loss;
                      return (
                        <tr
                          key={t.id}
                          className={`border-t border-gray-300 ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                            } hover:bg-gray-100`}
                        >
                          {userRole === "admin" && (
                            <td className="px-4 py-3">{t.branch}</td>
                          )}

                          <td className="px-4 py-3 flex items-center gap-2">
                            <img
                              src={t.type === "bundle" ? t.bundle_image : t.image_url}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <span className="font-semibold">
                              {t.type === "bundle" ? t.bundle_name : t.productName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${t.type === "loan"
                                ? "bg-red-100 text-red-600"
                                : t.type === "bundle"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-green-100 text-green-700"
                                }`}
                            >
                              {t.type === "loan"
                                ? "Loan"
                                : t.type === "bundle"
                                  ? "Bundle"
                                  : "Regular"}
                            </span>
                          </td>

                          <td className="px-4 py-3">{t.quantity}</td>
                          <td className="px-4 py-3 text-green-600">₱{t.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-purple-600">₱{t.deliveryFee.toFixed(2)}</td>
                          <td className="px-4 py-3 text-red-600">
                            ₱{loss.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-blue-600">₱{totalPrice.toFixed(2)}</td>
                          <td className="px-4 py-3">{t.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            )}
          </div>

          {/* CHARTS SECTION (ALWAYS VISIBLE) */}
          <div className="h-[320px] flex gap-4 flex-shrink-0">

            <div className="flex-1 bg-white border border-gray-300 rounded-lg p-3">
              <Chart options={pieOptions} series={pieSeries} type="pie" height={300} />
            </div>

            <div className="flex-1 bg-white border border-gray-300 rounded-lg p-3">
              <Chart options={lineOptions} series={lineSeries} type="line" height={300} />
            </div>

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
