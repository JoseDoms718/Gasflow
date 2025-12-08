import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import axios from "axios";
import { Briefcase } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Servicesection() {
  const [services, setServices] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BASE_URL}/services/fetchServices`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const normalized = (res.data.services || []).map((s) => ({
          ...s,
          image: s.image_url ? `${BASE_URL}${s.image_url}` : null,
        }));
        setServices(normalized);
      } catch (err) {
        console.error(err);
        setServices([]);
        toast.error("Failed to load services.");
      }
    };

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

      // 2️⃣ Send initial fixed message
      await axios.post(
        `${BASE_URL}/chat/messages`,
        {
          conversationId: conversation.conversation_id,
          messageText: `I would like to inquire about your service: ${service.title}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Inquiry sent successfully!");

      // 3️⃣ Redirect to /inquiry with conversationId
      navigate("/inquiry", { state: { conversationId: conversation.conversation_id } });
    } catch (err) {
      console.error("Failed to start inquiry:", err.response || err);
      toast.error("Failed to send inquiry. Please try again.");
    }
  };

  return (
    <section className="bg-white py-8 md:py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Our Services</h2>
        <p className="text-gray-600 text-sm md:text-base max-w-xl mb-6 md:mb-8">
          Explore the range of services we offer to ensure you get the best experience from our company.
        </p>

        <Swiper
          modules={[Autoplay]}
          spaceBetween={12}
          slidesPerView={1}
          loop={services.length > 1}
          autoplay={{ delay: 5000 }}
          breakpoints={{
            320: { slidesPerView: 1 },
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          className="rounded-lg"
        >
          {services.length > 0
            ? services.map((service) => (
              <SwiperSlide key={service.id}>
                <div className="bg-gray-50 rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col h-[300px] md:h-[350px]">
                  {service.image ? (
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-36 md:h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 md:h-48 bg-gray-200 flex items-center justify-center">
                      <Briefcase className="w-10 h-10 text-gray-400" />
                    </div>
                  )}

                  <div className="p-3 md:p-4 flex flex-col flex-grow">
                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
                      {service.title || "Service Title"}
                    </h3>
                    <p className="text-gray-600 text-sm md:text-sm line-clamp-2 flex-grow">
                      {service.description || "No description available."}
                    </p>
                    {service.user_id && (
                      <button
                        onClick={() => handleInquireService(service)}
                        className="mt-3 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
                      >
                        Inquire
                      </button>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))
            : Array(3)
              .fill(0)
              .map((_, i) => (
                <SwiperSlide key={i}>
                  <div className="bg-gray-100 rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col h-[300px] md:h-[350px] items-center justify-center">
                    <Briefcase className="w-10 h-10 text-gray-400" />
                    <p className="text-gray-500 mt-2">Loading...</p>
                  </div>
                </SwiperSlide>
              ))}
        </Swiper>
      </div>
    </section>
  );
}
