import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
export default function IncomingOrderSection() {
  const [activeTab, setActiveTab] = useState("pending");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState([]);
  const navigate = useNavigate();

  // ✅ Fetch retailer's incoming orders
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Please log in to view incoming orders.");

      const res = await axios.get("http://localhost:5000/orders/retailer-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setOrders(res.data.orders);
      } else {
        toast.error("Failed to fetch orders.");
      }
    } catch (err) {
      console.error("❌ Error fetching retailer orders:", err);
      toast.error("Error loading orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Filter orders by active status
  const filteredOrders = orders.filter((order) => order.status === activeTab);

  // ✅ Determine next status
  const getNextStatus = (current) => {
    switch (current) {
      case "pending":
        return "preparing";
      case "preparing":
        return "on_delivery";
      case "on_delivery":
        return "delivered";
      default:
        return null;
    }
  };

  // ✅ Update order status
  // ✅ Update order status with toast feedback
  const updateOrderStatus = async (order_id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Please log in first.");

      const actionText =
        newStatus === "cancelled"
          ? "Cancelling order..."
          : `Updating status to "${newStatus.replace("_", " ")}"...`;

      const loadingToast = toast.loading(actionText);

      const res = await axios.put(
        `http://localhost:5000/orders/retailer/update-status/${order_id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.dismiss(loadingToast);

      if (res.data.success) {
        if (newStatus === "cancelled") {
          toast.success("Order has been cancelled.");
        } else {
          toast.success(`Order marked as ${newStatus.replace("_", " ")}!`);
        }

        fetchOrders();
      } else {
        toast.error(res.data.error || "Failed to update order.");
      }
    } catch (err) {
      console.error("❌ Error updating order status:", err);
      toast.error("Failed to update order.");
    }
  };


  const toggleExpand = (order_id) => {
    setExpanded((prev) =>
      prev.includes(order_id)
        ? prev.filter((id) => id !== order_id)
        : [...prev, order_id]
    );
  };

  if (loading) {
    return (
      <div className="p-6 w-full h-[600px] flex items-center justify-center">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full flex flex-col min-h-[80vh]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
      </div>

      {/* Tabs & Walk-in Button Row */}
      <div className="flex justify-between items-center border-b mb-3 pb-1">
        <div className="flex space-x-2">
          {[
            { key: "pending", label: "Pending Orders" },
            { key: "preparing", label: "Preparing" },
            { key: "on_delivery", label: "On Delivery" },
            { key: "delivered", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setExpanded([]);
              }}
              className={`px-4 py-2 font-semibold transition border-b-2 ${activeTab === tab.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Walk-in Order button */}
        <button
          onClick={() => navigate("/walkinorder")}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 shadow-md"
        >
          <ShoppingCart size={20} /> Walk-in Order
        </button>
      </div>

      {/* 🧾 Orders Container */}
      <div className="rounded-xl p-4 overflow-y-auto shadow-inner bg-gray-100 border border-gray-300 h-[560px]">
        {filteredOrders.length === 0 ? (
          <p className="text-center py-10 text-gray-600 italic">
            No orders available for "{activeTab === "delivered" ? "completed" : activeTab}".
          </p>
        ) : (
          filteredOrders.map((order) => {
            const isOpen = expanded.includes(order.order_id);
            const nextStatus = getNextStatus(order.status);
            const firstProduct =
              order.items && order.items.length > 0
                ? order.items[0].product_name
                : "Order";

            return (
              <div
                key={order.order_id}
                className={`rounded-xl overflow-hidden mb-4 border border-gray-300 bg-white transition-all duration-200 ${isOpen ? "shadow-2xl" : "shadow-md hover:shadow-xl"
                  }`}
              >
                {/* Collapsible Header */}
                <div
                  onClick={() => toggleExpand(order.order_id)}
                  className={`flex justify-between items-center px-5 py-3 cursor-pointer transition-colors ${isOpen ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
                    }`}
                >
                  <div>
                    <p className="font-bold text-gray-900 text-lg leading-tight truncate">
                      {firstProduct}
                    </p>
                    <p className="text-sm text-gray-700 font-semibold">
                      Buyer:{" "}
                      <span className="text-gray-900 font-bold">
                        {order.buyer_name || "—"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-blue-600 font-extrabold text-lg">
                      ₱{order.total_price?.toLocaleString() || 0}
                    </p>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="p-5 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Product Section */}
                      <div className="flex flex-col items-center border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center mb-2">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="w-24 h-24 object-cover rounded mb-2 shadow"
                              />
                            )}
                            <p className="font-semibold text-gray-900 text-center">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-700">
                              Qty: {item.quantity} × ₱
                              {item.price.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Info Section */}
                      <div className="text-sm text-gray-800 space-y-2">
                        <p>
                          <span className="font-semibold">Address:</span>{" "}
                          {order.barangay}, {order.municipality}
                        </p>
                        <p>
                          <span className="font-semibold">Email:</span>{" "}
                          {order.buyer_email || "—"}
                        </p>
                        <p>
                          <span className="font-semibold">Contact:</span>{" "}
                          {order.contact_number || "—"}
                        </p>
                        <p>
                          <span className="font-semibold">Ordered At:</span>{" "}
                          {order.ordered_at
                            ? new Date(order.ordered_at).toLocaleString()
                            : "—"}
                        </p>
                        {order.status === "delivered" && order.delivered_at && (
                          <p>
                            <span className="font-semibold">Delivered At:</span>{" "}
                            {new Date(order.delivered_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ⚙️ Action Buttons */}
                    <div className="flex flex-wrap gap-2 justify-end mt-4">
                      {nextStatus && (
                        <button
                          onClick={() => updateOrderStatus(order.order_id, nextStatus)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-md transition"
                        >
                          Mark as {nextStatus.replace("_", " ")}
                        </button>
                      )}
                      {order.status !== "delivered" && (
                        <button
                          onClick={() => updateOrderStatus(order.order_id, "cancelled")}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 shadow-md transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
