import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider } from "@/components/ui/sidebar";
import EmployeeHeader from './EmployeeHeader';

const EmployeeLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <EmployeeHeader />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default EmployeeLayout;
