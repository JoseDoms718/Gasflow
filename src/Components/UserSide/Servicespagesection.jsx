import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Package } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const API_URL = `${BASE_URL}/services`;

export default function Servicespagesection() {
  const [modalType, setModalType] = useState(null);
  const [userType] = useState("normal"); // "business" unlocks restricted services
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/fetchServices`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const normalized = (res.data.services || []).map((s) => ({
        ...s,
        title: s.title,
        description: s.description,
        restricted: s.restricted || false,
        image: s.image_url ? `${BASE_URL}${s.image_url}` : null,
      }));

      setServices(normalized);
    } catch (err) {
      console.error("Failed to fetch services:", err);
      toast.error("Failed to load services.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const getToken = () => localStorage.getItem("token");

  const handleInquireService = async (service) => {
    const token = getToken();
    if (!token) {
      toast.error("Please login first!");
      return;
    }

    try {
      // 1️⃣ Create conversation with service owner
      const convRes = await axios.post(
        `${BASE_URL}/chat/conversations`,
        { receiverId: service.user_id }, // user_two_id
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const conversation = convRes.data;
      if (!conversation?.conversation_id) {
        toast.error("Failed to start conversation.");
        return;
      }

      // 2️⃣ Send fixed message
      await axios.post(
        `${BASE_URL}/chat/messages`,
        {
          conversationId: conversation.conversation_id,
          messageText: `I would like to inquire about your service: ${service.title}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Inquiry sent successfully!");

      // 3️⃣ Redirect to /inquiry
      navigate("/inquiry", { state: { conversationId: conversation.conversation_id } });
    } catch (err) {
      console.error("Failed to start inquiry:", err.response || err);
      toast.error("Failed to send inquiry. Please try again.");
    }
  };

  return (
    <section className="bg-gray-900 pt-15 pb-15 mt-8">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl font-bold text-white mb-2">Our Services</h2>
        <p className="text-gray-300 max-w-2xl mb-8">
          Discover the different services we offer to make your LPG needs more convenient and accessible.
        </p>

        {loading ? (
          <p className="text-white">Loading services...</p>
        ) : (
          <div className="relative">
            <Swiper
              modules={[Navigation]}
              spaceBetween={20}
              slidesPerView={1}
              navigation={{
                nextEl: ".custom-swiper-button-next",
                prevEl: ".custom-swiper-button-prev",
              }}
              breakpoints={{
                320: { slidesPerView: 1 },
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              className="rounded-lg"
            >
              {services.map((service, index) => (
                <SwiperSlide key={index}>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-gray-400" />
                      )}
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                      <p className="text-gray-600 flex-grow">{service.description}</p>

                      <button
                        onClick={() =>
                          service.restricted && userType !== "business"
                            ? toast.error("Only available for Business Owners.")
                            : handleInquireService(service)
                        }
                        disabled={service.restricted && userType !== "business"}
                        className={`mt-4 w-full font-medium py-2 px-4 rounded-lg transition
                          ${service.restricted && userType !== "business"
                            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                      >
                        {service.restricted && userType !== "business"
                          ? "Business Owners Only"
                          : `Inquire about ${service.title}`}
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="custom-swiper-button-prev absolute -left-8 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200 hidden sm:flex">
              <span className="text-gray-900 text-3xl font-bold">❮</span>
            </div>
            <div className="custom-swiper-button-next absolute -right-8 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200 hidden sm:flex">
              <span className="text-gray-900 text-3xl font-bold">❯</span>
            </div>
          </div>
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✖
            </button>

            {modalType === "retailer" ? (
              <div>
                <h3 className="text-xl font-semibold mb-4">Retailer Inquiry Form</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" className="w-full mt-1 p-2 border rounded-lg" placeholder="Enter your full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" className="w-full mt-1 p-2 border rounded-lg" placeholder="Enter your email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <textarea className="w-full mt-1 p-2 border rounded-lg" placeholder="Tell us about your interest" rows={3}></textarea>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg">
                    Submit Inquiry
                  </button>
                </form>
              </div>
            ) : modalType === "swap" ? (
              <div>
                <h3 className="text-xl font-semibold mb-4">Coming Soon</h3>
                <p className="text-gray-600">The LPG Swap service will be available soon. Stay tuned!</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
