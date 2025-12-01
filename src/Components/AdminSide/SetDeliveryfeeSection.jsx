import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function SetDeliveryfeeSection() {
    const [branches, setBranches] = useState([]);
    const [insideBarangays, setInsideBarangays] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedBarangays, setSelectedBarangays] = useState({}); // {id: 'free' | 'near' | 'far'}
    const [fees, setFees] = useState({ near: "", far: "", outside: "" });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/branchinfo/all`);
            setBranches(res.data.branches || res.data);
        } catch (err) {
            console.error("Failed to fetch branches", err);
        }
    };

    const fetchInsideBarangays = async (municipality) => {
        try {
            const res = await axios.get(`${BASE_URL}/barangays`, { params: { municipality } });
            setInsideBarangays(res.data);
        } catch (err) {
            console.error("Failed to fetch barangays", err);
        }
    };

    const handleBranchSelect = (branchId) => {
        const branch = branches.find((b) => Number(b.branch_id) === Number(branchId));
        setSelectedBranch(branch);
        setSelectedBarangays({});
        if (branch) {
            fetchInsideBarangays(branch.municipality);
        }
    };

    const toggleBarangay = (b, defaultType = "near") => {
        setSelectedBarangays((prev) => {
            const copy = { ...prev };
            if (copy[b.id]) delete copy[b.id];
            else copy[b.id] = defaultType;
            return copy;
        });
    };

    const handleFeeChange = (id, value) => {
        setSelectedBarangays((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSave = async () => {
        if (!selectedBranch) return alert("Please select a branch");
        if (Object.keys(selectedBarangays).length === 0) return alert("Select at least one barangay");
        if (!fees.near || !fees.far || !fees.outside) return alert("Enter all fee values");

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
                outside_fee: fees.outside, // the endpoint handles outside automatically
            });

            alert("Delivery fees updated successfully");
        } catch (err) {
            console.error(err);
            alert("Failed to update fees");
        }
    };

    const renderBarangayRow = (b) => {
        const selected = !!selectedBarangays[b.id];

        return (
            <div key={b.id} className="flex items-center justify-between border p-2 rounded mb-2 bg-white">
                <label className="cursor-pointer">{b.name}</label>

                {selected ? (
                    <select
                        value={selectedBarangays[b.id]}
                        onChange={(e) => handleFeeChange(b.id, e.target.value)}
                        className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-100"
                    >
                        <option value="free">Free</option>
                        <option value="near">Near</option>
                        <option value="far">Far</option>
                    </select>
                ) : (
                    <button
                        onClick={() => toggleBarangay(b, "near")}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                        Select
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6 w-full max-w-6xl mx-auto">
            <h1 className="text-3xl font-semibold mb-6">Set Delivery Fee</h1>

            <div className="bg-white shadow rounded-xl p-6 space-y-6">
                {/* Branch Selector */}
                <div>
                    <label className="font-medium text-gray-700">Select Branch</label>
                    <select
                        onChange={(e) => handleBranchSelect(e.target.value)}
                        className="mt-2 w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Choose a branch</option>
                        {branches.map((branch) => (
                            <option key={branch.branch_id} value={branch.branch_id}>
                                {branch.branch_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Inside Municipality */}
                {selectedBranch && insideBarangays.length > 0 && (
                    <div>
                        <h2 className="font-medium text-gray-700 mt-4">
                            Barangays in {selectedBranch.municipality} (Inside Municipality)
                        </h2>
                        <div className="mt-2 grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                            {insideBarangays.map((b) => renderBarangayRow(b))}
                        </div>
                    </div>
                )}

                {/* Fee Inputs */}
                {selectedBranch && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="font-medium text-gray-700">Near Fee</label>
                            <input
                                type="number"
                                value={fees.near}
                                onChange={(e) => setFees({ ...fees, near: e.target.value })}
                                className="mt-2 w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 50"
                            />
                        </div>
                        <div>
                            <label className="font-medium text-gray-700">Far Fee</label>
                            <input
                                type="number"
                                value={fees.far}
                                onChange={(e) => setFees({ ...fees, far: e.target.value })}
                                className="mt-2 w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 100"
                            />
                        </div>
                        <div>
                            <label className="font-medium text-gray-700">Outside Fee</label>
                            <input
                                type="number"
                                value={fees.outside}
                                onChange={(e) => setFees({ ...fees, outside: e.target.value })}
                                className="mt-2 w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 120"
                            />
                        </div>
                    </div>
                )}

                {selectedBranch && (
                    <button
                        onClick={handleSave}
                        className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        Save Delivery Fees
                    </button>
                )}
            </div>
        </div>
    );
}
