import { Outlet, useLocation } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomTabBar from "./BottomTabBar";
import EmailSupportButton from "./EmailSupportButton";
import ChatWidget from "./dashboard/ChatWidget";

const noFooterRoutes = ['/dashboard', '/transactions', '/notifications', '/settings', '/deposit', '/withdraw', '/kyc', '/investment-plans'];

function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const showFooter = !noFooterRoutes.some(r => location.pathname.startsWith(r));

  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden bg-brand-bg text-white selection:bg-brand-success selection:text-brand-bg">
      <ScrollToTop />
      <Navbar />
      <main className={`flex-grow ${isDashboard ? "pt-[60px]" : "pt-[76px]"} pb-[env(safe-area-inset-bottom)]`}>
        <Outlet />
      </main>
      {showFooter && <Footer />}
      <BottomTabBar />
      <EmailSupportButton />
      <ChatWidget />
    </div>
  );
}

export default Layout;
