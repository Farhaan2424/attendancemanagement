"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formatTimeWithMeridian = (
  time: string | null | undefined,
  status: string
): string => {
  if (status === "absent") return "—";
  if (!time || !time.includes(":")) return "—";
  const parsed = dayjs(`2023-01-01T${time}`);
  if (!parsed.isValid()) return "—";
  return parsed.format("h:mm A");
};

const formatWorkingHours = (
  value: string | number | null | undefined,
  status: string
): string => {
  if (status === "absent") return "—";
  if (!value || value === "0" || value === "0:0") return "—";

  if (typeof value === "string" && /^\d+h \d+min$/.test(value)) {
    return value;
  }

  if (typeof value === "number") {
    const hrs = Math.floor(value / 60);
    const mins = value % 60;
    return `${hrs}h ${mins}min`;
  }

  if (typeof value === "string" && /^\d{1,2}:\d{1,2}$/.test(value)) {
    const [hoursStr, minutesStr] = value.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return "—";
    return `${hours}h ${minutes}min`;
  }

  if (
    typeof value === "string" &&
    /^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(value)
  ) {
    const parts = value.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return `${hours}h ${minutes}min`;
    }
  }
  return "—";
};

function ensureTimeFormat(time: string): string {
  if (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(time)) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return time + ":00.000";
  console.warn("Invalid time input:", time);
  return "00:00:00.000";
}

interface AttendanceRecord {
  id: number;
  employee: { id: number; name: string; employeeid: string; department: string };
  checkIn: string;
  checkOut: string;
  status: string;
  workingHours: string;
  date: string;
}

interface Employee {
  id: number;
  name: string;
  employeeid: string;
  department: string;
}

