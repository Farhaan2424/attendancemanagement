"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useUser } from "@/context/UserContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Loader2, Plus, Calendar as CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import qs from "qs";

const leaveRequestSchema = z
  .object({
    leaveType: z.string().min(1, "Leave type is required."),
    reason: z.string().min(10, "Reason must be at least 10 characters."),
    startDate: z.preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    }, z.date({ required_error: "A start date is required." })),
    endDate: z.preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    }, z.date({ required_error: "An end date is required." })),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
  });

const MyLeaveRequests = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const API_BASE_URL = "http://localhost:1337/api";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const form = useForm({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: "",
      reason: "",
      startDate: new Date(),
      endDate: new Date(),
    },
  });

  const fetchMyLeaveData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!user || !token) {
        setError("User not authenticated.");
        return;
      }

      const employeeQuery = qs.stringify(
        {
          filters: {
            users_permissions_user: {
              id: {
                $eq: user.id,
              },
            },
          },
          populate: ["department"],
        },
        { encodeValuesOnly: true }
      );

      const employeeRes = await axios.get(
        `${API_BASE_URL}/employees?${employeeQuery}`,
        authConfig
      );
      const employee = employeeRes.data.data?.[0];

      if (!employee) {
        setError("Employee profile not found for this user.");
        setLeaveRequests([]);
        return;
      }
      setEmployeeDetails(employee);

      const leaveRequestQuery = qs.stringify(
        {
          filters: { employee: { id: { $eq: employee.id } } },
          populate: ["employee"],
        },
        { encodeValuesOnly: true }
      );

      const leaveRequestsRes = await axios.get(
        `${API_BASE_URL}/leave-requests?${leaveRequestQuery}`,
        authConfig
      );
      setLeaveRequests(leaveRequestsRes.data.data);
    } catch (err) {
      console.error("Error fetching my leave requests:", err);
      setError("Failed to fetch leave requests. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchMyLeaveData();
    } else {
      setError("User not authenticated.");
      setIsLoading(false);
    }
  }, [user, token]);

  const handleCreateLeaveRequest = async (values) => {
    setIsFormLoading(true);
    setError(null);
    try {
      if (!employeeDetails) {
        throw new Error("Employee details not found.");
      }

      const payload = {
        data: {
          leaveType: values.leaveType,
          reason: values.reason,
          startDate: format(values.startDate, "yyyy-MM-dd"),
          endDate: format(values.endDate, "yyyy-MM-dd"),
          status: "pending",
          employee: employeeDetails.id,
        },
      };

      await axios.post(`${API_BASE_URL}/leave-requests`, payload, authConfig);
      toast({
        title: "Success!",
        description: "Your leave request has been submitted.",
      });
      form.reset();
      setIsDialogOpen(false);
      fetchMyLeaveData();
    } catch (err) {
      console.error(
        "Error creating leave request:",
        err.response?.data || err.message
      );
      toast({
        title: "Error",
        description: `Failed to create leave request: ${
          err.response?.data?.error?.message || "Please try again."
        }`,
        variant: "destructive",
      });
      setError("Failed to create leave request. Please try again.");
    } finally {
      setIsFormLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        <CardHeader className="flex flex-row items-center justify-between p-6 bg-gray-50 border-b rounded-t-xl">
          <CardTitle className="text-2xl font-bold text-gray-900">
            My Leave Requests
          </CardTitle>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Leave Request
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests.length > 0 ? (
                leaveRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.attributes?.employee?.data?.attributes
                        ?.employeeid || "N/A"}
                    </TableCell>
                    <TableCell>
                      {request.attributes?.employee?.data?.attributes?.name ||
                        "N/A"}
                    </TableCell>
                    <TableCell>{request.attributes.leaveType}</TableCell>
                    <TableCell>
                      {format(new Date(request.attributes.startDate), "PPP")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.attributes.endDate), "PPP")}
                    </TableCell>
                    <TableCell>{request.attributes.reason}</TableCell>
                    <TableCell>
                      {getStatusBadge(request.attributes.status)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateLeaveRequest)}>
              <DialogHeader>
                <DialogTitle>New Leave Request</DialogTitle>
                <DialogDescription>
                  Fill out the form below to submit a new leave request.
                </DialogDescription>
              </DialogHeader>

              {employeeDetails && (
                <div className="space-y-2 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    Employee Details
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Name:</span>{" "}
                    {employeeDetails.attributes?.name || "N/A"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Employee ID:</span>{" "}
                    {employeeDetails.attributes?.employeeid || "N/A"}
                  </p>
                </div>
              )}

              <div className="py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="leaveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a leave type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Casual Leave">
                            Casual Leave
                          </SelectItem>
                          <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                          <SelectItem value="Vacation">Vacation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < form.getValues("startDate")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explain your reason for the leave..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isFormLoading}>
                  {isFormLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyLeaveRequests;
