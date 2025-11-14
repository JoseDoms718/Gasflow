import React, { useState, useEffect } from "react";
import { Package, ShoppingCart } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function BranchMarketSection() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [isViewing, setIsViewing] = useState(false);

  const marinduqueMunicipalities = [
    "All",
    "Boac",
    "Mogpog",
    "Gasan",
    "Santa Cruz",
    "Torrijos",
    "Buenavista",
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSelectedMunicipality(parsedUser.municipality || "All");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("http://localhost:5000/products/public/products?role=branch_manager", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const formatted = res.data.map((p) => ({
          ...p,
          image_url: p.image_url
            ? p.image_url.startsWith("http")
              ? p.image_url
              : `http://localhost:5000/products/images/${p.image_url}`
            : null,
        }));
        setProducts(formatted);
      })
      .catch((err) => console.error("❌ Failed to fetch branch manager products:", err));
  }, [user]);

  useEffect(() => {
    if (!products) return;

    if (selectedMunicipality === "All") {
      const prioritized = [...products].sort((a, b) => {
        if (a.branch === user?.municipality && b.branch !== user?.municipality) return -1;
        if (a.branch !== user?.municipality && b.branch === user?.municipality) return 1;
        return 0;
      });
      setFilteredProducts(prioritized);
    } else {
      const filtered = products.filter((p) => p.branch === selectedMunicipality);
      setFilteredProducts(filtered);
    }
  }, [selectedMunicipality, products, user]);

  const handleBuyProduct = () => {
    if (!selectedProduct || buyQuantity <= 0) return toast.error("⚠️ Invalid quantity");
    const token = localStorage.getItem("token");
    if (!token) return toast.error("You must be logged in to buy.");

    axios
      .post(
        "http://localhost:5000/orders/create",
        { product_id: selectedProduct.product_id, quantity: buyQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((res) => {
        if (res.status === 200) {
          toast.success(`✅ Successfully bought ${buyQuantity}x ${selectedProduct.product_name}!`);
          setSelectedProduct(null);
          setBuyQuantity(1);
        }
      })
      .catch((err) => {
        console.error("❌ Purchase failed:", err);
        toast.error("Failed to complete purchase.");
      });
  };

  const formatPrice = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="p-4 w-full flex flex-col gap-3 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-0 mb-1">
        <h2 className="text-lg font-semibold text-gray-800">
          Browse and purchase products from nearby branches.
        </h2>

        <select
          value={selectedMunicipality}
          onChange={(e) => setSelectedMunicipality(e.target.value)}
          className="mt-2 md:mt-0 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 shadow-sm hover:border-gray-400 transition-all"
        >
          {marinduqueMunicipalities.map((muni) => (
            <option key={muni} value={muni}>
              {muni === "All" ? "All Municipalities" : muni}
            </option>
          ))}
        </select>
      </div>

      {/* Product Table */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
        <div className="overflow-y-auto max-h-[70vh] rounded-xl shadow-md relative">
          <table className="min-w-full text-gray-800 text-center relative z-0">
            <thead className="bg-gray-900 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr
                    key={p.product_id}
                    className={`hover:bg-gray-50 ${p.branch === user?.municipality ? "bg-green-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.product_name}
                          className="w-12 h-12 object-cover rounded-lg mx-auto"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded-lg">
                          <Package size={28} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{p.product_name}</td>
                    <td className="px-4 py-3">{p.branch || "—"}</td>
                    <td className="px-4 py-3">{p.stock}</td>
                    <td className="px-4 py-3">₱{formatPrice(p.discounted_price || p.price)}</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setIsViewing(true);
                        }}
                        className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setIsViewing(false);
                        }}
                        className="px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-6 text-gray-500 italic">
                    No branch managers or products in this municipality.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for View/Buy */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl h-[520px] overflow-hidden flex flex-col md:flex-row transition-all duration-300">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            <div className="flex-shrink-0 w-full md:w-1/2 h-full bg-gray-900 relative flex items-center justify-center">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package size={90} className="text-gray-500" />
              )}
            </div>

            <div className="flex-1 p-7 flex flex-col justify-between overflow-y-auto">
              <div>
                <h2 className="text-3xl font-bold text-white mb-3">{selectedProduct.product_name}</h2>
                <hr className="border-gray-700 mb-5" />
                <p className="text-gray-200 mb-2">
                  {selectedProduct.product_description || "No description."}
                </p>
                <p className="text-gray-200 mb-1">Available: {selectedProduct.stock}</p>
                <p className="text-gray-200 mb-1">Seller: {selectedProduct.seller_name || "Unknown"}</p>

                {!isViewing && (
                  <>
                    {/* Price above quantity */}
                    <p className="text-gray-200 text-lg mb-3">
                      Price per unit: <span className="font-semibold">₱{formatPrice(selectedProduct.discounted_price || selectedProduct.price)}</span>
                    </p>

                    <div className="mb-4">
                      <label className="block text-gray-400 mb-1">Quantity:</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBuyQuantity((prev) => Math.max(prev - 1, 1))}
                          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={selectedProduct.stock}
                          value={buyQuantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0) setBuyQuantity(Math.min(val, selectedProduct.stock));
                          }}
                          className="w-20 px-2 py-1 rounded bg-gray-800 text-white text-center"
                        />
                        <button
                          onClick={() =>
                            setBuyQuantity((prev) => Math.min(prev + 1, selectedProduct.stock))
                          }
                          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Total price emphasized */}
                    <p className="text-yellow-400 text-2xl font-bold">
                      Total: ₱{formatPrice((selectedProduct.discounted_price || selectedProduct.price) * buyQuantity)}
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  Close
                </button>
                {!isViewing && (
                  <button
                    onClick={handleBuyProduct}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2"
                  >
                    <ShoppingCart size={18} /> Buy Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
