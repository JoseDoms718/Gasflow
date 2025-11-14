import React, { useState, useEffect } from "react";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { X } from "lucide-react";

export default function RetailerReqsection() {
  const [status, setStatus] = useState("requirements");
  const [requests, setRequests] = useState([]);
  const [trainingResults, setTrainingResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRetailer, setSelectedRetailer] = useState(null);

  // Fetch retailer requirements + training results
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/retailerSignup/pending-registrations",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (res.data.success) {
          setRequests(res.data.data);
        } else {
          setRequests([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch pending retailers:", err);
        setRequests([]);
      }
    };

    const fetchTrainingResults = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/retailerSignup/training-results",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (res.data.success) {
          setTrainingResults(res.data.data);
        } else {
          setTrainingResults([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch training results:", err);
        setTrainingResults([]);
      }
    };

    Promise.all([fetchRequests(), fetchTrainingResults()]).finally(() =>
      setLoading(false)
    );
  }, []);

  // Filtered data
  const filteredRequests = status === "requirements" ? requests : [];
  const filteredTraining = status === "training result" ? trainingResults : [];

  const buttonStyle =
    "w-24 h-9 text-sm text-white rounded-lg shadow transition font-medium flex items-center justify-center";

  const handleConfirm = (retailer) => {
    console.log("Confirmed:", retailer);
    setSelectedRetailer(null);
  };

  const handleDecline = (retailer) => {
    console.log("Declined:", retailer);
    setSelectedRetailer(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
      {/* ---- Filter Buttons ---- */}
      <div className="flex gap-4 mb-6 p-6 flex-wrap">
        {[
          "requirements",
          "exam schedule",
          "exam result",
          "training",
          "training result",
        ].map((stat) => (
          <button
            key={stat}
            onClick={() => setStatus(stat)}
            className={`px-4 py-2 rounded-lg capitalize border transition font-medium ${status === stat
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-900 border border-gray-300 hover:bg-gray-100"
              }`}
          >
            {stat}
          </button>
        ))}
      </div>

      {/* ---- Table Wrapper ---- */}
      <div className="overflow-y-auto max-h-[70vh] rounded-xl shadow-md relative mx-6">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full text-gray-800 text-center text-sm relative z-0 table-fixed">
            <colgroup>
              <col style={{ width: "160px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "230px" }} />
            </colgroup>

            <thead className="bg-gray-900 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Municipality</th>
                <th className="px-4 py-3">Barangay</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {/* Requirements Table */}
              {status === "requirements" &&
                (filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-gray-500 italic">
                      No pending requests.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-3 h-20 font-semibold">
                        {req.name}
                      </td>
                      <td className="px-4 py-3 h-20">{req.municipality}</td>
                      <td className="px-4 py-3 h-20">{req.barangay}</td>
                      <td className="px-4 py-3 h-20">{req.email}</td>
                      <td className="px-4 py-3 h-20">{req.contact_number}</td>
                      <td className="px-4 py-3 h-20 flex justify-center items-center">
                        <button
                          className={`${buttonStyle} bg-blue-600 hover:bg-blue-500`}
                          onClick={() => setSelectedRetailer(req)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ))}

              {/* Training Result Table */}
              {status === "training result" &&
                (filteredTraining.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-gray-500 italic">
                      No training results available.
                    </td>
                  </tr>
                ) : (
                  filteredTraining.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-3 h-20 font-semibold">{res.name}</td>
                      <td className="px-4 py-3 h-20">{res.municipality}</td>
                      <td className="px-4 py-3 h-20">{res.barangay}</td>
                      <td className="px-4 py-3 h-20">{res.email}</td>
                      <td className="px-4 py-3 h-20">{res.contact_number}</td>

                      <td className="px-4 py-3 h-20 font-semibold">
                        {res.training_status === "passed" ? (
                          <span className="text-green-600">Passed</span>
                        ) : (
                          <span className="text-red-600">Failed</span>
                        )}
                      </td>
                    </tr>
                  ))
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Modal ---- */}
      {selectedRetailer && status === "requirements" && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-hidden relative flex flex-col">
            <button
              onClick={() => setSelectedRetailer(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>

            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-2xl font-semibold mb-4">
                {selectedRetailer.name}
              </h2>

              <div className="grid grid-cols-2 gap-4 text-gray-700">
                <p>
                  <strong>Email:</strong> {selectedRetailer.email}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedRetailer.contact_number}
                </p>
                <p>
                  <strong>Municipality:</strong> {selectedRetailer.municipality}
                </p>
                <p>
                  <strong>Barangay:</strong> {selectedRetailer.barangay}
                </p>
                <p>
                  <strong>Role:</strong> {selectedRetailer.role}
                </p>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-3">Documents</h3>

              <Swiper
                modules={[Navigation]}
                slidesPerView={3}
                navigation
                className="my-4"
                spaceBetween={0}
                breakpoints={{
                  640: { slidesPerView: 1 },
                  768: { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
              >
                {selectedRetailer.images.map((img) => (
                  <SwiperSlide
                    key={img.id}
                    className="flex justify-center"
                  >
                    <div className="flex flex-col items-center">
                      <img
                        src={`http://localhost:5000/${img.image_url}`}
                        alt={img.type}
                        className="w-full max-w-[160px] h-36 object-cover rounded-lg border"
                      />
                      <span className="mt-2 text-sm font-medium capitalize">
                        {img.type}
                      </span>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => handleDecline(selectedRetailer)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 transition"
              >
                Decline
              </button>
              <button
                onClick={() => handleConfirm(selectedRetailer)}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
