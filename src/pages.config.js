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
import Pay from './pages/Pay';
import Home from './pages/Home';
import Search from './pages/Search';
import PropertyDetails from './pages/PropertyDetails';
import HostDashboard from './pages/HostDashboard';
import CreateProperty from './pages/CreateProperty';
import HostBookings from './pages/HostBookings';
import HostProperties from './pages/HostProperties';
import Subscription from './pages/Subscription';
import HostMessages from './pages/HostMessages';
import HostSettings from './pages/HostSettings';
import EditProperty from './pages/EditProperty';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Pay": Pay,
    "Home": Home,
    "Search": Search,
    "PropertyDetails": PropertyDetails,
    "HostDashboard": HostDashboard,
    "CreateProperty": CreateProperty,
    "HostBookings": HostBookings,
    "HostProperties": HostProperties,
    "Subscription": Subscription,
    "HostMessages": HostMessages,
    "HostSettings": HostSettings,
    "EditProperty": EditProperty,
}

export const pagesConfig = {
    mainPage: "Pay",
    Pages: PAGES,
    Layout: __Layout,
};