"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableHeader, TableRow, TableHead,
  TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

// This is the main LeaveRequests component.
export default function LeaveRequests() {
  // State for all leave requests and employees
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  // State for loading status
  const [loading, setLoading] = useState(false);
  // State to control the "New Leave Request" dialog
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  // State to control the "Access Denied" custom dialog
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  // State to control the "Approve/Reject Confirmation" custom dialog
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  // State to store details for the confirmation dialog (id and action)
  const [confirmationDetails, setConfirmationDetails] = useState({ id: 0, action: "" });
  // State for the new leave request form inputs
  const [form, setForm] = useState({
    employeeId: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  // Changed the default userRole to "admin" to allow actions.
  // In a real app, this would be set dynamically after authentication.
  const [userRole, setUserRole] = useState("admin");

  // API endpoints
  const API_LEAVE = "http://localhost:1337/api/leave-requests";
  const API_EMP = "http://localhost:1337/api/employees";

  // Get authentication token from local storage
  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  // Configuration for authenticated API calls
  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // useEffect hook to fetch all data on component mount
  useEffect(() => {
    // In a real application, you would fetch the user's role from a JWT token or an API
    // Example: setUserRole(getRoleFromToken(token));
    if (token) {
      fetchAll();
    } else {
      console.error("Authentication token not found. Cannot fetch data.");
    }
  }, [token]);

  // Function to fetch all leave requests and employee data
  const fetchAll = async () => {
    if (!token) {
      console.error("Authentication token not found. Aborting fetchAll.");
      return;
    }
    setLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([
        axios.get(`${API_LEAVE}?populate=employee`, authConfig),
        axios.get(API_EMP, authConfig),
      ]);
      setRequests(rRes.data.data);
      setEmployees(eRes.data.data);
    } catch (err) {
      console.error("Failed to fetch leave requests or employees:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tally the number of requests by status
  const tally = {
    pending: requests.filter((r) => r.attributes.status === "pending").length,
    approved: requests.filter((r) => r.attributes.status === "approved").length,
    rejected: requests.filter((r) => r.attributes.status === "rejected").length,
  };

  // Function to perform the approve action (called after confirmation)
  const performApprove = async (id: number) => {
    try {
      await axios.put(`${API_LEAVE}/${id}`, { data: { status: "approved" } }, authConfig);
      console.log("Leave request approved.");
      await fetchAll();
    } catch (err) {
      console.error("Error approving leave request:", err);
    }
  };

  // Function to perform the reject action (called after confirmation)
  const performReject = async (id: number) => {
    try {
      await axios.put(`${API_LEAVE}/${id}`, { data: { status: "rejected" } }, authConfig);
      console.log("Leave request rejected.");
      await fetchAll();
    } catch (err) {
      console.error("Error rejecting leave request:", err);
    }
  };

  // Handle a new leave request submission
  const handleSubmit = async () => {
    if (userRole === "manager") {
      setIsAccessDeniedDialogOpen(true); // Show custom access denied dialog
      setIsNewRequestDialogOpen(false); // Close the request form
      return;
    }
    if (!token) {
      console.error("Authentication token not found. Cannot submit request.");
      return;
    }
    try {
      await axios.post(API_LEAVE, {
        data: {
          employee: form.employeeId,
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          status: "pending",
        },
      }, authConfig);
      setIsNewRequestDialogOpen(false);
      setForm({ employeeId: "", leaveType: "", startDate: "", endDate: "", reason: "" });
      console.log("Leave request submitted successfully!");
      await fetchAll();
    } catch (err) {
      console.error("Error submitting leave request:", err);
    }
  };

  // Main component render
  return (
    <div className="p-6 space-y-6">
      {/* Header and New Leave Request Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">
            Manage employee leave applications and approvals
          </p>
        </div>
        {/* Dialog for submitting a new leave request */}
        <Dialog open={isNewRequestDialogOpen} onOpenChange={(open) => {
          // Check if the user is a manager when the dialog attempts to open.
          if (open && userRole === "manager") {
            setIsAccessDeniedDialogOpen(true);
            setIsNewRequestDialogOpen(false); // Don't open the new request form
          } else {
            setIsNewRequestDialogOpen(open);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 w-4 h-4" /> New Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Leave Request</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Select value={form.employeeId} onValueChange={(val) => setForm({ ...form, employeeId: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.attributes.employeeid} – {e.attributes.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Leave Type (e.g., Sick, Vacation)"
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              />
              <div className="flex space-x-2">
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
              <Button className="w-full" onClick={handleSubmit}>Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle><Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tally.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle><Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{tally.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle><X className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{tally.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table of Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>All Leave Requests</CardTitle>
          <CardDescription>A list of all leave requests and their current status.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {userRole !== "manager" && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...requests]
                  .sort((a, b) => {
                    const empA = a.attributes.employee.data?.attributes?.employeeid || "";
                    const empB = b.attributes.employee.data?.attributes?.employeeid || "";
                    return empA.localeCompare(empB, undefined, { numeric: true });
                  })
                  .map((item) => {
                    const att = item.attributes;
                    const emp = item.attributes.employee.data?.attributes;
                    const days =
                      att.startDate && att.endDate
                        ? Math.round(
                            (new Date(att.endDate).getTime() - new Date(att.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                          ) + 1
                        : 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell><div className="text-sm text-muted-foreground">{emp?.employeeid}</div></TableCell>
                        <TableCell>
                          <div className="font-medium">{emp?.name}</div>
                        </TableCell>
                        <TableCell>{att.leaveType}</TableCell>
                        <TableCell>{format(new Date(att.startDate), "dd MMM, yyyy")}</TableCell>
                        <TableCell>{format(new Date(att.endDate), "dd MMM, yyyy")}</TableCell>
                        <TableCell>{days} days</TableCell>
                        <TableCell>{att.reason || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>
                              {att.status === "pending" && <Clock className="h-4 w-4 text-warning" />}
                              {att.status === "approved" && <Check className="h-4 w-4 text-success" />}
                              {att.status === "rejected" && <X className="h-4 w-4 text-destructive" />}
                            </span>
                            <Badge
                              variant={
                                att.status === "pending"
                                  ? "secondary"
                                  : att.status === "approved"
                                    ? "default"
                                    : "destructive"
                              }
                              className="capitalize"
                            >
                              {att.status}
                            </Badge>
                          </div>
                        </TableCell>
                        {userRole !== "manager" && (
                          <TableCell className="flex gap-2">
                            {att.status === "pending" && (
                              <>
                                <Button size="sm" onClick={() => {
                                  setConfirmationDetails({ id: item.id, action: "approve" });
                                  setIsConfirmationDialogOpen(true);
                                }}>
                                  <Check className="mr-1 h-3 w-3" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                  setConfirmationDetails({ id: item.id, action: "reject" });
                                  setIsConfirmationDialogOpen(true);
                                }}>
                                  <X className="mr-1 h-3 w-3" /> Reject
                                </Button>
                              </>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Custom Access Denied Dialog */}
      <Dialog open={isAccessDeniedDialogOpen} onOpenChange={setIsAccessDeniedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            You do not have the necessary permissions to perform this action.
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => setIsAccessDeniedDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Confirmation Dialog for Approving/Rejecting */}
      <Dialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Action
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to {confirmationDetails.action} this request?
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmationDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (userRole === "manager") {
                  setIsConfirmationDialogOpen(false);
                  setIsAccessDeniedDialogOpen(true);
                } else {
                  if (confirmationDetails.action === "approve") {
                    await performApprove(confirmationDetails.id);
                  } else if (confirmationDetails.action === "reject") {
                    await performReject(confirmationDetails.id);
                  }
                  setIsConfirmationDialogOpen(false);
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
