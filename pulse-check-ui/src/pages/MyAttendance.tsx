import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import qs from "qs";
import { useUser } from "@/context/UserContext";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

const MyAttendance = () => {
  const { user } = useUser();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [date, setDate] = useState(() => {
    // Try to get the saved date from localStorage
    const savedDate = localStorage.getItem("myAttendanceDate");
    
    return savedDate ? new Date(savedDate) : new Date();
  });

  const API_BASE_URL = "http://localhost:1337/api";
  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  const authConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }), [token]);

  useEffect(() => {
    if (date) {
      localStorage.setItem("myAttendanceDate", date.toISOString());
    }
  }, [date]);

  useEffect(() => {
    const fetchAttendance = async () => {
      
      if (!user?.id || !token) {
        setIsLoading(false);
        setError("User data or authentication token not available. Please log in again.");
        return;
      }

      setIsLoading(true);
      setError(null);

      const formattedDate = format(date, "yyyy-MM-dd");

      const query = qs.stringify(
        {
          filters: {
            employee: {
              users_permissions_user: {
                id: {
                  $eq: user.id,
                },
              },
            },
            date: {
              $eq: formattedDate,
            },
          },
          populate: ['employee'], 
        },
        { encodeValuesOnly: true }
      );

      try {
        const res = await axios.get(
          `${API_BASE_URL}/attendances?${query}`,
          authConfig
        );
        console.log(res);

        if (res.data.data.length > 0) {
         
          const records = res.data.data.map(item => ({
            id: item.id,
            ...item.attributes,
          }));
          setAttendanceRecords(records);
        } else {
          setAttendanceRecords([]);
        }
      } catch (err) {
        console.error("Error fetching attendance records:", err);
        setError("Failed to fetch attendance data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [user, token, date, authConfig, API_BASE_URL]);

  const getStatusBadge = (status) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case "present":
        return <Badge variant="default" className="bg-green-500 text-white hover:bg-green-600">Present</Badge>;
      case "absent":
        return <Badge variant="destructive" className="hover:bg-red-600">Absent</Badge>;
      case "on leave":
        return <Badge variant="secondary" className="hover:bg-gray-200">On Leave</Badge>;
      default:
        return <Badge variant="outline" className="hover:bg-gray-50">{status}</Badge>;
    }
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
   
    return timeString.slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col md:flex-row items-center justify-between p-6 bg-gray-50 border-b rounded-t-xl">
          <div className="text-center md:text-left">
            <CardTitle className="text-3xl font-bold text-gray-900">My Attendance</CardTitle>
            <CardDescription className="text-lg text-gray-600 mt-2">
              View your attendance records filtered by date.
            </CardDescription>
          </div>
          <div className="mt-4 md:mt-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {attendanceRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Check-out Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell>{attendance.employee.data.attributes.employeeid}</TableCell>
                    <TableCell>{attendance.employee.data.attributes.name}</TableCell>
                    <TableCell className="font-medium">{format(new Date(attendance.date), "PPP")}</TableCell>
                    <TableCell>{getStatusBadge(attendance.status)}</TableCell>
                    <TableCell>{formatTime(attendance.checkIn)}</TableCell>
                    <TableCell>{formatTime(attendance.checkOut)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No attendance records found for this date.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAttendance;
