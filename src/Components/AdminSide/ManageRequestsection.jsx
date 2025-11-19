import React, { useState, useEffect } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function ManageRequestsSection() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false); // Global loading
  const [selectedImage, setSelectedImage] = useState(null); // For lightbox

  const token = localStorage.getItem("token"); // Admin token

  // Fetch pending business_owner registrations
  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/business-owner/pending-registrations`,
        {
          params: { role: "business_owner" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequests(res.data.data);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      toast.error("⚠️ Failed to load requests");
    }
  };

  useEffect(() => {
    if (token) fetchRequests();
  }, [token]);

  const handleOpenView = (req) => setSelectedRequest(req);
  const handleCloseViewModal = () => setSelectedRequest(null);

  const handleApprove = async (otpId) => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/business-owner/approve/${otpId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success(res.data.message || "✅ Registration approved successfully");
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast.error(res.data.error || "⚠️ Failed to approve registration");
      }
    } catch (err) {
      console.error("Approval error:", err);
      toast.error(err.response?.data?.error || "⚠️ Failed to approve registration");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (otpId) => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/business-owner/reject/${otpId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success(res.data.message || "❌ Registration rejected successfully");
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast.error(res.data.error || "⚠️ Failed to reject registration");
      }
    } catch (err) {
      console.error("Reject error:", err);
      toast.error(err.response?.data?.error || "⚠️ Failed to reject registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 w-full">
      {/* Table Section */}
      <div className="overflow-y-auto max-h-[70vh] rounded-xl shadow-md relative">
        <table className="min-w-full text-gray-800 text-center text-sm">
          <thead className="bg-gray-900 text-white sticky top-0 z-10 text-sm">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Barangay</th>
              <th className="px-4 py-2">Municipality</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {requests.length > 0 ? (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{req.name}</td>
                  <td className="px-4 py-3">{req.role}</td>
                  <td className="px-4 py-3">{req.barangay}</td>
                  <td className="px-4 py-3">{req.municipality}</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button
                      onClick={() => handleOpenView(req)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-gray-500 italic">
                  No pending business owner requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white p-8 rounded-xl w-full max-w-2xl shadow-xl relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
              onClick={handleCloseViewModal}
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl font-bold mb-2">Request Details</h3>

            <div className="grid grid-cols-2 gap-x-10 gap-y-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Name:</span>
                <span className="ml-1 text-gray-200">{selectedRequest.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Role:</span>
                <span className="ml-1 text-gray-200">{selectedRequest.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Barangay:</span>
                <span className="ml-1 text-gray-200">{selectedRequest.barangay}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Municipality:</span>
                <span className="ml-1 text-gray-200">{selectedRequest.municipality}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Email:</span>
                <span className="ml-1 text-gray-200">{selectedRequest.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Phone:</span>
                <span className="ml-1 text-gray-200">{selectedRequest.contact_number}</span>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <strong>Attachments:</strong>
              {selectedRequest.images?.length > 0 ? (
                <div className="flex flex-wrap gap-4 mt-2">
                  {selectedRequest.images.map((img) => (
                    <img
                      key={img.id}
                      src={`${BASE_URL}/${img.image_url}`}
                      alt={img.type}
                      className="w-48 h-48 object-contain rounded-lg border bg-gray-100 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setSelectedImage(`${BASE_URL}/${img.image_url}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">None</p>
              )}

              {/* Full-view Lightbox */}
              {selectedImage && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 cursor-pointer"
                  onClick={() => setSelectedImage(null)}
                >
                  <img
                    src={selectedImage}
                    alt="Full view"
                    className="max-w-[90%] max-h-[90%] rounded-lg shadow-xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Modal */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-4">
            <div className="loader border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full w-8 h-8 animate-spin"></div>
            <span className="font-semibold text-gray-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
