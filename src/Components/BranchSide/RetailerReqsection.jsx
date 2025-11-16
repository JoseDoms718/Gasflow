// RetailerReqsection.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { X } from "lucide-react";

import ScheduleModal from "../Modals/ScheduleModal";
import ManageExamResultsModal from "../Modals/ManageExamResultsModal";
import ViewRequirementsModal from "../Modals/ViewRequirementsModal";

export default function RetailerReqsection() {
  const [status, setStatus] = useState("requirements");
  const [requests, setRequests] = useState([]);
  const [trainingSchedule, setTrainingSchedule] = useState([]);
  const [trainingResults, setTrainingResults] = useState([]);
  const [pendingProcesses, setPendingProcesses] = useState([]);
  const [pendingExams, setPendingExams] = useState([]);
  const [completedProcesses, setCompletedProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRetailer, setSelectedRetailer] = useState(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examProcess, setExamProcess] = useState(null);

  const [isExamResultModalOpen, setIsExamResultModalOpen] = useState(false);
  const [selectedExamProcess, setSelectedExamProcess] = useState(null);

  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [trainingProcess, setTrainingProcess] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  // 🔥 Reusable function to refresh COMPLETED TAB
  const refreshCompleted = async () => {
    const token = localStorage.getItem("token");
    try {
      const completedRes = await axios.get(
        "http://localhost:5000/retailerSignup/completed-training-results",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompletedProcesses(
        completedRes.data.success ? completedRes.data.data : []
      );
    } catch (err) {
      console.error("❌ Failed refreshing completed:", err);
    }
  };

  // Fetch all data initially
  useEffect(() => {
    const token = localStorage.getItem("token");

    const endpoints = [
      { url: "pending-registrations", setter: setRequests },
      { url: "pending-training", setter: setTrainingSchedule },
      { url: "pending-results", setter: setTrainingResults },
      { url: "pending-processes", setter: setPendingProcesses },
      { url: "pending-exams", setter: setPendingExams },
      { url: "completed-training-results", setter: setCompletedProcesses },
    ];

    const fetchData = async ({ url, setter }) => {
      try {
        const res = await axios.get(
          `http://localhost:5000/retailerSignup/${url}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setter(res.data.success ? res.data.data : []);
      } catch (err) {
        console.error(`❌ Failed to fetch ${url}:`, err);
        setter([]);
      }
    };

    Promise.all(endpoints.map(fetchData)).finally(() => setLoading(false));
  }, []);

  // -----------------------------------------
  // REQUIREMENTS -> INIT PROCESS
  // -----------------------------------------
  const handleConfirm = async (retailer) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `http://localhost:5000/retailerSignup/init-process/${retailer.id || retailer.retailer_id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert("✅ Retailer process initialized successfully.");

        // Remove from requirements list
        setRequests((prev) =>
          prev.filter((r) => r.id !== (retailer.id || retailer.retailer_id))
        );

        // 🔥 Keep Completed up-to-date
        await refreshCompleted();
      } else {
        alert(res.data.error || "Failed to initialize process.");
      }
    } catch (err) {
      console.error("❌ Failed to initialize retailer process:", err);
      alert("Failed to initialize retailer process.");
    }
  };

  const handleDecline = () => setSelectedRetailer(null);

  // -----------------------------------------
  // EXAM SCHEDULE
  // -----------------------------------------
  const handleSchedule = (retailer) => {
    setExamProcess(retailer);
    setIsExamModalOpen(true);
  };

  const handleExamSave = async (data) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/retailerSignup/schedule-exam/${examProcess.process_id}`,
        {
          exam_date: data.examDate,
          exam_time: data.examTime,
          exam_location: data.examLocation,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Exam scheduled successfully.");
      setIsExamModalOpen(false);
      setExamProcess(null);

      // Update pending-processes
      const res = await axios.get(
        "http://localhost:5000/retailerSignup/pending-processes",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingProcesses(res.data.success ? res.data.data : []);

      // 🔥 update completed
      await refreshCompleted();
    } catch (err) {
      console.error("❌ Failed to schedule exam:", err);
      alert("Failed to schedule exam.");
    }
  };

  // -----------------------------------------
  // EXAM RESULT
  // -----------------------------------------
  const handleManageExamResult = (exam) => {
    setSelectedExamProcess(exam);
    setIsExamResultModalOpen(true);
  };

  const handleSaveExamResult = async (formData) => {
    try {
      const token = localStorage.getItem("token");

      if (!formData.get("exam_result_image"))
        return alert("Please select an exam result file.");

      await axios.put(
        `http://localhost:5000/retailerSignup/upload-exam-result/${selectedExamProcess.process_id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("✅ Exam result updated successfully.");
      setIsExamResultModalOpen(false);
      setSelectedExamProcess(null);

      // Update pending exams
      const res = await axios.get(
        "http://localhost:5000/retailerSignup/pending-exams",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingExams(res.data.success ? res.data.data : []);

      // 🔥 update completed
      await refreshCompleted();
    } catch (err) {
      console.error("❌ Failed to upload exam result:", err);
      alert("Failed to upload exam result.");
    }
  };

  // -----------------------------------------
  // TRAINING SCHEDULE
  // -----------------------------------------
  const handleTrainingSchedule = (retailer) => {
    setTrainingProcess(retailer);
    setIsTrainingModalOpen(true);
  };

  const handleTrainingSave = async (data) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/retailerSignup/schedule-training/${trainingProcess.process_id}`,
        {
          training_date: data.examDate,
          training_time: data.examTime,
          training_location: data.examLocation,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Training scheduled successfully.");
      setIsTrainingModalOpen(false);
      setTrainingProcess(null);

      // Update pending training
      const res = await axios.get(
        "http://localhost:5000/retailerSignup/pending-training",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTrainingSchedule(res.data.success ? res.data.data : []);

      // 🔥 update completed
      await refreshCompleted();
    } catch (err) {
      console.error("❌ Failed to schedule training:", err);
      alert("Failed to schedule training.");
    }
  };

  // -----------------------------------------
  // TRAINING RESULT
  // -----------------------------------------
  const handleTrainingResult = async (item, result) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/retailerSignup/training-result/${item.process_id}`,
        { result },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`✅ Training marked as ${result}.`);

      const res = await axios.get(
        "http://localhost:5000/retailerSignup/pending-results",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTrainingResults(res.data.success ? res.data.data : []);

      // 🔥 update completed list
      await refreshCompleted();
    } catch (err) {
      console.error("❌ Failed to update training result:", err);
      alert("Failed to update training result.");
    }
  };

  // -----------------------------------------
  // COMPLETED -> CREATE ACCOUNT
  // -----------------------------------------
  const handleCreateAccount = async (item) => {
    try {
      console.log("Item clicked:", item); // log the full object

      // Determine the correct pending account ID
      const idToSend =
        item.pending_account_id || item.id || item.retailer_id;
      // tries pending_account_id first, then id, then retailer_id

      console.log("ID being sent to backend:", idToSend);

      if (!idToSend) {
        alert("❌ Could not determine pending account ID.");
        return;
      }

      const token = localStorage.getItem("token");

      await axios.post(
        `http://localhost:5000/retailerSignup/approve/${idToSend}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Retailer approved successfully.");
      await refreshCompleted();
    } catch (err) {
      console.error(
        "❌ Failed to approve retailer:",
        err.response?.data || err
      );
      alert(err.response?.data?.error || "Failed to approve retailer.");
    }
  };
  // -----------------------------------------
  // FILTERING
  // -----------------------------------------
  const filteredData = {
    requirements: requests,
    "exam schedule": pendingProcesses,
    "exam result": pendingExams,
    "training schedule": trainingSchedule,
    "training result": trainingResults,
    Completed: completedProcesses,
  };

  // -----------------------------------------
  // UI
  // -----------------------------------------
  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-lg">

      {/* Filter Buttons */}
      <div className="flex gap-4 mb-6 p-6 flex-wrap">
        {Object.keys(filteredData).map((stat) => (
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

      {/* Table */}
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
                <th className="px-4 py-3">Action / Exam</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {filteredData[status]?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-gray-500 italic">
                    {status === "requirements"
                      ? "No pending requests."
                      : status === "exam schedule"
                        ? "No pending exam schedules."
                        : status === "exam result"
                          ? "No exam results available."
                          : status === "training schedule"
                            ? "No scheduled trainings."
                            : status === "training result"
                              ? "No training results available."
                              : "No completed processes."}
                  </td>
                </tr>
              ) : (
                filteredData[status].map((item) => (
                  <tr
                    key={item.id || item.process_id}
                    className="hover:bg-gray-50 border-b"
                  >
                    <td className="px-4 py-3 font-semibold">{item.name}</td>
                    <td className="px-4 py-3">{item.municipality}</td>
                    <td className="px-4 py-3">{item.barangay}</td>
                    <td className="px-4 py-3">{item.email}</td>
                    <td className="px-4 py-3">{item.contact_number}</td>

                    <td className="px-4 py-3 flex flex-col gap-1 justify-center">
                      <div className="flex justify-center gap-2">

                        {/* Training Result */}
                        {status === "training result" && (
                          <>
                            <button
                              className="w-24 h-9 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                              onClick={() =>
                                handleTrainingResult(item, "passed")
                              }
                            >
                              Pass
                            </button>
                            <button
                              className="w-24 h-9 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                              onClick={() =>
                                handleTrainingResult(item, "failed")
                              }
                            >
                              Failed
                            </button>
                          </>
                        )}

                        {/* Exam Schedule */}
                        {status === "exam schedule" && (
                          <button
                            className="w-24 h-9 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                            onClick={() => handleSchedule(item)}
                          >
                            Schedule
                          </button>
                        )}

                        {/* Exam Result */}
                        {status === "exam result" && (
                          <button
                            className="w-24 h-9 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                            onClick={() => handleManageExamResult(item)}
                          >
                            Manage
                          </button>
                        )}

                        {/* Training Schedule */}
                        {status === "training schedule" && (
                          <button
                            className="w-24 h-9 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                            onClick={() => handleTrainingSchedule(item)}
                          >
                            Schedule
                          </button>
                        )}

                        {/* Completed */}
                        {status === "Completed" && (
                          <button
                            className="w-32 h-9 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                            onClick={() => handleCreateAccount(item)}
                          >
                            Create Account
                          </button>
                        )}

                        {/* Requirements */}
                        {status === "requirements" && (
                          <button
                            className="w-32 h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                            onClick={() => {
                              setSelectedRequirement(item);
                              setIsViewModalOpen(true);
                            }}
                          >
                            View
                          </button>
                        )}

                        {/* Optional schedule preview */}
                        {status === "exam schedule" && item.exam_date && (
                          <span className="text-gray-700 text-sm">
                            {item.exam_date} {item.exam_time || ""}
                          </span>
                        )}

                        {status === "training schedule" &&
                          item.training_date && (
                            <span className="text-gray-700 text-sm">
                              {item.training_date}
                            </span>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODALS ---*/}
      <ScheduleModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
        onSave={handleTrainingSave}
        initialData={{
          examDate: trainingProcess?.training_date || "",
          examTime: trainingProcess?.training_time || "",
          examLocation: trainingProcess?.training_location || "",
        }}
      />

      <ScheduleModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        onSave={handleExamSave}
        initialData={{
          examDate: examProcess?.exam_date || "",
          examTime: examProcess?.exam_time || "",
          examLocation: examProcess?.exam_location || "",
        }}
      />

      <ManageExamResultsModal
        show={isExamResultModalOpen}
        onClose={() => setIsExamResultModalOpen(false)}
        onSave={handleSaveExamResult}
      />

      <ViewRequirementsModal
        show={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        retailer={selectedRequirement}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
