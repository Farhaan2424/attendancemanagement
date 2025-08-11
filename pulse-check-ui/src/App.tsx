import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import EmployeeLayout from './components/layout/EmployeeLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';

import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from "./pages/EmployeeDetails";
import Attendance from './pages/Attendance';
import LeaveRequests from './pages/LeaveRequests';
import Reports from './pages/Reports';
import Justifications from './pages/Justifications';
import Payroll from './pages/Payroll';

import Login from './pages/Login';
import MyProfile from './pages/MyProfile';
import MyAttendance from './pages/MyAttendance';
import MyJustifications from './pages/MyJustifications';
import MyLeaveRequests from './pages/MyLeaveRequests';
import MyPayroll from './pages/MyPayroll';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthReady } = useAuth();
  if (!isAuthReady) {
    return <div className="flex justify-center items-center h-screen text-xl">Loading...</div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { isAuthenticated, isAuthReady } = useAuth();
  
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = storedUser?.role?.name;

  if (!isAuthReady) {
    return <div className="flex justify-center items-center h-screen text-xl">Loading...</div>;
  }

  
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  
  const isEmployee = userRole === 'Employee';

  if (isEmployee) {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/my-profile" />} />
        <Route element={<EmployeeLayout />}>
          <Route path="/" element={<Navigate to="/my-profile" />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/my-attendance" element={<MyAttendance />} />
          <Route path="/my-justifications" element={<MyJustifications />} />
          <Route path="/my-leave-requests" element={<MyLeaveRequests />} />
          <Route path="/my-payroll" element={<MyPayroll />} />
          
          <Route path="*" element={<Navigate to="/my-profile" />} />
        </Route>
      </Routes>
    );
  } else {
    
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/" />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave-requests" element={<LeaveRequests />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/justifications" element={<Justifications />} />
          <Route path="/payroll" element={<Payroll />} />
          
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    );
  }
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
