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

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = BASE_URL;

const normalizeImageUrl = (url) =>
  url ? (url.startsWith("http") ? url : `${BASE_URL}/${url.replace(/^\/+/, "")}`) : "/placeholder.png";

export default function Orderlist({ role: propRole }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = propRole || user?.role || "user";
  const isRetailer = role === "retailer";

  const [activeTab, setActiveTab] = useState("cart");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);

  const getUserCart = useCallback(() => {
    const token = localStorage.getItem("token");
    const cartKey = token ? `cart_${token}` : "cart_guest";
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    return cart.map((item) => ({ ...item, image_url: normalizeImageUrl(item.image_url) }));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let backendOrders = [];

      if (token) {
        try {
          const res = await axios.get(`${BASE_URL}/orders/my-orders`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data.success && Array.isArray(res.data.orders)) {
            backendOrders = res.data.orders.map((o) => ({
              ...o,
              items: o.items.map((i) => ({ ...i, image_url: normalizeImageUrl(i.image_url) })),
            }));
          }
        } catch (err) {
          console.error("❌ Error fetching backend orders:", err);
          toast.error("Failed to load your orders from server.");
        }
      }

      const localCart = getUserCart();
      if (localCart.length) {
        const existingIndex = backendOrders.findIndex((o) => o.order_id === "local_cart");
        const localCartOrder = {
          order_id: "local_cart",
          status: "cart",
          items: localCart,
          total_price: localCart.reduce(
            (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
            0
          ),
          delivery_fee: 0, // default for local cart
        };
        if (existingIndex === -1) {
          backendOrders.unshift(localCartOrder);
        } else {
          backendOrders[existingIndex] = localCartOrder;
        }
      }

      setOrders(backendOrders);
    } catch (err) {
      console.error("❌ Error in fetchOrders:", err);
      toast.error("Failed to load your orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [getUserCart]);

  useEffect(() => {
    fetchOrders();
    const handleStorageChange = (e) => e.key?.startsWith("cart_") && fetchOrders();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchOrders]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("newOrder", (order) => {
      toast.success(`📦 New Order #${order.order_id} received!`);
      fetchOrders();
    });
    socket.on("order-updated", (order) => {
      toast.success(`Order #${order.order_id} updated!`);
      fetchOrders();
    });
    return () => socket.disconnect();
  }, [fetchOrders]);

  const toggleOrder = (id) => setExpandedOrder((prev) => (prev === id ? null : id));

  const updateLocalCart = (updatedCart) => {
    const token = localStorage.getItem("token");
    const cartKey = token ? `cart_${token}` : "cart_guest";

    if (updatedCart.length) localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    else localStorage.removeItem(cartKey);

    setOrders((prev) => {
      const newOrders = [...prev];
      const index = newOrders.findIndex((o) => o.order_id === "local_cart");
      const localCartOrder = {
        order_id: "local_cart",
        status: "cart",
        items: updatedCart.map((i) => ({ ...i, image_url: normalizeImageUrl(i.image_url) })),
        total_price: updatedCart.reduce(
          (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
          0
        ),
        delivery_fee: 0,
      };

      if (index === -1 && updatedCart.length) {
        newOrders.unshift(localCartOrder);
      } else if (index !== -1) {
        if (updatedCart.length === 0) {
          newOrders.splice(index, 1);
          setExpandedOrder((prevExp) => (prevExp === "local_cart" ? null : prevExp));
        } else {
          newOrders[index] = localCartOrder;
        }
      }
      return newOrders;
    });
  };

  const handleOrderAction = async (order_id, newStatus, singleItem = null) => {
    const token = localStorage.getItem("token");

    if (order_id === "local_cart") {
      const currentCart = getUserCart();
      let itemsToCheckout = singleItem ? [singleItem] : currentCart;

      if (!itemsToCheckout.length) return toast.error("Your cart is empty.");

      if (newStatus === "pending") {
        setCheckoutItem(singleItem || null);
        setShowModal(true);
        return;
      }

      if (newStatus === "cancelled") {
        if (singleItem) {
          const newCart = currentCart.filter((c) => c.product_id !== singleItem.product_id);
          updateLocalCart(newCart);
        } else {
          updateLocalCart([]);
        }
        return toast.success(singleItem ? "🗑️ Item removed!" : "🗑️ Cart cleared!");
      }
    }

    if (!token) return toast.error("Please log in first.");

    try {
      const res = await axios.put(
        `${BASE_URL}/orders/update-status/${order_id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success(newStatus === "cancelled" ? "❌ Order cancelled!" : "✅ Order updated!");
        fetchOrders();
      } else {
        toast.error(res.data.message || "Failed to update order status.");
      }
    } catch (err) {
      console.error("❌ Error updating order:", err);
      toast.error("Error updating order status.");
    }
  };

  const handleConfirmCheckout = async (info) => {
    const token = localStorage.getItem("token");
    const cartItems = checkoutItem ? [checkoutItem] : getUserCart();

    if (!cartItems.length) return toast.error("Your cart is empty.");

    for (let item of cartItems) {
      if (item.stock != null && item.quantity > item.stock) {
        return toast.error(
          `Cannot checkout: Only ${item.stock} item${item.stock > 1 ? "s" : ""} available for ${item.product_name}.`
        );
      }
    }

    if (!token) {
      toast.error("Please log in to complete checkout.");
      return;
    }

    try {
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
        const currentCart = getUserCart();
        const remainingCart = currentCart.filter(
          (c) => !cartItems.some((ci) => ci.product_id === c.product_id)
        );
        updateLocalCart(remainingCart);

        toast.success("✅ Checkout successful!");
        setShowModal(false);
        setCheckoutItem(null);
        fetchOrders();
      } else {
        toast.error(res.data.message || "Checkout failed.");
      }
    } catch (err) {
      console.error("❌ Checkout error:", err);
      toast.error("Failed to checkout cart.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "cart") return order.status === "cart";
    if (activeTab === "current") return !["cart", "cancelled", "delivered"].includes(order.status);
    if (activeTab === "finished") return order.status === "delivered";
    return false;
  });

  if (loading) {
    return (
      <section
        className={`${isRetailer ? "bg-white text-gray-900 py-6 mt-0 min-h-[80vh]" : "bg-gray-900 text-white py-12 mt-12 h-dvh"
          } flex items-center justify-center`}
      >
        <p>Loading your orders...</p>
      </section>
    );
  }

  const tabs = [
    { key: "cart", icon: ShoppingCart, label: "Cart" },
    { key: "current", icon: Clock, label: "Current" },
    { key: "finished", icon: CheckCircle, label: "Finished" },
  ];

  return (
    <section
      className={`${isRetailer ? "text-gray-900 bg-transparent py-6 mt-0 min-h-[80vh]" : "bg-gray-900 text-white py-12 mt-12 h-dvh"
        } flex flex-col`}
    >
      <div className="container mx-auto px-4 md:px-6">
        {!isRetailer && (
          <>
            <h2 className="text-3xl font-bold text-white mb-2">My Orders</h2>
            <p className="text-gray-300 mb-8">View and manage your cart, current, and finished orders.</p>
          </>
        )}

        <div
          className={`flex flex-wrap items-center gap-3 ${isRetailer ? "justify-start mb-4 border-b border-gray-200 pb-2" : "justify-start mb-8"
            }`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${activeTab === tab.key
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

        <div
          className={`${isRetailer ? "bg-white border border-gray-200" : "bg-gray-800"
            } rounded-lg shadow-md flex flex-col h-[55vh] sm:h-[60vh] overflow-y-auto p-4 sm:p-6`}
        >
          {filteredOrders.length ? (
            <div className={`space-y-4 pr-2 flex-1 ${isRetailer ? "text-gray-800" : "text-white"}`}>
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrder === order.order_id;
                const firstItem = order.items?.[0];
                const orderTotal = Number(order.total_price || 0);
                const deliveryFee = Number(order.delivery_fee || 0);
                const grandTotal = orderTotal + deliveryFee;

                return (
                  <div
                    key={order.order_id}
                    className={`rounded-lg overflow-hidden ${isRetailer ? "bg-gray-50 border border-gray-200" : "bg-gray-700"}`}
                  >
                    <button
                      onClick={() => toggleOrder(order.order_id)}
                      className={`w-full flex justify-between items-center p-3 sm:p-4 text-left transition ${isRetailer ? "hover:bg-gray-100" : "hover:bg-gray-600"
                        }`}
                    >
                      <div>
                        <h3 className={`font-semibold ${isRetailer ? "text-gray-900" : "text-white"} text-sm sm:text-base`}>
                          {firstItem?.product_name || "Unnamed Product"}
                        </h3>
                        <p className={`text-xs sm:text-sm ${isRetailer ? "text-gray-500" : "text-gray-300"}`}>
                          Status: {order.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <p className={`font-bold text-sm sm:text-lg ${isRetailer ? "text-blue-700" : "text-blue-400"}`}>
                          ₱{grandTotal.toLocaleString()}
                        </p>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        className={`p-2 sm:p-4 border-t space-y-2 sm:space-y-3 ${isRetailer ? "border-gray-200 bg-gray-50" : "border-gray-600 bg-gray-800"
                          }`}
                      >
                        <div className="max-h-[250px] sm:max-h-[300px] overflow-y-auto space-y-2 sm:space-y-3 pr-1">
                          {order.items.map((item, index) => (
                            <div
                              key={index}
                              className={`flex flex-col sm:flex-row items-start gap-2 sm:gap-4 rounded-md p-2 sm:p-3 ${isRetailer ? "bg-white border border-gray-200" : "bg-gray-700"
                                }`}
                            >
                              {item.image_url && (
                                <div className="flex-shrink-0 w-full sm:w-24 h-24 rounded-md overflow-hidden border border-gray-300">
                                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 flex flex-col justify-between w-full">
                                <div className="flex justify-between items-start flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-xs sm:text-sm md:text-base truncate">{item.product_name}</h4>
                                    <p className="text-[10px] sm:text-xs italic text-gray-400 mt-1 truncate">{item.product_description || "No description"}</p>
                                  </div>

                                  {order.order_id === "local_cart" && (
                                    <button
                                      onClick={() => handleOrderAction(order.order_id, "cancelled", item)}
                                      className="text-red-500 hover:text-red-700 transition p-1 rounded-full hover:bg-red-100"
                                      title="Remove item"
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>

                                {order.order_id === "local_cart" && (
                                  <div className="flex items-center gap-2 mt-1 sm:mt-2">
                                    <span className="text-[10px] sm:text-sm">Qty:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const localCartItems = orders.find(o => o.order_id === "local_cart")?.items || [];
                                        const updatedItems = localCartItems.map(c =>
                                          c.product_id === item.product_id ? { ...c, quantity: value === "" ? "" : Number(value) } : c
                                        );
                                        updateLocalCart(updatedItems);
                                      }}
                                      onBlur={(e) => {
                                        const value = e.target.value;
                                        if (!value || Number(value) < 1) {
                                          const localCartItems = orders.find(o => o.order_id === "local_cart")?.items || [];
                                          const updatedItems = localCartItems.map(c =>
                                            c.product_id === item.product_id ? { ...c, quantity: 1 } : c
                                          );
                                          updateLocalCart(updatedItems);
                                        }
                                      }}
                                      className="w-14 sm:w-16 px-2 py-1 rounded border border-gray-400 text-center text-[10px] sm:text-sm bg-transparent"
                                    />

                                    <button
                                      onClick={() => handleOrderAction(order.order_id, "pending", item)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs"
                                    >
                                      Checkout Item
                                    </button>
                                  </div>
                                )}

                                <div className="mt-1 sm:mt-2">
                                  <p className="font-medium text-xs sm:text-sm md:text-base">₱{item.price?.toLocaleString()} each</p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                                    {isRetailer
                                      ? `Buyer: ${order.full_name || "Unknown"}`
                                      : `Seller: ${item.branch_name || "Unknown"}`
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Delivery fee & totals */}
                        <div className="mt-2 text-sm sm:text-base">
                          {order.status === "cart" ? (
                            <div className="text-yellow-400 font-bold text-sm sm:text-base">
                              ⚠️ Delivery fee may vary
                            </div>
                          ) : (
                            <div>Delivery Fee: ₱{deliveryFee.toLocaleString()}</div>
                          )}
                          <div className="font-bold">
                            Total: ₱{(orderTotal + (order.status === "cart" ? 0 : deliveryFee)).toLocaleString()}
                          </div>
                        </div>


                        {/* Delivered date for finished orders */}
                        {activeTab === "finished" && order.status === "delivered" && order.delivered_at && (
                          <div className="mt-2 text-sm text-green-400">
                            Delivered at: {new Date(order.delivered_at).toLocaleString()}
                          </div>
                        )}

                        {order.order_id === "local_cart" && (
                          <div className="flex flex-wrap justify-end gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-600">
                            <button
                              onClick={() => handleOrderAction(order.order_id, "pending")}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm"
                            >
                              Checkout All
                            </button>
                            <button
                              onClick={() => handleOrderAction(order.order_id, "cancelled")}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm"
                            >
                              Cancel All
                            </button>
                          </div>
                        )}

                        {activeTab === "current" && order.status === "pending" && (
                          <div className="flex justify-end pt-2 sm:pt-3 border-t border-gray-600">
                            <button
                              onClick={() => handleOrderAction(order.order_id, "cancelled")}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm"
                            >
                              Cancel Order
                            </button>
                          </div>
                        )}

                        {activeTab === "current" && order.status === "on_delivery" && (
                          <div className="flex justify-end pt-2 sm:pt-3 border-t border-gray-600">
                            <button
                              onClick={() => handleOrderAction(order.order_id, "delivered")}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm"
                            >
                              Confirm Order
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center flex-1 min-h-[50px]">
              <PackageOpen size={48} className="mb-4" />
              <h3 className="text-lg font-semibold">No Orders Found</h3>
              <p className="text-sm">Your {activeTab.replace("-", " ")} list is empty for now.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <OrderInfoModal
          onClose={() => {
            setShowModal(false);
            setCheckoutItem(null);
          }}
          onConfirm={handleConfirmCheckout}
          user={user}
        />
      )}
    </section>
  );
}
