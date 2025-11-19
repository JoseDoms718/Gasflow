import NavBar from "../../Components/UserSide/Navbar";
import InquiriesSection from "../../Components/AdminSide/InquiriesSection";
import Footer from "../../Components/UserSide/Footer";

function Inquirypage() {
    return (
        <>
            <NavBar />
            <div style={{ marginTop: "80px" }}> {/* adds a gap from Navbar */}
                <InquiriesSection />
            </div>
            <Footer />
        </>
    );
}

export default Inquirypage;
