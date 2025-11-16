import React, { useState } from "react";
import { X } from "lucide-react";

export default function ManageExamResultsModal({ show, onClose, onSave }) {
    const [examImage, setExamImage] = useState(null);
    const [examResult, setExamResult] = useState("passed"); // "passed" or "failed"

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) setExamImage(file);
    };

    const handleSave = () => {
        if (!examImage) return alert("Please upload an exam result file.");

        const formData = new FormData();
        formData.append("exam_result_image", examImage); // correct key
        formData.append("exam_result", examResult);      // correct key & value

        onSave(formData);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative flex flex-col gap-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold">Manage Exam Results</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition">
                        <X className="w-6 h-6 text-gray-300" />
                    </button>
                </div>

                {/* Upload Exam Image */}
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Upload Exam Result</label>
                    <label className="w-full flex justify-center items-center px-4 py-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition">
                        <span className="text-gray-300">{examImage ? examImage.name : "Choose File"}</span>
                        <input type="file" accept="image/*,application/pdf" onChange={handleImageChange} className="hidden" />
                    </label>
                    {examImage && (
                        <img
                            src={URL.createObjectURL(examImage)}
                            alt="Preview"
                            className="mt-4 w-full h-40 object-cover rounded border border-gray-700"
                        />
                    )}
                </div>

                {/* Passed Selector */}
                <div className="flex items-center justify-between">
                    <span className="font-medium">Exam Result</span>
                    <select
                        value={examResult}
                        onChange={(e) => setExamResult(e.target.value)}
                        className="bg-gray-800 text-white px-2 py-1 rounded"
                    >
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
