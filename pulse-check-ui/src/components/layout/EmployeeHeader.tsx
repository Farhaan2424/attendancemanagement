import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "@/context/UserContext";

import { Search, User as UserIcon, Settings, LogOut } from "lucide-react";
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

const EmployeeHeader = () => {
  const { user: contextUser } = useUser();
  const navigate = useNavigate();

  // Use optional chaining for safe access
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = contextUser || storedUser;

  const [searchTerm, setSearchTerm] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      if (lowerCaseSearchTerm.includes("attendance")) {
        navigate("/my-attendance");
      } else if (lowerCaseSearchTerm.includes("leave")) {
        navigate("/my-leave-requests");
      } else if (lowerCaseSearchTerm.includes("justification")) {
        navigate("/my-justifications");
      } else if (lowerCaseSearchTerm.includes("my profile")) {
        navigate("/my-profile");
      }
      setSearchTerm("");
    }
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

      {/* Employee Search Bar */}
      <div className="flex items-center gap-4 flex-1 justify-center mx-8">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search my attendance, my leaves, my justifications, my profile..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      {/* Profile Dropdown */}
      <div className="flex items-center gap-4">
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
                  {user?.username || "Employee User"}
                </p>
                <p className="text-sm leading-none text-muted-foreground">
                  {user?.email || "employee@company.com"}
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
    </header>
  );
};

export default EmployeeHeader;