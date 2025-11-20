import React, { useState, useEffect } from "react";
import { Package } from "lucide-react";
import axios from "axios";
import BranchMarketBuy from "../Modals/BranchMarketBuy";

export default function BranchMarketSection() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

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
      .get(`${BASE_URL}/products/public/products?role=branch_manager`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const formatted = res.data.map((p) => ({
          ...p,
          image_url: p.image_url
            ? p.image_url.startsWith("http")
              ? p.image_url
              : `${BASE_URL}/products/images/${p.image_url}`
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
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr
                    key={p.product_id}
                    className={`hover:bg-gray-50`}
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
                    <td className="px-4 py-3">{p.seller_name || "—"}</td>
                    <td className="px-4 py-3">₱{formatPrice(p.discounted_price || p.price)}</td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-6 text-gray-500 italic">
                    No branch managers or products in this municipality.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BranchMarketBuy Modal */}
      {selectedProduct && (
        <BranchMarketBuy
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
