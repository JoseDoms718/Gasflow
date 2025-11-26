import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const API_BASE = BASE_URL;
const SOCKET_URL = BASE_URL;

export default function IncomingOrderSection() {
  const [activeTab, setActiveTab] = useState("pending");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState([]);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const statusLabels = {
    pending: "Pending",
    preparing: "Preparing",
    on_delivery: "On Delivery",
    delivered: "Delivered",
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not logged in");

      const res = await axios.get(`${API_BASE}/orders/retailer-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success && Array.isArray(res.data.orders)) {
        setOrders(res.data.orders);
      } else {
        toast.error("Failed to fetch orders.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error fetching orders.");
    } finally {
      setLoading(false);
    }
  };

  const mergeOrders = (existing, updated) => ({
    ...existing,
    ...updated,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    socketRef.current = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });

    socketRef.current.on("order-updated", (updatedOrder) => {
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.order_id === updatedOrder.order_id);
        if (idx >= 0) {
          const merged = mergeOrders(prev[idx], updatedOrder);
          const copy = [...prev];
          copy[idx] = merged;
          return copy;
        }
        return [updatedOrder, ...prev];
      });
    });

    socketRef.current.on("newOrder", (order) => {
      toast.success(`New Order #${order.order_id} received!`);
      fetchOrders();
    });

    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const getNextStatus = (current) =>
  ({
    pending: "preparing",
    preparing: "on_delivery",
    on_delivery: "delivered",
  }[current] || null);

  const updateOrderStatus = async (order_id, newStatus) => {
    const token = localStorage.getItem("token");
    if (!token) return toast.error("Please log in first.");

    const loadingToast = toast.loading(
      newStatus === "cancelled"
        ? "Cancelling order..."
        : `Updating to ${statusLabels[newStatus]}...`
    );

    const snapshot = [...orders];
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id ? { ...o, status: newStatus } : o
      )
    );

    try {
      const res = await axios.put(
        `${API_BASE}/orders/retailer/update-status/${order_id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.dismiss(loadingToast);

      if (!res.data?.success) {
        setOrders(snapshot);
        toast.error(res.data?.error || "Failed to update order");
        return;
      }

      toast.success(
        newStatus === "cancelled"
          ? "Order cancelled and stock restored!"
          : "Order updated"
      );
    } catch (err) {
      console.error(err);
      setOrders(snapshot);
      toast.dismiss(loadingToast);
      toast.error(
        newStatus === "cancelled"
          ? "Failed to cancel order"
          : "Failed to update order"
      );
    }
  };

  const toggleExpand = (order_id) =>
    setExpanded((prev) =>
      prev.includes(order_id)
        ? prev.filter((x) => x !== order_id)
        : [...prev, order_id]
    );

  const filteredOrders = orders.filter((o) => o.status === activeTab);

  if (loading)
    return (
      <div className="p-6 w-full h-[600px] flex items-center justify-center">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );

  return (
    <div className="p-6 w-full flex flex-col min-h-[80vh]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center border-b mb-3 pb-1">
        <div className="flex space-x-2">
          {["pending", "preparing", "on_delivery", "delivered"].map((k) => (
            <button
              key={k}
              onClick={() => {
                setActiveTab(k);
                setExpanded([]);
              }}
              className={`px-4 py-2 font-semibold border-b-2 transition ${activeTab === k
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              {statusLabels[k]}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate("/walkinorder")}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 shadow-md"
        >
          <ShoppingCart size={20} /> Walk-in Order
        </button>
      </div>

      {/* ORDER LIST */}
      <div className="rounded-xl p-4 overflow-y-auto shadow-inner bg-gray-100 border border-gray-300 h-[560px]">
        {filteredOrders.length === 0 ? (
          <p className="text-center py-10 text-gray-600 italic">
            No "{statusLabels[activeTab]}" orders.
          </p>
        ) : (
          filteredOrders.map((order) => {
            const open = expanded.includes(order.order_id);
            const nextStatus = getNextStatus(order.status);

            return (
              <div
                key={order.order_id}
                className={`rounded-xl overflow-hidden mb-4 border bg-white ${open ? "shadow-2xl" : "shadow-md hover:shadow-xl"
                  }`}
              >
                {/* COLLAPSE HEADER */}
                <div
                  onClick={() => toggleExpand(order.order_id)}
                  className={`flex justify-between items-center px-5 py-3 cursor-pointer ${open ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
                    }`}
                >
                  <div>
                    <p className="font-bold text-gray-900">
                      {order.items?.[0]?.product_name || "Order"}
                    </p>
                    <p className="text-sm text-gray-700">
                      Buyer: <span className="font-bold">{order.buyer_name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-blue-600 font-extrabold">
                      ₱{order.total_price?.toLocaleString()}
                    </p>
                    {open ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>

                {/* EXPANDED CONTENT */}
                {open && (
                  <div className="p-5 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* LEFT SIDE — FIXED LAYOUT */}
                      <div className="w-full h-[350px] overflow-y-auto rounded-xl bg-white shadow-md p-4 scroll-smooth snap-y snap-mandatory space-y-4">
                        {order.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-4 p-4 snap-start min-h-[150px] bg-gray-50 rounded-lg shadow-sm"
                          >
                            {/* PRODUCT IMAGE */}
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                            />

                            {/* TEXT INFO */}
                            <div className="flex flex-col justify-between">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {item.product_name}
                              </h3>
                              <p className="text-sm text-gray-700 mt-1">
                                Qty: <span className="font-bold">{item.quantity}</span> × ₱
                                {item.price.toLocaleString()}
                              </p>
                              <p className="text-blue-600 font-semibold mt-1">
                                Subtotal: ₱{(item.quantity * item.price).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* RIGHT SIDE — ORDER DETAILS */}
                      <div className="bg-white rounded-xl shadow-md border p-6 text-sm text-gray-800 space-y-4">
                        <div>
                          <p className="font-semibold text-gray-900">Delivery Address</p>
                          <p className="text-gray-700">{order.barangay}, {order.municipality}</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">Email</p>
                          <p className="text-gray-700">{order.buyer_email}</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">Contact Number</p>
                          <p className="text-gray-700">{order.contact_number}</p>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">Ordered At</p>
                          <p className="text-gray-700">
                            {order.ordered_at ? new Date(order.ordered_at).toLocaleString() : "—"}
                          </p>
                        </div>

                        <hr className="border-gray-300" />

                        <div>
                          <p className="font-semibold text-gray-900">Total Amount</p>
                          <p className="text-xl font-bold text-blue-700">
                            ₱{order.total_price?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex justify-end gap-2 mt-5">
                      {nextStatus && (
                        <button
                          onClick={() => updateOrderStatus(order.order_id, nextStatus)}
                          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-sm transition"
                        >
                          Mark as {statusLabels[nextStatus]}
                        </button>
                      )}

                      {order.status !== "delivered" && (
                        <button
                          onClick={() => updateOrderStatus(order.order_id, "cancelled")}
                          className="px-5 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 shadow-sm transition"
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