import React, { useContext, useState } from "react";
import { UserContext } from "../../context/userContext";
import NewSideMenu from "./NewSideMenu";
import NewNavbar from "./NewNavbar";
import { Bars3Icon } from "@heroicons/react/24/outline";

const NewDashboardLayout = ({ children, activeMenu }) => {
  const { user } = useContext(UserContext);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-[#0d1117]">
      <NewNavbar />

      {user && (
        <div className="flex">
          {/* Sidebar */}
          <div className={`transition-all duration-300 ${
            sidebarOpen ? 'block' : 'hidden'
          } lg:block`}>
            <NewSideMenu activeMenu={activeMenu} collapsed={!sidebarOpen} />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          {/* Main Content */}
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default NewDashboardLayout;
