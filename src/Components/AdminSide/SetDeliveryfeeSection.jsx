import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function SetDeliveryfeeSection() {
    const [branches, setBranches] = useState([]);
    const [insideBarangays, setInsideBarangays] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedBarangays, setSelectedBarangays] = useState({});
    const [fees, setFees] = useState({ near: "", far: "", outside: "" });
    const [hasExistingFees, setHasExistingFees] = useState(false);

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/branchinfo/all`);
            setBranches(res.data.branches || res.data);
        } catch (err) {
            console.error("Failed to fetch branches", err);
            toast.error("Failed to fetch branches");
        }
    };

    const fetchInsideBarangays = async (municipality) => {
        try {
            const res = await axios.get(`${BASE_URL}/barangays/`, { params: { municipality } });
            return res.data;
        } catch (err) {
            console.error("Failed to fetch barangays", err);
            toast.error("Failed to fetch barangays");
            return [];
        }
    };

    const fetchExistingFees = async (branchId) => {
        try {
            const res = await axios.get(`${BASE_URL}/fee/get/${branchId}`);
            if (res.data.success && res.data.fees) {
                const barangayFees = {};
                let near = "", far = "", outside = "";

                res.data.fees.forEach((f) => {
                    if (f.barangay_id) barangayFees[f.barangay_id] = f.fee_type;
                    if (f.fee_type === "near") near = f.fee_amount;
                    if (f.fee_type === "far") far = f.fee_amount;
                    if (f.fee_type === "outside") outside = f.fee_amount;
                });

                setSelectedBarangays(barangayFees);
                setFees({ near, far, outside });
                setHasExistingFees(true);
            } else {
                setHasExistingFees(false);
            }
        } catch (err) {
            console.error("Failed to fetch existing delivery fees", err);
            toast.error("Failed to fetch existing delivery fees");
            setHasExistingFees(false);
        }
    };

    const handleBranchSelect = async (branchId) => {
        const branch = branches.find((b) => Number(b.branch_id) === Number(branchId));
        setSelectedBranch(branch);
        setSelectedBarangays({});
        setFees({ near: "", far: "", outside: "" });
        setHasExistingFees(false);

        if (!branch) return;

        const barangays = await fetchInsideBarangays(branch.municipality);
        setInsideBarangays(barangays);

        await fetchExistingFees(branch.branch_id);
    };

    const handleBarangayTypeChange = (b, type) => {
        setSelectedBarangays((prev) => ({
            ...prev,
            [b.id]: prev[b.id] === type ? "" : type,
        }));
    };

    const handleSaveOrUpdate = async () => {
        if (!selectedBranch) return toast.error("Please select a branch");
        if (Object.keys(selectedBarangays).length === 0) return toast.error("Select at least one barangay");
        if (!fees.near || !fees.far || !fees.outside) return toast.error("Enter all fee values");

        try {
            const payload = Object.keys(selectedBarangays).map((id) => ({
                barangay_id: Number(id),
                type: selectedBarangays[id],
            }));

            await axios.post(`${BASE_URL}/fee/set`, {
                branch_id: selectedBranch.branch_id,
                fees: payload,
                near_fee: fees.near,
                far_fee: fees.far,
                outside_fee: fees.outside,
            });

            toast.success(hasExistingFees ? "Delivery fees updated successfully" : "Delivery fees set successfully");
            setHasExistingFees(true);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save/update fees");
        }
    };

    const renderBarangayRow = (b) => {
        const selectedType = selectedBarangays[b.id] || "";

        return (
            <div
                key={b.id}
                className={`flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition ${selectedType ? "bg-blue-50 border-blue-300" : "bg-white"
                    }`}
            >
                <span className="text-gray-700 font-medium">{b.name}</span>
                <div className="flex space-x-3 items-center">
                    {["free", "near", "far"].map((type) => (
                        <label key={type} className="flex items-center space-x-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedType === type}
                                onChange={() => handleBarangayTypeChange(b, type)}
                                className="accent-blue-500 w-4 h-4"
                            />
                            <span className="capitalize text-sm">{type}</span>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 w-full max-w-6xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Set Delivery Fee</h1>

            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                {/* Branch Selector */}
                <div>
                    <label className="font-medium text-gray-700 mb-1 block">Select Branch</label>
                    <select
                        onChange={(e) => handleBranchSelect(e.target.value)}
                        className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Choose a branch</option>
                        {branches.map((branch) => (
                            <option key={branch.branch_id} value={branch.branch_id}>
                                {branch.branch_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Barangay List */}
                {selectedBranch && insideBarangays.length > 0 && (
                    <div>
                        <h2 className="text-gray-700 font-medium mb-2">
                            Barangays in {selectedBranch.municipality} (Inside Municipality)
                        </h2>
                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {insideBarangays.map((b) => renderBarangayRow(b))}
                        </div>
                    </div>
                )}

                {/* Fee Inputs */}
                {selectedBranch && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="text-gray-700 font-medium">Near Fee</label>
                            <input
                                type="number"
                                value={fees.near}
                                onChange={(e) => setFees({ ...fees, near: e.target.value })}
                                className="w-full border rounded-lg p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 50"
                            />
                        </div>
                        <div>
                            <label className="text-gray-700 font-medium">Far Fee</label>
                            <input
                                type="number"
                                value={fees.far}
                                onChange={(e) => setFees({ ...fees, far: e.target.value })}
                                className="w-full border rounded-lg p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 100"
                            />
                        </div>
                        <div>
                            <label className="text-gray-700 font-medium">Outside Fee</label>
                            <input
                                type="number"
                                value={fees.outside}
                                onChange={(e) => setFees({ ...fees, outside: e.target.value })}
                                className="w-full border rounded-lg p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 120"
                            />
                        </div>
                    </div>
                )}

                {/* Save/Update Button */}
                {selectedBranch && (
                    <button
                        onClick={handleSaveOrUpdate}
                        className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {hasExistingFees ? "Update Delivery Fees" : "Save Delivery Fees"}
                    </button>
                )}
            </div>
        </div>
    );
}
