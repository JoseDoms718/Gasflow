import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapPin, Phone } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Contactsection({ currentUser }) {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    message: "",
  });

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
      }
    };
    fetchBranches();
  }, []);

  const handleInquireClick = (branch) => {
    if (!currentUser?.authToken) {
      alert("Please login first!");
      return;
    }
    setSelectedBranch(branch);
    setShowForm(true);
    setFormData({
      name: currentUser.name,
      email: currentUser.email,
      message: "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser?.authToken) {
      alert("Please login first!");
      return;
    }
    if (!selectedBranch) return console.error("No branch selected");

    try {
      const convRes = await axios.post(
        `${BASE_URL}/chat/create`,
        { receiverId: selectedBranch.user_id },
        { headers: { Authorization: `Bearer ${currentUser.authToken}` } }
      );

      const conversation = convRes.data.conversation;
      if (!conversation?.conversation_id) return console.error("No conversation returned:", convRes.data);

      if (formData.message.trim()) {
        await axios.post(
          `${BASE_URL}/chat/messages`,
          {
            conversationId: conversation.conversation_id,
            text: formData.message.trim(),
          },
          { headers: { Authorization: `Bearer ${currentUser.authToken}` } }
        );
      }

      setShowForm(false);
      setFormData({ name: currentUser.name, email: currentUser.email, message: "" });
      navigate("/inquiry", { state: { conversationId: conversation.conversation_id } });
    } catch (err) {
      console.error("Failed to send inquiry:", err.response || err);
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
                    <Phone className="w-4 h-4 text-gray-600" /> {branch.branch_contact}
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

      {/* Modal Form */}
      {showForm && selectedBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 w-full max-w-2xl p-8 rounded-2xl shadow-lg relative text-gray-100">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 hover:text-gray-300 text-xl"
            >
              ✕
            </button>

            <h2 className="text-3xl font-bold mb-2 text-center">{`Contact ${selectedBranch.branch_name}`}</h2>
            <p className="text-center mb-6 text-gray-300">
              Fill out the form below to send your inquiry.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block mb-1 text-sm font-medium">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 text-gray-100 border border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 text-gray-100 border border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 text-gray-100 border border-gray-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
