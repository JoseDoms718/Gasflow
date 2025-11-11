
import HeroSection from '../../Components/UserSide/Herosection'
import NavBar from '../../Components/UserSide/Navbar'
import Offersection from '../../Components/UserSide/Offersection'
import Productsection from '../../Components/UserSide/Productsection'
import Servicesection from '../../Components/UserSide/Servicesection'
import Aboutsection from '../../Components/UserSide/Aboutsection'
import Footer from '../../Components/UserSide/Footer'
function Homepage() {

  return (
    <>
    <NavBar/>  
    <HeroSection/>
    <Offersection/>
    <Productsection/>
    <Servicesection/>
    <Aboutsection/>
    <Footer/>
    </>
  )
}

export default Homepage;
