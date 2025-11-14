import React, { useState } from "react";

export default function RetailerReqsection() {
  const [status, setStatus] = useState("requirements");

  const requests = [
    {
      name: "Juan Dela Cruz",
      municipality: "Boac",
      barangay: "Barangay Malusak",
      email: "juan@sample.com",
      phone: "+63 912 888 9999",
      status: "requirements",
    },
    {
      name: "Josefa Luna",
      municipality: "Buenavista",
      barangay: "Barangay Banuyo",
      email: "josefa@sample.com",
      phone: "+63 934 222 3333",
      status: "exam schedule",
    },
    {
      name: "Pedro Reyes",
      municipality: "Torrijos",
      barangay: "Barangay Centro",
      email: "pedro@sample.com",
      phone: "+63 922 555 4444",
      status: "exam result",
      result: "Failed",
    },
    {
      name: "Luisa Mercado",
      municipality: "Mogpog",
      barangay: "Barangay Silangan",
      email: "luisa@sample.com",
      phone: "+63 936 123 9876",
      status: "exam result",
      result: "Passed",
    },
    {
      name: "Ana Cruz",
      municipality: "Santa Cruz",
      barangay: "Barangay Mabini",
      email: "ana@sample.com",
      phone: "+63 933 777 8888",
      status: "training",
    },
  ];

  const filteredRequests = requests.filter((req) => req.status === status);

  // SAME-SIZED buttons
  const buttonStyle =
    "w-24 h-9 text-sm text-white rounded-lg shadow transition font-medium flex items-center justify-center";

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-lg">

      {/* ---- Filter Buttons ---- */}
      <div className="flex gap-4 mb-6 p-6">
        {["requirements", "exam schedule", "exam result", "training"].map(
          (stat) => (
            <button
              key={stat}
              onClick={() => setStatus(stat)}
              className={`px-4 py-2 rounded-lg capitalize border transition font-medium ${status === stat
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-900 border border-gray-900 hover:bg-gray-100"
                }`}
            >
              {stat}
            </button>
          )
        )}
      </div>

      {/* ---- Table Wrapper ---- */}
      <div className="overflow-y-auto max-h-[70vh] rounded-xl shadow-md relative mx-6">
        <table className="min-w-full text-gray-800 text-center text-sm relative z-0 table-fixed">

          {/* FIXED column widths */}
          <colgroup>
            <col style={{ width: "160px" }} />
            <col style={{ width: "130px" }} />
            <col style={{ width: "150px" }} />
            <col style={{ width: "220px" }} />
            <col style={{ width: "130px" }} />
            {status === "exam result" && <col style={{ width: "120px" }} />}
            <col style={{ width: "230px" }} />
          </colgroup>

          {/* ---- Header ---- */}
          <thead className="bg-gray-900 text-white sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Municipality</th>
              <th className="px-4 py-3">Barangay</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>

              {status === "exam result" && (
                <th className="px-4 py-3">Result</th>
              )}

              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          {/* ---- Table Rows ---- */}
          <tbody className="bg-white">
            {filteredRequests.length === 0 ? (
              <tr>
                <td
                  colSpan={status === "exam result" ? 7 : 6}
                  className="py-6 text-gray-500 italic"
                >
                  No requests for "{status}".
                </td>
              </tr>
            ) : (
              filteredRequests.map((req, i) => (
                <tr key={i} className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-3 h-20 font-semibold whitespace-nowrap">
                    {req.name}
                  </td>
                  <td className="px-4 py-3 h-20 whitespace-nowrap">
                    {req.municipality}
                  </td>
                  <td className="px-4 py-3 h-20 whitespace-nowrap">
                    {req.barangay}
                  </td>
                  <td className="px-4 py-3 h-20 whitespace-nowrap">
                    {req.email}
                  </td>
                  <td className="px-4 py-3 h-20 whitespace-nowrap">
                    {req.phone}
                  </td>

                  {status === "exam result" && (
                    <td
                      className={`px-4 py-3 h-20 font-semibold ${req.result === "Passed"
                          ? "text-green-600"
                          : "text-red-600"
                        }`}
                    >
                      {req.result}
                    </td>
                  )}

                  {/* ---- Action Buttons ---- */}
                  <td className="px-4 py-3 h-20 text-center">
                    <div className="flex items-center justify-center gap-2">

                      {req.status === "requirements" && (
                        <button
                          className={`${buttonStyle} bg-blue-600 hover:bg-blue-500`}
                        >
                          View
                        </button>
                      )}

                      {req.status === "exam schedule" && (
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

                      {req.status === "exam result" &&
                        (req.result === "Passed" ? (
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
                              className={`${buttonStyle} bg-red-600 hover:bg-red-500`}
                            >
                              Notify
                            </button>
                          </>
                        ))}

                      {req.status === "training" && (
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
                    </div>
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