interface EmployeeAttendanceForm {
  employeeid: string;
  checkIn: string;
  checkOut: string;
  status: string;
  date: string;
  id?: number;
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const stored = localStorage.getItem("attendanceSelectedDate");
    return stored ? new Date(stored) : new Date();
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<EmployeeAttendanceForm[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    checkIn: "",
    checkOut: "",
    status: "",
  });

  const API_URL = "http://localhost:1337/api/attendances";
  const EMP_API_URL = "http://localhost:1337/api/employees";

  // --- JWT Token and Auth Config ---
  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchRecords = async (date: Date) => {
    if (!token) {
      console.error("Authentication token not found. Cannot fetch attendance records.");
      return;
    }
    const iso = format(date, "yyyy-MM-dd");
    try {
      const res = await axios.get(
        `${API_URL}?filters[date][$eq]=${iso}&populate=employee`,
        authConfig // Apply authConfig here
      );
      const records: AttendanceRecord[] = res.data.data.map((item: any) => ({
        id: item.id,
        employee: item.attributes.employee.data?.attributes
          ? {
              ...item.attributes.employee.data.attributes,
              id: item.attributes.employee.data.id,
            }
          : { name: "-", employeeid: "-", department: "-", id: -1 },
        checkIn: item.attributes.checkIn,
        checkOut: item.attributes.checkOut,
        status: item.attributes.status,
        workingHours: item.attributes.workingHours,
        date: item.attributes.date,
      }));

      setRecords(records);
      const total = records.length;
      const present = records.filter((r) => r.status === "present").length;
      const late = records.filter((r) => r.status === "late").length;
      const absent = records.filter((r) => r.status === "absent").length;
      setStats({ total, present, late, absent });
    } catch (err) {
      console.error("Failed to fetch attendance records:", err);
    }
  };

  const fetchEmployees = async () => {
    if (!token) {
      console.error("Authentication token not found. Cannot fetch employees.");
      return;
    }
    try {
      const res = await axios.get(EMP_API_URL, authConfig); // Apply authConfig here
      const list = res.data.data.map((e: any) => ({
        id: e.id,
        name: e.attributes.name,
        employeeid: e.attributes.employeeid,
        department: e.attributes.department,
      }));
      setEmployees(list.sort((a: Employee, b: Employee) => a.id - b.id));
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  useEffect(() => {
    // Only fetch data if the token is present
    if (token) {
      fetchRecords(selectedDate);
      fetchEmployees();
    }
  }, [selectedDate, token]); // Add token to dependencies

  useEffect(() => {
    localStorage.setItem("attendanceSelectedDate", selectedDate.toISOString());
  }, [selectedDate]);

  const calculateWorkingHours = (checkIn: string, checkOut: string): number => {
    const start = dayjs(`2023-01-01T${checkIn}`);
    const end = dayjs(`2023-01-01T${checkOut}`);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;
    return end.diff(start, "minute");
  };

  const handleBulkFormChange = (
    index: number,
    field: keyof EmployeeAttendanceForm,
    value: string
  ) => {
    setBulkForm((prevForms) => {
      const updatedForms = [...prevForms];
      const form = { ...updatedForms[index], [field]: value };

      if (field === "status") {
        if (value === "absent") {
          form.checkIn = "";
          form.checkOut = "";
        }
      } else if (field === "checkIn" || field === "checkOut") {
        if (form.status === "absent" && value !== "") {
          form.status = "";
        }
      }
      updatedForms[index] = form;
      return updatedForms;
    });
  };

  const handleBulkMark = async () => {
    if (!token) {
      console.error("Authentication token not found. Cannot mark attendance.");
      return;
    }
    try {
      const newRecords = bulkForm.filter((form) => form.status);
      const existingRecordsForDate = records.filter(
        (r) => r.date === format(selectedDate, "yyyy-MM-dd")
      );

      for (const form of newRecords) {
        let formattedCheckIn = form.checkIn;
        let formattedCheckOut = form.checkOut;
        let workingMinutes = 0;

        if (form.status !== "absent") {
          formattedCheckIn = ensureTimeFormat(form.checkIn);
          formattedCheckOut = ensureTimeFormat(form.checkOut);
          workingMinutes = calculateWorkingHours(
            formattedCheckIn,
            formattedCheckOut
          );
        } else {
          formattedCheckIn = "00:00:00.000";
          formattedCheckOut = "00:00:00.000";
        }

        const payload = {
          employee: form.employeeid,
          checkIn: formattedCheckIn,
          checkOut: formattedCheckOut,
          status: form.status,
          workingHours: `${Math.floor(workingMinutes / 60)}:${
            workingMinutes % 60 < 10 ? "0" : ""
          }${workingMinutes % 60}`,
          date: dayjs(form.date).format("YYYY-MM-DD"),
        };

        const existingRecord = existingRecordsForDate.find(
          (r) => String(r.employee.id) === form.employeeid
        );

        if (existingRecord && form.id) {
          await axios.put(`${API_URL}/${form.id}`, { data: payload }, authConfig); // Apply authConfig here
        } else if (!existingRecord) {
          await axios.post(API_URL, { data: payload }, authConfig); // Apply authConfig here
        } else if (existingRecord && !form.id) {
          // Use a custom message box instead of alert
          console.warn(
            `Attendance for ${
              employees.find((e) => String(e.id) === form.employeeid)?.name
            } on this date already exists.`
          );
          // You might want to display this message in a UI element
        }
      }

      // Use a custom message box instead of alert
      console.log("Attendance records updated successfully!");
      setBulkDialogOpen(false);
      fetchRecords(selectedDate);
    } catch (err) {
      console.error("Submit error:", err);
      // Use a custom message box instead of alert
      console.error("Error saving attendance. Check console for details.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      console.error("Authentication token not found. Cannot delete record.");
      return;
    }
    // Implement a custom confirmation dialog here instead of `confirm`
    const isConfirmed = window.confirm("Are you sure you want to delete this record?"); // For demonstration, keeping `confirm`. Replace with custom UI.
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API_URL}/${id}`, authConfig); // Apply authConfig here
      // Use a custom message box instead of alert
      console.log("Record deleted");
      fetchRecords(selectedDate);
    } catch (err) {
      console.error("Delete error:", err);
      // Use a custom message box instead of alert
      console.error("Error deleting attendance");
    }
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditForm({
      checkIn: record.status === "absent" ? "" : record.checkIn?.slice(0, 5) || "",
      checkOut: record.status === "absent" ? "" : record.checkOut?.slice(0, 5) || "",
      status: record.status,
    });
    setEditDialogOpen(true);
  };
  
  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    if (!token) {
      console.error("Authentication token not found. Cannot update record.");
      return;
    }
    try {
      let formattedCheckIn = editForm.checkIn;
      let formattedCheckOut = editForm.checkOut;
      let workingMinutes = 0;
  
      if (editForm.status !== "absent") {
        formattedCheckIn = ensureTimeFormat(editForm.checkIn);
        formattedCheckOut = ensureTimeFormat(editForm.checkOut);
        workingMinutes = calculateWorkingHours(formattedCheckIn, formattedCheckOut);
      } else {
        formattedCheckIn = "00:00:00.000";
        formattedCheckOut = "00:00:00.000";
      }
  
      const payload = {
        data: {
          checkIn: formattedCheckIn,
          checkOut: formattedCheckOut,
          status: editForm.status,
          workingHours: `${Math.floor(workingMinutes / 60)}:${
            workingMinutes % 60 < 10 ? "0" : ""
          }${workingMinutes % 60}`,
        },
      };
      
      await axios.put(`${API_URL}/${editingRecord.id}`, payload, authConfig); // Apply authConfig here
      
      // Use a custom message box instead of alert
      console.log("Record updated successfully!");
      setEditDialogOpen(false);
      fetchRecords(selectedDate);
      
    } catch (err) {
      console.error("Update error:", err);
      // Use a custom message box instead of alert
      console.error("Error updating record. Check console for details.");
    }
  };

  const handleEditFormChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "status" && value === "absent") {
        updated.checkIn = "";
        updated.checkOut = "";
      } else if ((field === "checkIn" || field === "checkOut") && value !== "") {
        if (updated.status === "absent") {
          updated.status = "present";
        }
      }
      return updated;
    });
  };

  const iconOf = (s: string) =>
    s === "present" ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : s === "late" ? (
      <AlertCircle className="h-4 w-4 text-yellow-500" />
    ) : s === "absent" ? (
      <XCircle className="h-4 w-4 text-red-600" />
    ) : (
      <Clock className="h-4 w-4 text-muted-foreground" />
    );

  const badgeOf = (s: string) => {
    const variant =
      s === "present" ? "default" : s === "late" ? "secondary" : "destructive";
    return <Badge variant={variant as any}>{s}</Badge>;
  };

  const openBulkAttendanceDialog = () => {
    const date = format(selectedDate, "yyyy-MM-dd");
    
    const initialForms = employees.map((emp) => {
        const existingRecord = records.find(r => r.employee.id === emp.id && r.date === date);
        if (existingRecord) {
            return {
                id: existingRecord.id,
                employeeid: String(emp.id),
                checkIn: existingRecord.status === "absent" ? "" : existingRecord.checkIn?.slice(0, 5) || "",
                checkOut: existingRecord.status === "absent" ? "" : existingRecord.checkOut?.slice(0, 5) || "",
                status: existingRecord.status,
                date: date,
            };
        }
        return {
            employeeid: String(emp.id),
            checkIn: "",
            checkOut: "",
            status: "",
            date: date,
        };
    });
    setBulkForm(initialForms);
    setBulkDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Attendance</h1>
          <p className="text-muted-foreground">Select date and manage attendance</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openBulkAttendanceDialog}>
                <Clock className="mr-2 h-4 w-4" /> Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Mark Daily Attendance</DialogTitle>
                <DialogDescription>
                  Enter attendance details for all employees for{" "}
                  {format(selectedDate, "PPPP")}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead className="w-[150px]">Check In</TableHead>
                        <TableHead className="w-[150px]">Check Out</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkForm.map((form, index) => {
                        const employee = employees.find(
                          (emp) => String(emp.id) === form.employeeid
                        );
                        const isExisting = records.some(
                          (r) =>
                            r.employee.id === employee?.id &&
                            r.date === format(selectedDate, "yyyy-MM-dd")
                        );
                        const isTimeEntered = form.checkIn || form.checkOut;

                        if (!employee) return null;

                        return (
                          <TableRow
                            key={employee.id}
                            className={
                              isExisting
                                ? "bg-gray-100 dark:bg-gray-800"
                                : ""
                            }
                          >
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span>{employee.name}</span>
                                {isExisting && <Badge variant="secondary">Marked</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {employee.department}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                name="checkIn"
                                value={form.checkIn}
                                onChange={(e) =>
                                  handleBulkFormChange(
                                    index,
                                    "checkIn",
                                    e.target.value
                                  )
                                }
                                disabled={form.status === "absent" || isExisting}
                                placeholder="HH:MM"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                name="checkOut"
                                value={form.checkOut}
                                onChange={(e) =>
                                  handleBulkFormChange(
                                    index,
                                    "checkOut",
                                    e.target.value
                                  )
                                }
                                disabled={form.status === "absent" || isExisting}
                                placeholder="HH:MM"
                              />
                            </TableCell>
                            <TableCell>
                              <select
                                value={form.status}
                                name="status"
                                onChange={(e) =>
                                  handleBulkFormChange(
                                    index,
                                    "status",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 border rounded-md"
                                disabled={isExisting}
                              >
                                <option value="">Select Status</option>
                                <option value="present">Present</option>
                                <option value="late">Late</option>
                                <option value="absent" disabled={isTimeEntered}>
                                  Absent
                                </option>
                              </select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <Button className="w-full" onClick={handleBulkMark}>
                  Submit Attendance
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {["Total", "Present", "Late", "Absent"].map((label) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              {label === "Total" ? (
                <Clock className="h-4 w-4 text-muted-foreground" />
              ) : label === "Present" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : label === "Late" ? (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  label === "Present"
                    ? "text-green-600"
                    : label === "Total"
                    ? "text-black-600"
                    : label === "Late"
                    ? "text-yellow-500"
                    : label === "Absent"
                    ? "text-red-600"
                    : ""
                )}
              >
                {label === "Total"
                  ? stats.total
                  : label === "Present"
                  ? stats.present
                  : label === "Late"
                  ? stats.late
                  : stats.absent}
              </div>

              <p className="text-xs text-muted-foreground">
                {label !== "Total" && stats.total
                  ? `${Math.round(
                      ((label === "Present"
                        ? stats.present
                        : label === "Late"
                        ? stats.late
                        : stats.absent) /
                        stats.total) *
                        100
                    )}%`
                  : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>Records for {format(selectedDate, "PPPP")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emp ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Working Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records
                .sort(
                  (a, b) =>
                    Number(a.employee?.employeeid || 0) -
                    Number(b.employee?.employeeid || 0)
                )
                .map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.employee.employeeid}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {iconOf(r.status)} {r.employee.name}
                    </TableCell>
                    <TableCell>{r.employee.department}</TableCell>
                    <TableCell>
                      {formatTimeWithMeridian(r.checkIn, r.status)}
                    </TableCell>
                    <TableCell>
                      {formatTimeWithMeridian(r.checkOut, r.status)}
                    </TableCell>
                    <TableCell>
                      {formatWorkingHours(r.workingHours, r.status)}
                    </TableCell>
                    <TableCell>{badgeOf(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-all duration-200"
                          onClick={() => handleEditClick(r)}
                          title="Edit Record"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-100 transition-all duration-200"
                          onClick={() => handleDelete(r.id)}
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Editing record for **{editingRecord?.employee?.name}** on **
              {format(selectedDate, "PPP")}**.
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="checkIn">Check In</Label>
                <Input
                  id="checkIn"
                  value={editForm.checkIn}
                  onChange={(e) => handleEditFormChange("checkIn", e.target.value)}
                  disabled={editForm.status === "absent"}
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <Label htmlFor="checkOut">Check Out</Label>
                <Input
                  id="checkOut"
                  value={editForm.checkOut}
                  onChange={(e) => handleEditFormChange("checkOut", e.target.value)}
                  disabled={editForm.status === "absent"}
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => handleEditFormChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent" disabled={editForm.checkIn !== "" || editForm.checkOut !== ""}>
                      Absent
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleUpdateRecord}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}