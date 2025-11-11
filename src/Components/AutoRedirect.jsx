import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AutoRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const [checking, setChecking] = useState(true); // ✅ loading gate

    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (token && user) {
            const parsed = JSON.parse(user);

            // ✅ Only redirect if user is on login or landing
            if (location.pathname === "/" || location.pathname === "/login") {
                switch (parsed.role) {
                    case "users":
                    case "business_owner":
                        navigate("/homepage");
                        break;
                    case "branch_manager":
                        navigate("/branchorder");
                        break;
                    case "retailer":
                        navigate("/retailerorder");
                        break;
                    case "admin":
                        navigate("/admininventory");
                        break;
                    default:
                        break;
                }
            }
        }

        setChecking(false); // ✅ done checking
    }, [navigate, location]);

    // ✅ While checking, render nothing (prevents flicker)
    if (checking) return null;

    return null;
}
