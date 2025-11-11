import React, { useState } from "react";

export default function RetailerReqsection() {
  const [status, setStatus] = useState("requirements");

  // Placeholder requests (updated: only eligible ones appear in exam schedule)
  const requests = [
    {
      name: "Juan Dela Cruz",
      municipality: "Boac",
      barangay: "Barangay Malusak",
      email: "juan@sample.com",
      phone: "+63 912 888 9999",
      image: null,
      status: "requirements",
    },
    {
      name: "Josefa Luna",
      municipality: "Buenavista",
      barangay: "Barangay Banuyo",
      email: "josefa@sample.com",
      phone: "+63 934 222 3333",
      image: null,
      status: "exam schedule",
    },
    {
      name: "Pedro Reyes",
      municipality: "Torrijos",
      barangay: "Barangay Centro",
      email: "pedro@sample.com",
      phone: "+63 922 555 4444",
      image: null,
      status: "exam result",
      result: "Failed", // ❌
    },
    {
      name: "Luisa Mercado",
      municipality: "Mogpog",
      barangay: "Barangay Silangan",
      email: "luisa@sample.com",
      phone: "+63 936 123 9876",
      image: null,
      status: "exam result",
      result: "Passed", // ✅
    },
    {
      name: "Ana Cruz",
      municipality: "Santa Cruz",
      barangay: "Barangay Mabini",
      email: "ana@sample.com",
      phone: "+63 933 777 8888",
      image: null,
      status: "training",
    },
  ];

  const filteredRequests = requests.filter((req) => req.status === status);
  const buttonStyle = "px-3 py-1 w-24 text-white rounded transition";

  return (
    <div className="p-6 w-full flex flex-col">
      {/* Status Filter */}
      <div className="flex gap-4 mb-6">
        {["requirements", "exam schedule", "exam result", "training"].map(
          (stat) => (
            <button
              key={stat}
              onClick={() => setStatus(stat)}
              className={`px-4 py-2 rounded-lg capitalize border transition font-medium ${
                status === stat
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-900 border border-gray-900 hover:bg-gray-100"
              }`}
            >
              {stat}
            </button>
          )
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <table className="w-full border-collapse">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="px-4 py-2 border border-gray-300 text-center">
                Name
              </th>
              <th className="px-4 py-2 border border-gray-300 text-center">
                Municipality
              </th>
              <th className="px-4 py-2 border border-gray-300 text-center">
                Barangay
              </th>
              <th className="px-4 py-2 border border-gray-300 text-center">
                Email
              </th>
              <th className="px-4 py-2 border border-gray-300 text-center">
                Phone
              </th>

              {/* Show only Result column for exam result */}
              {status === "exam result" && (
                <th className="px-4 py-2 border border-gray-300 text-center">
                  Result
                </th>
              )}

              <th className="px-4 py-2 border border-gray-300 text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-6 text-gray-500 italic"
                >
                  No requests for "{status}" status.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req, index) => (
                <tr
                  key={index}
                  className="border-t border-gray-300 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-2 border border-gray-300 text-center">
                    {req.name}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-center">
                    {req.municipality}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-center">
                    {req.barangay}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-center">
                    {req.email}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-center">
                    {req.phone}
                  </td>

                  {/* Show Passed / Failed */}
                  {status === "exam result" && (
                    <td
                      className={`px-4 py-2 border border-gray-300 text-center font-semibold ${
                        req.result === "Passed"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {req.result}
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-2 border border-gray-300 text-center flex gap-2 justify-center">
                    {req.status === "requirements" ? (
                      <button
                        className={`${buttonStyle} bg-blue-600 hover:bg-blue-500`}
                      >
                        View
                      </button>
                    ) : req.status === "exam schedule" ? (
                      <>
                        <button
                          className={`${buttonStyle} bg-blue-600 hover:bg-blue-500`}
                        >
                          View
                        </button>
                        <button
                          className={`${buttonStyle} bg-green-600 hover:bg-green-500`}
                        >
                          Schedule
                        </button>
                      </>
                    ) : req.status === "exam result" ? (
                      req.result === "Passed" ? (
                        <>
                          <button
                            className={`${buttonStyle} bg-blue-600 hover:bg-blue-500`}
                          >
                            Result
                          </button>
                          <button
                            className={`${buttonStyle} bg-green-600 hover:bg-green-500`}
                          >
                            Schedule
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={`${buttonStyle} bg-blue-600 hover:bg-blue-500`}
                          >
                            Result
                          </button>
                          <button
                            className={`${buttonStyle} bg-red-700 hover:bg-red-600`}
                          >
                            Notify
                          </button>
                        </>
                      )
                    ) : (
                      <>
                        <button
                          className={`${buttonStyle} bg-blue-600 hover:bg-blue-500`}
                        >
                          View
                        </button>
                        <button
                          className={`${buttonStyle} bg-green-600 hover:bg-green-500`}
                        >
                          Schedule
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
