import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";
const API_BASE = "http://localhost:5000";

// helper to ensure proper absolute path
const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}/${url.replace(/^\/+/, "")}`;
};

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

  // build cachedImage for each item when fetching
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to view incoming orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE}/orders/retailer-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success && Array.isArray(res.data.orders)) {
        const mapped = res.data.orders.map((o) => ({
          ...o,
          items: (o.items || []).map((it, idx) => ({
            ...it,
            // cachedImage includes timestamp so first load is fresh
            cachedImage: it.image_url ? `${normalizeImageUrl(it.image_url)}?v=${Date.now()}-${idx}` : null,
            image_url: it.image_url ? normalizeImageUrl(it.image_url) : null,
          })),
        }));

        setOrders(mapped);
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

  // merges existing order and updatedOrder; preserves cachedImage unless server image_url changed
  const mergeOrders = (existing, updated) => {
    const merged = { ...existing, ...updated };
    // merge items by product_id (or index fallback)
    const existingItems = existing.items || [];
    const updatedItems = updated.items || [];

    const itemsMap = existingItems.reduce((acc, it) => {
      const key = it.product_id ?? `${it.product_name}-${Math.random()}`;
      acc[key] = { ...it };
      return acc;
    }, {});

    updatedItems.forEach((it, idx) => {
      const key = it.product_id ?? `${it.product_name}-${idx}`;
      const normalizedUrl = it.image_url ? normalizeImageUrl(it.image_url) : null;
      if (itemsMap[key]) {
        // if server sent a new image_url and it differs, update cachedImage with new timestamp to force reload
        if (normalizedUrl && normalizedUrl !== itemsMap[key].image_url) {
          itemsMap[key] = {
            ...itemsMap[key],
            ...it,
            image_url: normalizedUrl,
            cachedImage: `${normalizedUrl}?v=${Date.now()}`, // force reload
          };
        } else {
          // preserve cachedImage if present, otherwise set normalized url + timestamp
          itemsMap[key] = {
            ...itemsMap[key],
            ...it,
            image_url: itemsMap[key].image_url || normalizedUrl,
            cachedImage: itemsMap[key].cachedImage || (normalizedUrl ? `${normalizedUrl}?v=${Date.now()}` : null),
          };
        }
      } else {
        // new item — set cachedImage
        itemsMap[key] = {
          ...it,
          image_url: normalizedUrl,
          cachedImage: normalizedUrl ? `${normalizedUrl}?v=${Date.now()}` : null,
        };
      }
    });

    merged.items = Object.values(itemsMap);
    return merged;
  };

  useEffect(() => {
    fetchOrders();

    const token = localStorage.getItem("token");
    socketRef.current = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });

    socketRef.current.on("connect", () => console.log("Socket connected", socketRef.current.id));
    socketRef.current.on("connect_error", (err) => console.warn("Socket connect_error", err?.message || err));

    socketRef.current.on("order-updated", (updatedOrder) => {
      console.info("socket order-updated:", updatedOrder); // <-- check in console what the server sends
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.order_id === updatedOrder.order_id);
        if (idx >= 0) {
          const existing = prev[idx];
          const merged = mergeOrders(existing, updatedOrder);
          const copy = [...prev];
          copy[idx] = merged;
          return copy;
        }
        // new order: ensure items have cachedImage
        const prepared = {
          ...updatedOrder,
          items: (updatedOrder.items || []).map((it, i) => ({
            ...it,
            image_url: it.image_url ? normalizeImageUrl(it.image_url) : null,
            cachedImage: it.image_url ? `${normalizeImageUrl(it.image_url)}?v=${Date.now()}-${i}` : null,
          })),
        };
        return [prepared, ...prev];
      });
    });

    // you may also listen to "newOrder" event if backend emits that:
    socketRef.current.on("newOrder", (order) => {
      console.info("socket newOrder:", order);
      toast.success(`New Order #${order.order_id} received!`);

      fetchOrders();
    });


    return () => {
      socketRef.current?.off("order-updated");
      socketRef.current?.off("newOrder");
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getNextStatus = (current) => {
    switch (current) {
      case "pending": return "preparing";
      case "preparing": return "on_delivery";
      case "on_delivery": return "delivered";
      default: return null;
    }
  };

  const updateOrderStatus = async (order_id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Please log in first.");

      const loadingToast = toast.loading(newStatus === "cancelled" ? "Cancelling..." : `Updating to ${statusLabels[newStatus]}...`);
      const snapshot = [...orders];
      setOrders((prev) => prev.map((o) => (o.order_id === order_id ? { ...o, status: newStatus } : o)));

      const res = await axios.put(`${API_BASE}/orders/retailer/update-status/${order_id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.dismiss(loadingToast);
      if (!res.data?.success) {
        setOrders(snapshot); // revert
        toast.error(res.data?.error || "Failed to update order");
        return;
      }
      toast.success("Order updated");
      // backend will emit socket event — merge handler will run
    } catch (err) {
      console.error("updateOrderStatus error", err);
      toast.error("Failed to update order");
    }
  };

  const toggleExpand = (order_id) => {
    setExpanded((prev) => (prev.includes(order_id) ? prev.filter((x) => x !== order_id) : [...prev, order_id]));
  };

  const filteredOrders = orders.filter((o) => o.status === activeTab);

  if (loading) return <div className="p-6 w-full h-[600px] flex items-center justify-center"><p className="text-gray-500">Loading orders...</p></div>;

  return (
    <div className="p-6 w-full flex flex-col min-h-[80vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
      </div>

      <div className="flex justify-between items-center border-b mb-3 pb-1">
        <div className="flex space-x-2">
          {["pending", "preparing", "on_delivery", "delivered"].map((k) => (
            <button key={k} onClick={() => { setActiveTab(k); setExpanded([]); }}
              className={`px-4 py-2 font-semibold transition border-b-2 ${activeTab === k ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              {statusLabels[k]}
            </button>
          ))}
        </div>
        <button onClick={() => navigate("/walkinorder")} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 shadow-md">
          <ShoppingCart size={20} /> Walk-in Order
        </button>
      </div>

      <div className="rounded-xl p-4 overflow-y-auto shadow-inner bg-gray-100 border border-gray-300 h-[560px]">
        {filteredOrders.length === 0 ? (
          <p className="text-center py-10 text-gray-600 italic">No "{statusLabels[activeTab]}" orders.</p>
        ) : (
          filteredOrders.map((order) => {
            const open = expanded.includes(order.order_id);
            const nextStatus = getNextStatus(order.status);
            const first = order.items?.[0]?.product_name || "Order";

            return (
              <div key={order.order_id} className={`rounded-xl overflow-hidden mb-4 border border-gray-300 bg-white ${open ? "shadow-2xl" : "shadow-md hover:shadow-xl"}`}>
                <div onClick={() => toggleExpand(order.order_id)} className={`flex justify-between items-center px-5 py-3 cursor-pointer ${open ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"}`}>
                  <div>
                    <p className="font-bold text-gray-900">{first}</p>
                    <p className="text-sm text-gray-700">Buyer: <span className="font-bold">{order.buyer_name}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-blue-600 font-extrabold">₱{order.total_price?.toLocaleString()}</p>
                    {open ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>

                {open && (
                  <div className="p-5 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col items-center border rounded-lg p-3 bg-white shadow-sm">
                        {order.items?.map((it, idx) => (
                          <div key={`${order.order_id}-${it.product_id ?? idx}`} className="flex flex-col items-center mb-2">
                            {it.cachedImage ? (
                              <img src={it.cachedImage} className="w-24 h-24 object-cover rounded mb-2 shadow" alt={it.product_name} />
                            ) : it.image_url ? (
                              <img src={it.image_url} className="w-24 h-24 object-cover rounded mb-2 shadow" alt={it.product_name} />
                            ) : null}
                            <p className="font-semibold text-center">{it.product_name}</p>
                            <p className="text-sm text-gray-700">Qty: {it.quantity} × ₱{Number(it.price).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>

                      <div className="text-sm text-gray-800 space-y-2">
                        <p><span className="font-semibold">Address:</span> {order.barangay}, {order.municipality}</p>
                        <p><span className="font-semibold">Email:</span> {order.buyer_email}</p>
                        <p><span className="font-semibold">Contact:</span> {order.contact_number}</p>
                        <p><span className="font-semibold">Ordered At:</span> {order.ordered_at ? new Date(order.ordered_at).toLocaleString() : "—"}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      {nextStatus && <button onClick={() => updateOrderStatus(order.order_id, nextStatus)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Mark as {statusLabels[nextStatus]}</button>}
                      {order.status !== "delivered" && <button onClick={() => updateOrderStatus(order.order_id, "cancelled")} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Cancel</button>}
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
