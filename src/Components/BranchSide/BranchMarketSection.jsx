import React, { useState, useEffect } from "react";
import { Package } from "lucide-react";
import axios from "axios";
import BranchMarketBuy from "../Modals/BranchMarketBuy";

export default function BranchMarketSection() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredBundles, setFilteredBundles] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // { type, data, payloadItem }

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

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSelectedMunicipality(parsedUser.municipality || "All");
    }
  }, []);

  // Fetch products
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
          branch_id: p.branch_id || p.branch, // ensure branch_id exists
          image_url: p.image_url
            ? p.image_url.startsWith("http")
              ? p.image_url
              : `${BASE_URL}/products/images/${p.image_url}`
            : null,
        }));
        setProducts(formatted);
      })
      .catch((err) => console.error("❌ Failed to fetch products:", err));
  }, [user]);

  // Fetch bundles
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${BASE_URL}/bundles/buyer/bundles`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const formatted = res.data.bundles.map((b) => ({
          ...b,
          branch_id: b.branch_id,
          bundle_image: b.bundle_image
            ? b.bundle_image.startsWith("http")
              ? b.bundle_image
              : `${BASE_URL}/products/bundles/${b.bundle_image}`
            : null,
        }));
        setBundles(formatted);
      })
      .catch((err) => console.error("❌ Failed to fetch bundles:", err));
  }, [user]);

  // Filter products by municipality
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

  // Filter bundles by municipality
  useEffect(() => {
    if (!bundles) return;
    if (selectedMunicipality === "All") {
      setFilteredBundles(bundles);
    } else {
      const filtered = bundles.filter((b) => b.municipality === selectedMunicipality);
      setFilteredBundles(filtered);
    }
  }, [selectedMunicipality, bundles]);

  const formatPrice = (value) =>
    Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Prepare item payload for backend
  const preparePayloadItem = (item, type) => {
    if (type === "product") {
      return {
        product_id: item.product_id,
        quantity: 1,
        branch_id: item.branch_id,
        type: item.type || "regular",
      };
    } else if (type === "bundle") {
      return {
        branch_bundle_id: item.branch_bundle_id,
        quantity: 1,
        branch_id: item.branch_id,
        type: "bundle",
      };
    }
    return {};
  };

  const handleBuyClick = (item, type) => {
    const payloadItem = preparePayloadItem(item, type);
    setSelectedItem({ type, data: item, payloadItem });
  };

  return (
    <div className="p-4 w-full flex flex-col gap-3 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-0 mb-1">
        <h2 className="text-lg font-semibold text-gray-800">
          Browse and purchase products or bundles from nearby branches.
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

      {/* Products & Bundles Table */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
        <div className="overflow-y-auto max-h-[70vh] rounded-xl shadow-md relative">
          <table className="min-w-full text-gray-800 text-center relative z-0">
            <thead className="bg-gray-900 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Seller / Branch</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredProducts.map((p) => (
                <tr key={`product-${p.product_id}-${p.branch_id}`} className="hover:bg-gray-50">
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
                  <td className="px-4 py-3">{p.seller_name || p.branch || "—"}</td>
                  <td className="px-4 py-3">₱{formatPrice(p.discounted_price || p.price)}</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button
                      onClick={() => handleBuyClick(p, "product")}
                      className="px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Buy
                    </button>
                  </td>
                </tr>
              ))}

              {filteredBundles.map((b) => (
                <tr key={`bundle-${b.branch_bundle_id}-${b.branch_id}`} className="hover:bg-gray-50 bg-gray-50">
                  <td className="px-4 py-3">
                    {b.bundle_image ? (
                      <img
                        src={b.bundle_image}
                        alt={b.bundle_name}
                        className="w-12 h-12 object-cover rounded-lg mx-auto"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 flex items-center justify-center rounded-lg">
                        <Package size={28} className="text-gray-500" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{b.bundle_name}</td>
                  <td className="px-4 py-3">{b.branch_name}</td>
                  <td className="px-4 py-3">₱{formatPrice(b.discounted_price || b.price)}</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button
                      onClick={() => handleBuyClick(b, "bundle")}
                      className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Buy Bundle
                    </button>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && filteredBundles.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-gray-500 italic">
                    No products or bundles available in this municipality.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedItem && (
        <BranchMarketBuy
          product={selectedItem.data}
          type={selectedItem.type}
          payloadItem={selectedItem.payloadItem} // send prepared payload
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
