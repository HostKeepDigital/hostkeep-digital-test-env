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
import Accessibility from './pages/Accessibility';
import AdminVerifications from './pages/AdminVerifications';
import BecomeCleaner from './pages/BecomeCleaner';
import BecomeHost from './pages/BecomeHost';
import CleanKeep from './pages/CleanKeep';
import CleanerDashboard from './pages/CleanerDashboard';
import CleanerMarketplace from './pages/CleanerMarketplace';
import CleanerMessages from './pages/CleanerMessages';
import CleanerPricing from './pages/CleanerPricing';
import CleanerProfile from './pages/CleanerProfile';
import CleanerSignup from './pages/CleanerSignup';
import CleanerSubscriptionPay from './pages/CleanerSubscriptionPay';
import CleanerTerms from './pages/CleanerTerms';
import CleanerVerification from './pages/CleanerVerification';
import CookiePolicy from './pages/CookiePolicy';
import CreateProperty from './pages/CreateProperty';
import DisputePolicy from './pages/DisputePolicy';
import EditProperty from './pages/EditProperty';
import GuestMessages from './pages/GuestMessages';
import GuestProfile from './pages/GuestProfile';
import GuestTerms from './pages/GuestTerms';
import Home from './pages/Home';
import HostBookings from './pages/HostBookings';
import HostCancellationPolicies from './pages/HostCancellationPolicies';
import HostDashboard from './pages/HostDashboard';
import HostMessages from './pages/HostMessages';
import HostProperties from './pages/HostProperties';
import HostSettings from './pages/HostSettings';
import HostTerms from './pages/HostTerms';
import HostVerification from './pages/HostVerification';
import Index from './pages/Index';
import LegalCentre from './pages/LegalCentre';
import LockScreen from './pages/LockScreen';
import MyBookings from './pages/MyBookings';
import MyTrips from './pages/MyTrips';
import Pay from './pages/Pay';
import PaymentPolicy from './pages/PaymentPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PropertyDetails from './pages/PropertyDetails';
import RefundPolicy from './pages/RefundPolicy';
import Search from './pages/Search';
import Subscription from './pages/Subscription';
import TermsAndConditions from './pages/TermsAndConditions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AboutUs": AboutUs,
    "Accessibility": Accessibility,
    "AdminVerifications": AdminVerifications,
    "BecomeCleaner": BecomeCleaner,
    "BecomeHost": BecomeHost,
    "CleanKeep": CleanKeep,
    "CleanerDashboard": CleanerDashboard,
    "CleanerMarketplace": CleanerMarketplace,
    "CleanerMessages": CleanerMessages,
    "CleanerPricing": CleanerPricing,
    "CleanerProfile": CleanerProfile,
    "CleanerSignup": CleanerSignup,
    "CleanerSubscriptionPay": CleanerSubscriptionPay,
    "CleanerTerms": CleanerTerms,
    "CleanerVerification": CleanerVerification,
    "CookiePolicy": CookiePolicy,
    "CreateProperty": CreateProperty,
    "DisputePolicy": DisputePolicy,
    "EditProperty": EditProperty,
    "GuestMessages": GuestMessages,
    "GuestProfile": GuestProfile,
    "GuestTerms": GuestTerms,
    "Home": Home,
    "HostBookings": HostBookings,
    "HostCancellationPolicies": HostCancellationPolicies,
    "HostDashboard": HostDashboard,
    "HostMessages": HostMessages,
    "HostProperties": HostProperties,
    "HostSettings": HostSettings,
    "HostTerms": HostTerms,
    "HostVerification": HostVerification,
    "Index": Index,
    "LegalCentre": LegalCentre,
    "LockScreen": LockScreen,
    "MyBookings": MyBookings,
    "MyTrips": MyTrips,
    "Pay": Pay,
    "PaymentPolicy": PaymentPolicy,
    "PrivacyPolicy": PrivacyPolicy,
    "PropertyDetails": PropertyDetails,
    "RefundPolicy": RefundPolicy,
    "Search": Search,
    "Subscription": Subscription,
    "TermsAndConditions": TermsAndConditions,
}

export const pagesConfig = {
    mainPage: "Pay",
    Pages: PAGES,
    Layout: __Layout,
};