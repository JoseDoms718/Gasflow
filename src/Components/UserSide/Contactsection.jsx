import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapPin, Phone } from "lucide-react";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Contactsection() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [isRetailer, setIsRetailer] = useState(false);

  // Detect logged-in user role
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === "retailer") {
        setIsRetailer(true);
      }
    }
  }, []);

  // Fetch all branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/branchinfo/all`);
        const branchList = res.data.branches || [];
        setBranches(branchList);
      } catch (err) {
        console.error("Failed to load branches:", err);
        toast.error("Failed to load branches.");
      }
    };
    fetchBranches();
  }, []);

  const getToken = () => localStorage.getItem("token");

  const handleInquireClick = async (branch) => {
    const token = getToken();
    if (!token) {
      toast.error("Please login first!");
      return;
    }

    try {
      const convRes = await axios.post(
        `${BASE_URL}/chat/conversations`,
        { receiverId: branch.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const conversation = convRes.data;
      if (!conversation?.conversation_id) {
        toast.error("Failed to start inquiry.");
        return;
      }

      await axios.post(
        `${BASE_URL}/chat/messages`,
        {
          conversationId: conversation.conversation_id,
          messageText: `I would like to inquire for this branch: ${branch.branch_name}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Inquiry sent successfully!");

      if (isRetailer) {
        navigate("/retailerinquiries", { state: { branchId: branch.branch_id, conversationId: conversation.conversation_id } });
      } else {
        navigate("/inquiry", { state: { conversationId: conversation.conversation_id } });
      }
    } catch (err) {
      console.error("Failed to start inquiry:", err.response || err);
      toast.error("Failed to send inquiry. Please try again.");
    }
  };

  const sectionBg = isRetailer ? "bg-white" : "bg-gray-900";
  const sectionText = isRetailer ? "text-gray-900" : "text-white";
  const sectionSubText = isRetailer ? "text-gray-700" : "text-gray-300";

  return (
    <section className={`${sectionBg} py-16 mt-8 relative`}>
      <div className="container mx-auto px-6">
        {/* ALWAYS show heading & description */}
        <h2 className={`text-3xl font-bold mb-2 ${sectionText}`}>Contact Our Branches</h2>
        <p className={`max-w-2xl mb-8 ${sectionSubText}`}>
          Select your municipality to inquire directly with your local Solane LPG branch.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div
              key={branch.branch_id}
              className="bg-white rounded-xl shadow-lg flex flex-col h-[360px] overflow-hidden border border-gray-200 hover:shadow-2xl transition duration-300"
            >
              <div className="w-full h-36 overflow-hidden flex-shrink-0">
                {branch.branch_picture ? (
                  <img
                    src={`${BASE_URL}/uploads/branch_manager/branchPhotos/${branch.branch_picture}`}
                    alt={`${branch.branch_name} Branch`}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <MapPin className="w-10 h-10 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold mb-1 truncate text-gray-900">{branch.branch_name}</h3>
                <p className="text-sm mb-1 flex items-center gap-1 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  {branch.barangay}, <span className="font-medium">{branch.municipality}</span>
                </p>
                <p className="text-sm flex items-center gap-1 mb-3 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-600" /> {branch.contact_number || branch.branch_contact}
                </p>
                <button
                  onClick={() => handleInquireClick(branch)}
                  className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
                >
                  Inquire with {branch.branch_name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
