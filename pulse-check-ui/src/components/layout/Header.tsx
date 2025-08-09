import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { Bell, Search, User as UserIcon, Settings, LogOut, LayoutDashboard, FileText, Calendar, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { useUser } from "@/context/UserContext";
import EmployeeHeader from "./EmployeeHeader"; // Import the new employee header component

const Header = () => {
  const { user: contextUser } = useUser();
  const navigate = useNavigate();

  // Use optional chaining for safe access
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = contextUser || storedUser;

  const userRole = user?.role?.name;
  const isEmployee = userRole === "employee";

  // If the user is an employee, render the dedicated EmployeeHeader component
  if (isEmployee) {
    return <EmployeeHeader />;
  }

  // The rest of the component is for Admin, HR, and Manager roles
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [pendingJustifications, setPendingJustifications] = useState([]);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);

  const API_BASE_URL = "http://localhost:1337/api";

  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  const authConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }), [token]);

  const fetchPendingLeaveRequests = async () => {
    if (!token) {
      console.error("Authentication token not found. Cannot fetch leave requests.");
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leave-requests?filters[status][$eq]=pending&populate=employee`,
        authConfig
      );
      setPendingLeaveRequests(res.data.data);
    } catch (error) {
      console.error("Error fetching pending leave requests:", error);
    }
  };

  const fetchPendingJustifications = async () => {
    if (!token) {
      console.error("Authentication token not found. Cannot fetch justifications.");
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/justifications?filters[status][$eq]=pending&populate=employee`,
        authConfig
      );
      setPendingJustifications(res.data.data);
    } catch (error) {
      console.error("Error fetching pending justifications:", error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPendingLeaveRequests();
      fetchPendingJustifications();
    }
  }, [token]);

  const totalPendingCount = pendingLeaveRequests.length + pendingJustifications.length;

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      if (lowerCaseSearchTerm.includes("employee")) {
        navigate("/employees");
      } else if (lowerCaseSearchTerm.includes("attendance")) {
        navigate("/attendance");
      } else if (lowerCaseSearchTerm.includes("leave")) {
        navigate("/leave-requests");
      } else if (lowerCaseSearchTerm.includes("justification")) {
        navigate("/justifications");
      } else if (lowerCaseSearchTerm.includes("payroll")) {
        navigate("/payroll");
      } else if (lowerCaseSearchTerm.includes("dashboard")) {
        navigate("/");
      } else if (lowerCaseSearchTerm.includes("reports")) {
        navigate("/reports");
      }
      setSearchTerm("");
    }
  };

  const getEmployeeName = (item) => {
    return item.attributes?.employee?.data?.attributes?.name || "N/A";
  };

  const getEmployeeId = (item) => {
    return item.attributes?.employee?.data?.attributes?.employeeid || "N/A";
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 py-2 shadow-sm">
      {/* User Info Section */}
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold text-gray-900 leading-tight">
            {user?.username || "Guest"}
          </p>
          {user?.role?.name && (
            <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
              {user.role.name}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-tight">
          {user?.email || "guest@example.com"}
        </p>
      </div>

      {/* Admin/HR/Manager Search Bar */}
      <div className="flex items-center gap-4 flex-1 justify-center mx-8">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search employees, attendance, leave, justification, payroll, dashboard, reports..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      {/* Action Buttons & Profile Dropdown */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200"
          onClick={() => setIsNotificationDialogOpen(true)}
        >
          <Bell className="h-5 w-5" />
          {totalPendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-xs font-bold animate-bounce-once"
            >
              {totalPendingCount}
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full overflow-hidden border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
              <Avatar className="h-full w-full">
                <AvatarImage src="/avatars/admin.png" alt="User Avatar" />
                <AvatarFallback className="bg-blue-500 text-white font-semibold text-sm">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 p-2 shadow-lg rounded-lg" align="end" forceMount>
            <DropdownMenuLabel className="font-semibold text-gray-900 pb-2 border-b border-gray-100">
              <div className="flex flex-col space-y-1">
                <p className="text-base font-bold leading-none">
                  {user?.username || "Admin User"}
                </p>
                <p className="text-sm leading-none text-muted-foreground">
                  {user?.email || "admin@company.com"}
                </p>
                {user?.role?.name && (
                  <Badge variant="outline" className="mt-1 px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full self-start">
                    {user.role.name}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem className="flex items-center gap-2 py-2 px-3 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors duration-150" onClick={() => navigate("/my-profile")}>
              <UserIcon className="h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 py-2 px-3 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors duration-150" onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem className="flex items-center gap-2 py-2 px-3 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors duration-150" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-lg shadow-xl">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="text-2xl font-bold text-gray-900">Pending Actions</DialogTitle>
            <DialogDescription className="text-gray-600">
              Review pending leave requests and justifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pt-2">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" /> Pending Leave Requests ({pendingLeaveRequests.length})
              </h3>
              {pendingLeaveRequests.length > 0 ? (
                <Table className="min-w-full bg-white border border-gray-200 rounded-md overflow-hidden">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLeaveRequests.map((request) => (
                      <TableRow key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <TableCell className="px-4 py-2 font-medium text-gray-900">
                          {getEmployeeName(request)} <span className="text-xs text-gray-500">({getEmployeeId(request)})</span>
                        </TableCell>
                        <TableCell className="px-4 py-2 text-gray-700">{request.attributes.leaveType}</TableCell>
                        <TableCell className="px-4 py-2 text-gray-700">
                          {new Date(request.attributes.startDate).toLocaleDateString()} -{" "}
                          {new Date(request.attributes.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-4 py-2 truncate max-w-[150px] text-gray-700">{request.attributes.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-gray-500">No pending leave requests.</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" /> Pending Justifications ({pendingJustifications.length})
              </h3>
              {pendingJustifications.length > 0 ? (
                <Table className="min-w-full bg-white border border-gray-200 rounded-md overflow-hidden">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingJustifications.map((justification) => (
                      <TableRow key={justification.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <TableCell className="px-4 py-2 font-medium text-gray-900">
                          {getEmployeeName(justification)} <span className="text-xs text-gray-500">({getEmployeeId(justification)})</span>
                        </TableCell>
                        <TableCell className="px-4 py-2 text-gray-700">{justification.attributes.type}</TableCell>
                        <TableCell className="px-4 py-2 text-gray-700">{new Date(justification.attributes.date).toLocaleDateString()}</TableCell>
                        <TableCell className="px-4 py-2 truncate max-w-[150px] text-gray-700">
                          {justification.attributes.reason?.[0]?.children?.[0]?.text || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-gray-500">No pending justifications.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <style jsx>{`
        @keyframes bounce-once {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-5px);
          }
          60% {
            transform: translateY(-2px);
          }
        }
        .animate-bounce-once {
          animation: bounce-once 1s ease-in-out;
        }
      `}</style>
    </header>
  );
};

export default Header;