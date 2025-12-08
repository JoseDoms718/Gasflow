import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapPin, Phone } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { toast } from "react-hot-toast";
import "swiper/css";
import "swiper/css/navigation";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Contactsection() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Fetch all branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/branchinfo/all`);
        const branchList = res.data.branches || [];
        setBranches(branchList);
        if (branchList.length > 0) setSelectedBranch(branchList[0]);
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
      // 1️⃣ Create conversation with branch manager
      const convRes = await axios.post(
        `${BASE_URL}/chat/conversations`,
        { receiverId: branch.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const conversation = convRes.data;
      if (!conversation?.conversation_id) {
        console.error("No conversation returned:", convRes.data);
        toast.error("Failed to start inquiry.");
        return;
      }

      // 2️⃣ Send fixed message
      await axios.post(
        `${BASE_URL}/chat/messages`,
        {
          conversationId: conversation.conversation_id,
          messageText: `I would like to inquire for this branch: ${branch.branch_name}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Inquiry sent successfully!");

      // 3️⃣ Redirect to inquiry page
      navigate("/inquiry", { state: { conversationId: conversation.conversation_id } });
    } catch (err) {
      console.error("Failed to start inquiry:", err.response || err);
      toast.error("Failed to send inquiry. Please try again.");
    }
  };

  return (
    <section className="bg-gray-900 text-gray-100 py-16 mt-8 relative">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-2">Contact Our Branches</h2>
        <p className="max-w-2xl mb-8 text-gray-300">
          Select your municipality to inquire directly with your local Solane LPG branch.
        </p>

        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          loop
          navigation={{
            nextEl: ".custom-swiper-button-next",
            prevEl: ".custom-swiper-button-prev",
          }}
          autoplay={{ delay: 4000 }}
          className="rounded-lg"
        >
          {branches.map((branch) => (
            <SwiperSlide key={branch.branch_id}>
              <div className="bg-white rounded-xl shadow-md flex flex-col h-[360px] mt-6 overflow-hidden border border-gray-200 hover:shadow-lg transition duration-300">
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
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="custom-swiper-button-prev absolute -left-10 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-700 text-white shadow-md p-3 rounded-full hover:bg-gray-600 transition">
          <span className="text-2xl font-bold">❮</span>
        </div>
        <div className="custom-swiper-button-next absolute -right-10 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-700 text-white shadow-md p-3 rounded-full hover:bg-gray-600 transition">
          <span className="text-2xl font-bold">❯</span>
        </div>
      </div>
    </section>
  );
}
