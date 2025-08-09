"use client";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Clock, UserCheck, UserX, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
  });
  const [attendance, setAttendance] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkAttendance, setBulkAttendance] = useState([]);
  const [bulkAttendanceDate, setBulkAttendanceDate] = useState(dayjs().format("YYYY-MM-DD"));

  // ADDED: New state for the logged-in user's profile
  const [profile, setProfile] = useState(null);

  const token = localStorage.getItem("jwt_token");
  const API_BASE_URL = "http://localhost:1337/api";

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard-metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const data = json.data || json;

      setStats((prevStats) => ({
        ...prevStats,
        totalEmployees: data.totalEmployees || prevStats.totalEmployees,

      }));
      setPendingActions(data.pendingActions || []);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const fetchedEmployees = json.data || [];

      fetchedEmployees.sort((a, b) => {
        const empIdA = parseInt(a.attributes?.employeeid, 10) || 0;
        const empIdB = parseInt(b.attributes?.employeeid, 10) || 0;
        return empIdA - empIdB;
      });
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  /**
   * Fetches attendance records for a specific date.
   * @param {string} date - The date in YYYY-MM-DD format.
   * @returns {Array} - An array of attendance records.
   */
  const fetchAttendanceByDate = async (date) => {
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/attendances?filters[date][$eq]=${date}&populate=employee`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return (json.data || []).map(item => ({
        id: item.id,
        ...item.attributes,
        employee: item.attributes.employee.data ? {
          id: item.attributes.employee.data.id,
          ...item.attributes.employee.data.attributes
        } : null
      }));
    } catch (error) {
      console.error("Error fetching attendance by date:", error);
      return [];
    }
  };

  // ADDED: Function to fetch the logged-in user's profile with populated employee data
  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/me?populate=employee`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const calculateDashboardStats = () => {
    const presentToday = attendance.filter(record => record.status === 'present').length;
    const absentToday = attendance.filter(record => record.status === 'absent').length;
    const lateArrivals = attendance.filter(record => record.status === 'late').length;

    setStats(prevStats => ({
      ...prevStats,
      presentToday,
      absentToday,
      lateArrivals,
    }));
  };

  const initializeBulkAttendance = async (employeesList, date) => {
    const existingAttendance = await fetchAttendanceByDate(date);
    const newBulkAttendance = employeesList.map((emp) => {
      const existingEntry = existingAttendance.find(
        (record) => record.employee?.id.toString() === emp.id.toString()
      );

      if (existingEntry) {
        return {
          employee: emp.id.toString(),
          date: date,
          checkIn: existingEntry.checkIn ? existingEntry.checkIn.substring(0, 5) : "",
          checkOut: existingEntry.checkOut ? existingEntry.checkOut.substring(0, 5) : "",
          status: existingEntry.status,
          marked: true,
        };
      } else {
        return {
          employee: emp.id.toString(),
          date: date,
          checkIn: "",
          checkOut: "",
          status: "",
          marked: false,
        };
      }
    });
    setBulkAttendance(newBulkAttendance);
  };

  // UPDATED: The useEffect hook now calls fetchProfile
  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchEmployees();
      fetchAttendanceByDate(dayjs().format("YYYY-MM-DD")).then(setAttendance);
      fetchProfile(); // <-- ADDED
    }
  }, [token]);

  useEffect(() => {
    calculateDashboardStats();
  }, [attendance]);

  const handleOpenDialog = async () => {
    setIsDialogOpen(true);
    await initializeBulkAttendance(employees, bulkAttendanceDate);
  };

  const handleBulkChange = (index, field, value) => {
    const updated = [...bulkAttendance];

    if (field === "status") {
      updated[index].status = value;
      if (value === "absent") {
        updated[index].checkIn = "";
        updated[index].checkOut = "";
      }
    } else if (field === "checkIn" || field === "checkOut") {
      updated[index][field] = value;
      if (value !== "" && updated[index].status === "absent") {
        updated[index].status = "present";
      } else if (value !== "") {
        if (updated[index].status === "" || updated[index].status === "absent") {
          updated[index].status = "present";
        }
      }
    }
    setBulkAttendance(updated);
  };

  const handleBulkDateChange = async (date) => {
    setBulkAttendanceDate(date);
    await initializeBulkAttendance(employees, date);
  };

  const handleSubmitAllAttendance = async (e) => {
    e.preventDefault();

    const entriesToSubmit = bulkAttendance.filter(
      (entry) => entry.status && !entry.marked
    );

    if (entriesToSubmit.length === 0) {

      console.warn("No new attendance data to submit.");
      return;
    }

    try {
      await Promise.all(
        entriesToSubmit.map((entry) => {
          const payload = {
            data: {
              employee: entry.employee,
              date: entry.date,
              checkIn: entry.checkIn ? `${entry.checkIn}:00` : null,
              checkOut: entry.checkOut ? `${entry.checkOut}:00` : null,
              status: entry.status,
            },
          };
          return fetch(`${API_BASE_URL}/attendances`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }).then(res => {
            if (!res.ok) {
              return res.json().then(errorData => {
                throw new Error(errorData.error?.message || "Failed to submit attendance.");
              });
            }
            return res.json();
          });
        })
      );

      setIsDialogOpen(false);
      fetchDashboard();
      fetchAttendanceByDate(bulkAttendanceDate).then(setAttendance);
    } catch (error) {
      console.error(`Error submitting attendance: ${error.message}`);
    }
  };

  const statsCards = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      description: "Active employees",
      icon: Users,
      colorClass: "",
    },
    {
      title: "Present Today",
      value: stats.presentToday,
      description: "Live attendance",
      icon: UserCheck,
      colorClass: "text-green-600",
    },
    {
      title: "Absent Today",
      value: stats.absentToday,
      description: "Not checked-in",
      icon: UserX,
      colorClass: "text-red-500",
    },
    {
      title: "Late Arrivals",
      value: stats.lateArrivals,
      description: "After threshold",
      icon: Clock,
      colorClass: "text-orange-500",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          {/* UPDATED: Dynamic welcome message */}
          <h1 className="text-3xl font-bold tracking-tight">
            {profile ? `Welcome, ${profile.employee?.name || profile.username || "Back"}!` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your team today.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>

          


          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Clock className="mr-2 h-4 w-4" />
              Mark Attendance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl overflow-auto max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                Mark attendance for all employees on the selected date.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAllAttendance} className="space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="bulk-date">Attendance Date:</Label>
                <Input
                  id="bulk-date"
                  type="date"
                  value={bulkAttendanceDate}
                  onChange={(e) => handleBulkDateChange(e.target.value)}
                  className="w-48"
                />
              </div>

              <div className="grid gap-4">
                {employees.map((emp, index) => {
                  const entry = bulkAttendance[index] || {};
                  const isAbsent = entry.status === "absent";
                  const alreadyMarked = entry.marked;

                  return (
                    <div
                      key={emp.id}
                      className={`grid grid-cols-6 items-center gap-4 border p-2 rounded ${alreadyMarked ? "bg-gray-100 opacity-70" : ""
                        }`}
                    >
                      <Label className="col-span-2 text-sm font-medium">
                        {emp.attributes.name}
                        {alreadyMarked && <Badge className="ml-2" variant="secondary">Marked</Badge>}
                      </Label>
                      <Input
                        placeholder="Check In"
                        value={entry.checkIn}
                        disabled={alreadyMarked || isAbsent}
                        onChange={(e) =>
                          handleBulkChange(index, "checkIn", e.target.value)
                        }
                        className="col-span-1"

                      />
                      <Input
                        placeholder="Check Out"
                        value={entry.checkOut}
                        disabled={alreadyMarked || isAbsent}
                        onChange={(e) =>
                          handleBulkChange(index, "checkOut", e.target.value)
                        }
                        className="col-span-1"

                      />
                      <Select
                        value={entry.status}
                        onValueChange={(value) =>
                          handleBulkChange(index, "status", value)
                        }
                        disabled={alreadyMarked}
                      >
                        <SelectTrigger className="col-span-2">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit">Submit Marked Attendance</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", stat.colorClass)}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>
              Latest check-ins and status updates for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendance.length > 0 ? (
                attendance
                  .map((record, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          {record.status === "present" && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          {record.status === "late" && (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          {record.status === "absent" && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {record.employee?.name || "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.employee?.department || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold capitalize",
                            {
                              "bg-green-100 text-green-700":
                                record.status === "present",
                              "bg-yellow-100 text-yellow-700":
                                record.status === "late",
                              "bg-red-100 text-red-700":
                                record.status === "absent",
                            }
                          )}
                        >
                          {record.status}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {record.checkIn
                            ? dayjs(`1970-01-01T${record.checkIn}`).format(
                              "hh:mm A"
                            )
                            : record.status === "absent"
                              ? "N/A"
                              : "Not Checked Out"}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  No attendance records for today.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingActions.length > 0 ? (
              pendingActions.map((action, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Requires review
                    </p>
                  </div>
                  <Badge variant="outline">{action.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No pending actions.
              </p>
            )}
            <Button className="w-full mt-4" variant="outline">
              View All Actions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}