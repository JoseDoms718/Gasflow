// RetailerReqsection.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

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

  const [examProcess, setExamProcess] = useState(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);

  const [trainingProcess, setTrainingProcess] = useState(null);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);

  const [selectedExamProcess, setSelectedExamProcess] = useState(null);
  const [isExamResultModalOpen, setIsExamResultModalOpen] = useState(false);

  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // 🔥 Centralized fetch function
  const fetchAllData = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    const endpoints = [
      { url: "pending-registrations", setter: setRequests },
      { url: "pending-training", setter: setTrainingSchedule },
      { url: "pending-results", setter: setTrainingResults },
      { url: "pending-processes", setter: setPendingProcesses },
      { url: "pending-exams", setter: setPendingExams },
      { url: "completed-training-results", setter: setCompletedProcesses },
    ];

    await Promise.all(
      endpoints.map(async ({ url, setter }) => {
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
      })
    );

    setLoading(false);
  };

  // Fetch on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // -----------------------------------------
  // REQUIREMENTS -> INIT PROCESS
  // -----------------------------------------
  const handleConfirm = async (retailer) => {
    try {
      const token = localStorage.getItem("token");
      const id = retailer.id || retailer.retailer_id;

      const res = await axios.post(
        `http://localhost:5000/retailerSignup/init-process/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success("Retailer process initialized successfully.");
        setIsViewModalOpen(false); // Close modal
        setSelectedRequirement(null);
        await fetchAllData();
      } else {
        toast.error(res.data.error || "Failed to initialize process.");
      }
    } catch (err) {
      console.error("❌ Failed to initialize retailer process:", err);
      toast.error("Failed to initialize retailer process.");
    }
  };

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
      toast.success("Exam scheduled successfully.");
      setIsExamModalOpen(false); // Close modal
      setExamProcess(null);
      await fetchAllData();
    } catch (err) {
      console.error("❌ Failed to schedule exam:", err);
      toast.error("Failed to schedule exam.");
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
        return toast.error("Please select an exam result file.");

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

      toast.success("Exam result updated successfully.");
      setIsExamResultModalOpen(false); // Close modal
      setSelectedExamProcess(null);
      await fetchAllData();
    } catch (err) {
      console.error("❌ Failed to upload exam result:", err);
      toast.error("Failed to upload exam result.");
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

      toast.success("Training scheduled successfully.");
      setIsTrainingModalOpen(false); // Close modal
      setTrainingProcess(null);
      await fetchAllData();
    } catch (err) {
      console.error("❌ Failed to schedule training:", err);
      toast.error("Failed to schedule training.");
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

      toast.success(`Training marked as ${result}.`);
      await fetchAllData();
    } catch (err) {
      console.error("❌ Failed to update training result:", err);
      toast.error("Failed to update training result.");
    }
  };

  // -----------------------------------------
  // COMPLETED -> CREATE ACCOUNT
  // -----------------------------------------
  const handleCreateAccount = async (item) => {
    try {
      const id = item.pending_account_id || item.id || item.retailer_id;
      if (!id) return toast.error("Could not determine pending account ID.");

      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/retailerSignup/approve/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Retailer approved successfully.");
      await fetchAllData();
    } catch (err) {
      console.error("❌ Failed to approve retailer:", err.response?.data || err);
      toast.error(err.response?.data?.error || "Failed to approve retailer.");
    }
  };

  // -----------------------------------------
  // FILTERED DATA
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

                        {status === "exam schedule" && (
                          <button
                            className="w-24 h-9 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                            onClick={() => handleSchedule(item)}
                          >
                            Schedule
                          </button>
                        )}

                        {status === "exam result" && (
                          <button
                            className="w-24 h-9 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                            onClick={() => handleManageExamResult(item)}
                          >
                            Manage
                          </button>
                        )}

                        {status === "training schedule" && (
                          <button
                            className="w-24 h-9 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                            onClick={() => handleTrainingSchedule(item)}
                          >
                            Schedule
                          </button>
                        )}

                        {status === "Completed" && (
                          <button
                            className="w-32 h-9 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                            onClick={() => handleCreateAccount(item)}
                          >
                            Create Account
                          </button>
                        )}

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
