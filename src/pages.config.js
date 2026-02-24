/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AboutUs from './pages/AboutUs';
import AdminVerifications from './pages/AdminVerifications';
import BecomeCleaner from './pages/BecomeCleaner';
import BecomeHost from './pages/BecomeHost';
import CleanKeep from './pages/CleanKeep';
import CleanerDashboard from './pages/CleanerDashboard';
import CleanerMarketplace from './pages/CleanerMarketplace';
import CleanerPricing from './pages/CleanerPricing';
import CleanerProfile from './pages/CleanerProfile';
import CleanerSignup from './pages/CleanerSignup';
import CleanerSubscriptionPay from './pages/CleanerSubscriptionPay';
import CleanerVerification from './pages/CleanerVerification';
import CreateProperty from './pages/CreateProperty';
import EditProperty from './pages/EditProperty';
import GuestProfile from './pages/GuestProfile';
import Home from './pages/Home';
import HostBookings from './pages/HostBookings';
import HostDashboard from './pages/HostDashboard';
import HostMessages from './pages/HostMessages';
import HostProperties from './pages/HostProperties';
import HostSettings from './pages/HostSettings';
import HostVerification from './pages/HostVerification';
import Index from './pages/Index';
import MyBookings from './pages/MyBookings';
import MyTrips from './pages/MyTrips';
import Pay from './pages/Pay';
import PropertyDetails from './pages/PropertyDetails';
import Search from './pages/Search';
import Subscription from './pages/Subscription';
import GuestMessages from './pages/GuestMessages';
import CleanerMessages from './pages/CleanerMessages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AboutUs": AboutUs,
    "AdminVerifications": AdminVerifications,
    "BecomeCleaner": BecomeCleaner,
    "BecomeHost": BecomeHost,
    "CleanKeep": CleanKeep,
    "CleanerDashboard": CleanerDashboard,
    "CleanerMarketplace": CleanerMarketplace,
    "CleanerPricing": CleanerPricing,
    "CleanerProfile": CleanerProfile,
    "CleanerSignup": CleanerSignup,
    "CleanerSubscriptionPay": CleanerSubscriptionPay,
    "CleanerVerification": CleanerVerification,
    "CreateProperty": CreateProperty,
    "EditProperty": EditProperty,
    "GuestProfile": GuestProfile,
    "Home": Home,
    "HostBookings": HostBookings,
    "HostDashboard": HostDashboard,
    "HostMessages": HostMessages,
    "HostProperties": HostProperties,
    "HostSettings": HostSettings,
    "HostVerification": HostVerification,
    "Index": Index,
    "MyBookings": MyBookings,
    "MyTrips": MyTrips,
    "Pay": Pay,
    "PropertyDetails": PropertyDetails,
    "Search": Search,
    "Subscription": Subscription,
    "GuestMessages": GuestMessages,
    "CleanerMessages": CleanerMessages,
}

export const pagesConfig = {
    mainPage: "Pay",
    Pages: PAGES,
    Layout: __Layout,
};