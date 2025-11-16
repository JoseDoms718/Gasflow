import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  PackageOpen,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import OrderInfoModal from "./OrderInfoModal";

const BASE_URL = "http://localhost:5000";
const SOCKET_URL = "http://localhost:5000";

// 🔹 Normalize image URLs
const normalizeImageUrl = (url) => {
  if (!url) return "/placeholder.png";
  return url.startsWith("http") ? url : `${BASE_URL}/${url.replace(/^\/+/, "")}`;
};

export default function Orderlist({ role: propRole }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = propRole || user?.role || "user";
  const isRetailer = role === "retailer";

  const defaultTab = isRetailer ? "current" : "cart";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 🔹 Get user cart from localStorage
  const getUserCart = useCallback(() => {
    const token = localStorage.getItem("token");
    const cartKey = token ? `cart_${token}` : "cart_guest";
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    return cart.map((item) => ({
      ...item,
      image_url: normalizeImageUrl(item.image_url),
    }));
  }, []);

  // 🔹 Fetch orders and merge local cart
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to view your orders.");
        setOrders([]);
        return;
      }

      const res = await axios.get(`${BASE_URL}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let backendOrders = [];
      if (res.data.success && res.data.orders.length) {
        backendOrders = res.data.orders.map((o) => ({
          ...o,
          items: o.items.map((i) => ({
            ...i,
            image_url: normalizeImageUrl(i.image_url),
          })),
        }));
      }

      // Include local cart only for non-retailers
      if (!isRetailer) {
        const localCart = getUserCart();
        if (localCart.length) {
          const pseudoOrder = {
            order_id: "local_cart",
            status: "cart",
            items: localCart,
            total_price: localCart.reduce((sum, i) => sum + i.price * i.quantity, 0),
          };
          backendOrders = [pseudoOrder, ...backendOrders];
        }
      }

      setOrders(backendOrders);
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      toast.error("Failed to load your orders.");
    } finally {
      setLoading(false);
    }
  }, [getUserCart, isRetailer]);

  // 🔹 Initial fetch + cart sync
  useEffect(() => {
    fetchOrders();
    const handleStorageChange = (e) => {
      if (e.key?.startsWith("cart_")) fetchOrders();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchOrders]);

  // 🔹 Setup Socket.IO for real-time updates
  // 🔹 Setup Socket.IO for real-time updates (clean + safe)
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("newOrder", (order) => {
      toast.success(`📦 New Order #${order.order_id} received!`);
      fetchOrders();   // reload from backend
    });

    socket.on("order-updated", (order) => {
      toast.success(`Order #${order.order_id} updated!`);
      fetchOrders();   // reload from backend
    });

    return () => socket.disconnect();
  }, [fetchOrders]);


  const toggleOrder = (id) => setExpandedOrder(expandedOrder === id ? null : id);

  // 🔹 Update local cart without reload
  const updateLocalCart = (updatedCart) => {
    const token = localStorage.getItem("token");
    const cartKey = token ? `cart_${token}` : "cart_guest";
    if (updatedCart.length) localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    else localStorage.removeItem(cartKey);

    setOrders((prev) => {
      const newOrders = [...prev];
      const cartIndex = newOrders.findIndex((o) => o.order_id === "local_cart");
      if (cartIndex !== -1) {
        if (updatedCart.length === 0) {
          // Remove local_cart entirely
          newOrders.splice(cartIndex, 1);
          // Collapse expanded order if it was local_cart
          setExpandedOrder((prevExpanded) =>
            prevExpanded === "local_cart" ? null : prevExpanded
          );
        } else {
          newOrders[cartIndex] = {
            order_id: "local_cart",
            status: "cart",
            items: updatedCart.map((item) => ({
              ...item,
              image_url: normalizeImageUrl(item.image_url),
            })),
            total_price: updatedCart.reduce((sum, i) => sum + i.price * i.quantity, 0),
          };
        }
      }
      return newOrders;
    });
  };

  // 🔹 Handle order/cart actions
  const handleOrderAction = async (order_id, newStatus) => {
    const token = localStorage.getItem("token");
    if (!token) return toast.error("Please log in first.");

    try {
      if (order_id === "local_cart") {
        if (newStatus === "pending") {
          setShowModal(true);
          return;
        }
        if (newStatus === "cancelled") {
          updateLocalCart([]);
          toast.success("🗑️ Cart cleared successfully!");
          return;
        }
      }

      // Backend orders
      const res = await axios.put(
        `${BASE_URL}/orders/update-status/${order_id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        fetchOrders();
        toast.success(
          newStatus === "cancelled" ? "❌ Order cancelled!" : "✅ Order updated!"
        );
      } else toast.error("Failed to update order status.");
    } catch (err) {
      console.error("❌ Error updating order:", err);
      toast.error("Error updating order status.");
    }
  };

  // 🔹 Confirm checkout modal
  const handleConfirmCheckout = async (info) => {
    try {
      const token = localStorage.getItem("token");
      const cartItems = getUserCart();
      const cartKey = token ? `cart_${token}` : "cart_guest";

      if (!cartItems.length) {
        toast.error("Your cart is empty.");
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/orders/buy`,
        {
          items: cartItems,
          full_name: info.full_name,
          contact_number: info.contact_number,
          barangay_id: info.barangay_id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        localStorage.removeItem(cartKey);
        toast.success("✅ Checkout successful!");
        setShowModal(false);
        fetchOrders();
      } else toast.error("Checkout failed.");
    } catch (err) {
      console.error("❌ Checkout error:", err);
      toast.error("Failed to checkout cart.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "cart") return order.status === "cart";
    if (activeTab === "current")
      return !["cart", "cancelled", "delivered"].includes(order.status);
    if (activeTab === "finished") return order.status === "delivered";
    return false;
  });

  if (loading)
    return (
      <section
        className={`${isRetailer
          ? "bg-white text-gray-900 py-6 mt-0 min-h-[80vh]"
          : "bg-gray-900 text-white py-12 mt-12 h-dvh"
          } flex items-center justify-center`}
      >
        <p>Loading your orders...</p>
      </section>
    );

  return (
    <section
      className={`${isRetailer
        ? "text-gray-900 bg-transparent py-6 mt-0 min-h-[80vh]"
        : "bg-gray-900 text-white py-12 mt-12 h-dvh"
        } flex flex-col`}
    >
      <div className="container mx-auto px-6">
        {!isRetailer && (
          <>
            <h2 className="text-3xl font-bold text-white mb-2">My Orders</h2>
            <p className="text-gray-300 mb-8">
              View and manage your cart, current, and finished orders.
            </p>
          </>
        )}

        {/* Tabs */}
        <div
          className={`flex flex-wrap items-center gap-3 ${isRetailer
            ? "justify-start mb-4 border-b border-gray-200 pb-2"
            : "justify-start mb-8"
            }`}
        >
          {[...(isRetailer
            ? []
            : [{ key: "cart", icon: ShoppingCart, label: "Cart" }]),
          { key: "current", icon: Clock, label: "Current Orders" },
          { key: "finished", icon: CheckCircle, label: "Finished Orders" },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${activeTab === tab.key
                  ? "bg-blue-600 text-white shadow"
                  : isRetailer
                    ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Orders List */}
        <div
          className={`${isRetailer ? "bg-white border border-gray-200" : "bg-gray-800"
            } rounded-lg shadow-md p-6 flex flex-col h-[60vh]`}
        >
          {filteredOrders.length ? (
            <div
              className={`space-y-4 overflow-y-auto pr-2 flex-1 ${isRetailer ? "text-gray-800" : "text-white"
                }`}
            >
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrder === order.order_id;
                const firstItem = order.items?.[0];

                return (
                  <div
                    key={order.order_id}
                    className={`rounded-lg overflow-hidden ${isRetailer ? "bg-gray-50 border border-gray-200" : "bg-gray-700"
                      }`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => toggleOrder(order.order_id)}
                      className={`w-full flex justify-between items-center p-4 text-left transition ${isRetailer ? "hover:bg-gray-100" : "hover:bg-gray-600"
                        }`}
                    >
                      <div>
                        <h3 className={`font-semibold ${isRetailer ? "text-gray-900" : "text-white"}`}>
                          {firstItem?.product_name || "Unnamed Product"}
                        </h3>
                        <p className={`text-sm ${isRetailer ? "text-gray-500" : "text-gray-300"}`}>
                          Status: {order.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`font-bold text-lg ${isRetailer ? "text-blue-700" : "text-blue-400"}`}>
                          ₱{order.total_price?.toLocaleString()}
                        </p>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className={`p-4 border-t space-y-3 ${isRetailer ? "border-gray-200 bg-gray-50" : "border-gray-600 bg-gray-800"}`}>
                        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                          {order.items.map((item, index) => (
                            <div key={index} className={`flex items-start gap-4 rounded-md p-3 ${isRetailer ? "bg-white border border-gray-200" : "bg-gray-700"}`}>
                              {item.image_url && (
                                <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden border border-gray-300">
                                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                </div>
                              )}

                              {/* Item Info */}
                              <div className="flex-1 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold text-sm md:text-base">{item.product_name}</h4>
                                    <p className="text-xs italic text-gray-400 mt-1">{item.product_description || "No description"}</p>
                                  </div>

                                  {order.order_id === "local_cart" && (
                                    <button
                                      onClick={() => {
                                        const cartKey = localStorage.getItem("token") ? `cart_${localStorage.getItem("token")}` : "cart_guest";
                                        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
                                        const updated = cart.filter((c) => c.product_id !== item.product_id);
                                        updateLocalCart(updated);
                                        toast.success(`🗑️ Removed ${item.product_name} from cart`);
                                      }}
                                      className="text-red-500 hover:text-red-700 transition p-1 rounded-full hover:bg-red-100"
                                      title="Remove item"
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>

                                {order.order_id === "local_cart" && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm">Qty:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newQty = Math.max(1, Number(e.target.value));
                                        const cartKey = localStorage.getItem("token") ? `cart_${localStorage.getItem("token")}` : "cart_guest";
                                        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
                                        const updated = cart.map((c) => c.product_id === item.product_id ? { ...c, quantity: newQty } : c);
                                        updateLocalCart(updated);
                                      }}
                                      className="w-16 px-2 py-1 rounded border border-gray-400 text-center text-sm bg-transparent"
                                    />
                                  </div>
                                )}

                                <div className="mt-2">
                                  <p className="font-medium text-sm md:text-base">₱{item.price?.toLocaleString()} each</p>
                                  <p className="text-xs text-gray-500">{isRetailer ? `Buyer: ${item.buyer_name || "Unknown"}` : `Seller: ${item.seller_name || "Unknown"}`}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        {order.order_id === "local_cart" && !isRetailer && (
                          <div className="flex justify-end gap-3 pt-3 border-t border-gray-600">
                            <button onClick={() => handleOrderAction(order.order_id, "pending")} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Checkout All</button>
                            <button onClick={() => handleOrderAction(order.order_id, "cancelled")} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm">Cancel All</button>
                          </div>
                        )}

                        {activeTab === "current" && order.status === "pending" && (
                          <div className="flex justify-end pt-3 border-t border-gray-600">
                            <button onClick={() => handleOrderAction(order.order_id, "cancelled")} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm">Cancel Order</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center flex-1 text-gray-500">
              <PackageOpen size={48} className="mb-4" />
              <h3 className="text-lg font-semibold">No Orders Found</h3>
              <p className="text-sm">Your {activeTab.replace("-", " ")} list is empty for now.</p>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showModal && (
        <OrderInfoModal onClose={() => setShowModal(false)} onConfirm={handleConfirmCheckout} user={user} />
      )}
    </section>
  );
}
