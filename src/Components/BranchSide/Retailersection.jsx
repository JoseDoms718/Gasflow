import React, { useState, useEffect } from "react";
import axios from "axios";
import { X } from "lucide-react";

export default function Retailersection() {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRetailer, setSelectedRetailer] = useState(null);

  useEffect(() => {
    const fetchRetailers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/retailers/my-retailers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRetailers(res.data.retailers || []);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching retailers:", err);
        setError("Failed to fetch retailers");
        setRetailers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRetailers();
  }, []);

  return (
    <div className="p-6 w-full flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-gray-900">Retailers</h2>

      <div className="flex-1 overflow-auto rounded-xl shadow-md relative">
        <table className="min-w-full text-gray-800 text-center text-sm relative z-0">
          <thead className="bg-gray-900 text-white sticky top-0 z-10 text-sm">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Barangay</th>
              <th className="px-4 py-2">Municipality</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-6 text-gray-500 italic">
                  Loading retailers...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="7" className="py-6 text-red-500 italic">
                  {error}
                </td>
              </tr>
            ) : retailers.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-6 text-gray-500 italic">
                  No retailers available.
                </td>
              </tr>
            ) : (
              retailers.map((r) => (
                <tr
                  key={r.user_id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">{r.barangay}</td>
                  <td className="px-4 py-3">{r.municipality}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.contact_number || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-3 py-1 text-sm font-semibold rounded-lg shadow-sm ${r.type === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button
                      onClick={() => setSelectedRetailer(r)}
                      className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ----------------- View Modal ----------------- */}
      {selectedRetailer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold">Retailer Details</h3>
              <button
                onClick={() => setSelectedRetailer(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex gap-1">
                <span className="font-semibold">Name:</span>
                <span className="text-gray-200">{selectedRetailer.name}</span>
              </div>

              <div className="flex gap-1">
                <span className="font-semibold">Email:</span>
                <span className="text-gray-200">{selectedRetailer.email}</span>
              </div>

              <div className="flex gap-1">
                <span className="font-semibold">Contact:</span>
                <span className="text-gray-200">{selectedRetailer.contact_number || "—"}</span>
              </div>

              <div className="flex gap-1">
                <span className="font-semibold">Barangay:</span>
                <span className="text-gray-200">{selectedRetailer.barangay}</span>
              </div>

              <div className="flex gap-1">
                <span className="font-semibold">Municipality:</span>
                <span className="text-gray-200">{selectedRetailer.municipality}</span>
              </div>

              <div className="flex gap-1">
                <span className="font-semibold">Type:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${selectedRetailer.type === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                    }`}
                >
                  {selectedRetailer.type}
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedRetailer(null)}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
