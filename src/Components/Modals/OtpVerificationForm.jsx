import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function OtpVerificationForm({ email, onVerifyOtp }) {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const timerRef = useRef(null);

    const navigate = useNavigate();

    // Start countdown on mount
    useEffect(() => {
        resetTimer();
        return () => clearInterval(timerRef.current);
    }, []);

    const resetTimer = () => {
        setResendTimer(60);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Verify OTP & auto-login
    const handleVerify = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.error("⚠️ Enter a valid 6-digit OTP.");
            return;
        }

        try {
            setLoading(true);
            const res = await axios.post(`${BASE_URL}/verify-otp`, { email, otp });

            // ✅ Expect the backend to return { token, user, success, message }
            const { token, user } = res.data;
            if (!token) {
                toast.error("No token received. Auto-login failed.");
                return;
            }

            // Save token to localStorage for authenticated requests
            localStorage.setItem("token", token);

            toast.success("✅ OTP verified! Logged in successfully.");

            // Clear OTP input
            setOtp("");

            // Call parent callback if provided
            if (onVerifyOtp) await onVerifyOtp(user);

            // Redirect to home/dashboard
            navigate("/dashboard"); // change to your desired route

        } catch (err) {
            console.error("❌ OTP verification error:", err);
            toast.error(err?.response?.data?.error || "Invalid or expired OTP.");
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        if (resendTimer > 0 || sendingOtp) return;

        try {
            setSendingOtp(true);
            await axios.post(`${BASE_URL}/send-otp`, { email, action: "resend" });
            toast.success("✅ OTP resent successfully!");
            resetTimer();
        } catch (err) {
            console.error("❌ Resend OTP error:", err);
            toast.error(err?.response?.data?.error || "Failed to resend OTP.");
        } finally {
            setSendingOtp(false);
        }
    };

    // Cancel OTP
    const handleCancel = async () => {
        try {
            await axios.post(`${BASE_URL}/send-otp`, { email, action: "cancel" });
            toast.success("✅ OTP canceled successfully!");
            setOtp("");
            clearInterval(timerRef.current);
            setResendTimer(0);
            navigate("/"); // redirect to login/home
        } catch (err) {
            console.error("❌ Cancel OTP error:", err);
            toast.error(err?.response?.data?.error || "Failed to cancel OTP.");
        }
    };

    return (
        <form
            onSubmit={handleVerify}
            className="flex flex-col gap-4 bg-gray-900 text-white p-6 rounded-xl shadow-md max-w-md mx-auto"
        >
            <h2 className="text-2xl font-semibold text-center">Verify Your Email</h2>
            <p className="text-gray-400 text-center text-sm">
                Enter the OTP sent to <span className="text-blue-400">{email}</span>
            </p>

            <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
                className="w-full p-4 text-center rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none tracking-widest text-lg font-mono"
            />

            <div className="flex gap-4">
                <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 rounded-full font-semibold text-lg transition ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-[#2d5ee0] hover:bg-[#244bb5] text-white"
                        }`}
                >
                    {loading ? <Loader2 className="mx-auto animate-spin" size={22} /> : "Verify OTP"}
                </button>

                <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-3 rounded-full font-semibold text-lg text-white bg-red-600 hover:bg-red-700 transition"
                >
                    Cancel
                </button>
            </div>

            <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || sendingOtp}
                className={`mt-2 w-full text-sm font-semibold ${resendTimer > 0 || sendingOtp
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-blue-400 hover:underline"
                    }`}
            >
                {sendingOtp ? "Sending..." : `Resend OTP ${resendTimer > 0 ? `(${resendTimer}s)` : ""}`}
            </button>
        </form>
    );
}
