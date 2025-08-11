import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  Calendar,
  BarChart3,
  DollarSign,
  Settings,
  LogOut,
  User as UserIcon,
  Briefcase
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser } from "@/context/UserContext";

const mainMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Leave Requests", url: "/leave-requests", icon: Calendar },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Justifications", url: "/justifications", icon: FileText },
  { title: "Payroll", url: "/payroll", icon: DollarSign },
];

const employeeMenuItems = [
  { title: "My Profile", url: "/my-profile", icon: UserIcon },
  { title: "My Attendance", url: "/my-attendance", icon: Clock },
  { title: "My Justifications", url: "/my-justifications", icon: FileText },
  { title: "My Leave Requests", url: "/my-leave-requests", icon: Calendar },
  { title: "My Payroll", url: "/my-payroll", icon: DollarSign },
];



// Log out logic
const handleLogout = () => {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("user");
  window.location.href = "/login"; 
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const { user: contextUser } = useUser();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = contextUser || storedUser;
  const userRole = user?.role?.name;

  const getNavClass = (path) => {
    const baseClass = "w-full justify-start transition-colors";
   
    const isActive = (path === "/" && currentPath === "/") || (path !== "/" && currentPath.startsWith(path));
    
    return `${baseClass} ${isActive ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50'}`;
  };

  const getMenuItems = useMemo(() => {
    
    if (userRole === 'Employee') {
      return employeeMenuItems;
    }
    return mainMenuItems;
  }, [userRole]);

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-16 items-center border-b px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">AttendanceMS</span>
          </div>
        )}
        <SidebarTrigger className="ml-auto" />
      </div>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>
            {userRole === 'Employee' ? "My Pages" : "Main Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="w-full justify-start text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
