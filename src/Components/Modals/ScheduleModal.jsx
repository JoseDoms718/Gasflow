// ExamScheduleModal.jsx
import React, { useState } from "react";
import { X } from "lucide-react";

export default function ScheduleModal({ isOpen, onClose, onSave, initialData = {} }) {
    const [examDate, setExamDate] = useState(initialData.examDate || "");
    const [examTime, setExamTime] = useState(initialData.examTime || "");
    const [examLocation, setExamLocation] = useState(initialData.examLocation || "");

    // Compute today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    const handleSave = () => {
        if (!examDate || !examTime || !examLocation) {
            alert("Please fill in all fields.");
            return;
        }
        onSave({ examDate, examTime, examLocation });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 px-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative flex flex-col">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
                >
                    <X className="w-6 h-6 text-gray-700" />
                </button>

                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Schedule</h2>

                <div className="flex flex-col gap-4">

                    {/* Exam Date */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                            min={today} // Prevent past days
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Exam Time */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-700">Time</label>
                        <input
                            type="time"
                            value={examTime}
                            onChange={(e) => setExamTime(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Exam Location */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-700">Location</label>
                        <input
                            type="text"
                            value={examLocation}
                            onChange={(e) => setExamLocation(e.target.value)}
                            placeholder="Enter location"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
