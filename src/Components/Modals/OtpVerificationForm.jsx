import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function OtpVerificationForm({
    email,
    onVerifyOtp,      // function(otp) => promise
    onCancel,         // optional function() => promise
    onResendOtp,      // function() => promise
}) {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const timerRef = useRef(null);

    // Start countdown when component mounts
    useEffect(() => {
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

        return () => clearInterval(timerRef.current);
    }, []);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!otp.trim() || otp.length !== 6) {
            toast.error("⚠️ Enter a valid 6-digit OTP.");
            return;
        }

        try {
            setLoading(true);
            await onVerifyOtp(otp);
            setOtp("");
        } catch (err) {
            console.error("❌ OTP verification error:", err);
            toast.error(err?.message || "Invalid or expired OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0 || sendingOtp) return;
        try {
            setSendingOtp(true);
            await onResendOtp();
            setResendTimer(60); // restart timer
        } catch (err) {
            console.error("❌ Resend OTP error:", err);
            toast.error(err?.message || "Failed to resend OTP.");
        } finally {
            setSendingOtp(false);
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

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-full font-semibold text-lg text-white bg-red-600 hover:bg-red-700 transition"
                    >
                        Cancel
                    </button>
                )}
            </div>

            <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || sendingOtp}
                className={`mt-2 w-full text-sm font-semibold ${resendTimer > 0 || sendingOtp ? "text-gray-500 cursor-not-allowed" : "text-blue-400 hover:underline"
                    }`}
            >
                {sendingOtp ? "Sending..." : `Resend OTP ${resendTimer > 0 ? `(${resendTimer}s)` : ""}`}
            </button>
        </form>
    );
}
