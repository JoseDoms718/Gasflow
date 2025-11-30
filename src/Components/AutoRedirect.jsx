import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AutoRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        // ⛔ If NOT logged in → force redirect to landing page
        const publicRoutes = ["/", "/login"];
        const isPublic = publicRoutes.includes(location.pathname);

        if (!token || !user) {
            if (!isPublic) navigate("/", { replace: true });
            setChecking(false);
            return;
        }

        // ✅ User IS logged in
        const parsed = JSON.parse(user);

        // Redirect logged-in users away from public routes
        if (isPublic) {
            switch (parsed.role) {
                case "users":
                case "business_owner":
                    navigate("/homepage", { replace: true });
                    break;
                case "branch_manager":
                    navigate("/branchorder", { replace: true });
                    break;
                case "retailer":
                    navigate("/retailerorder", { replace: true });
                    break;
                case "admin":
                    navigate("/admininventory", { replace: true });
                    break;
                default:
                    break;
            }
        }

        setChecking(false);
    }, [navigate, location]);

    if (checking) return null;
    return null;
}
