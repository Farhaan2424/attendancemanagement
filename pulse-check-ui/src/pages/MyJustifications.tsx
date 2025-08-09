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
import { Input } from "@/components/ui/input";
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

const justificationSchema = z.object({
  type: z.enum(["Late Arrival", "Early Departure", "Absence"]),
  time: z.string().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters."),
  date: z.date({
    required_error: "A justification date is required.",
  }),
}).refine(
  (data) => {
    if (data.type !== "Absence") {
      return !!data.time;
    }
    return true;
  },
  {
    message: "Time is required for late arrival or early departure.",
    path: ["time"],
  }
).refine(
  (data) => {
    const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (data.type !== "Absence" && data.time) {
      return timeRegex.test(data.time);
    }
    return true;
  },
  {
    message: "Time must be in HH:mm format.",
    path: ["time"],
  }
);

const MyJustifications = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [justifications, setJustifications] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");

  const API_BASE_URL = "http://localhost:1337/api";
  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  const authConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }), [token]);

  const form = useForm({
    resolver: zodResolver(justificationSchema),
    defaultValues: {
      type: "",
      time: "",
      reason: "",
      date: new Date(),
    },
  });

  const fetchMyJustifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!user || !token) {
        setError("User not authenticated.");
        setIsLoading(false);
        return;
      }

      const employeeQuery = qs.stringify({
        filters: {
          users_permissions_user: {
            id: { $eq: user.id }
          }
        },
        populate: ['department']
      }, { encodeValuesOnly: true });

      const employeeRes = await axios.get(
        `${API_BASE_URL}/employees?${employeeQuery}`,
        authConfig
      );
      const employee = employeeRes.data.data?.[0];
      if (!employee) {
        setError("Employee profile not found for this user.");
        setJustifications([]);
        setIsLoading(false);
        return;
      }
      setEmployeeDetails(employee);

      const justificationQuery = qs.stringify({
        filters: {
          employee: {
            id: { $eq: employee.id }
          }
        },
       
        populate: ['employee']
      }, { encodeValuesOnly: true });

      const justificationsRes = await axios.get(
        `${API_BASE_URL}/justifications?${justificationQuery}`,
        authConfig
      );

      setJustifications(justificationsRes.data.data);

    } catch (err) {
      console.error("Error fetching my justifications:", err);
      setError("Failed to fetch justifications. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchMyJustifications();
    } else {
      setError("User not authenticated.");
      setIsLoading(false);
    }
  }, [user, token]);

  const handleCreateJustification = async (values) => {
    setIsFormLoading(true);
    setError(null);
    try {
      if (!employeeDetails) {
        throw new Error("Employee details not found.");
      }

      const formattedTime = values.type === "Absence" ? null : `${values.time}:00.000`;

      const payload = {
        data: {
          type: values.type,
         
          reason: [{ type: 'paragraph', children: [{ type: 'text', text: values.reason }] }],
          date: format(values.date, "yyyy-MM-dd"),
          status: "pending",
          time: formattedTime, 
          employee: employeeDetails.id, 
        },
      };

      console.log("Submitting new justification with payload:", payload);

      await axios.post(`${API_BASE_URL}/justifications`, payload, authConfig);
      toast({
        title: "Success!",
        description: "Your justification request has been submitted.",
      });
      form.reset();
      setIsDialogOpen(false);
      fetchMyJustifications(); 
    } catch (err) {
      
      console.error("Error creating justification:", err);
      if (err.response) {
        
        console.error("Server response data:", err.response.data);
        console.error("Server response status:", err.response.status);
        console.error("Server response headers:", err.response.headers);

        toast({
          title: "Error",
          description: `Failed to create justification: ${err.response.data?.error?.message || "Please check the console for details."}`,
          variant: "destructive",
        });
      } else if (err.request) {
        
        toast({
          title: "Error",
          description: "Failed to create justification: No response from server. Please check your network connection.",
          variant: "destructive",
        });
      } else {
       
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
      setError("Failed to create justification. Please try again.");
    } finally {
      setIsFormLoading(false);
    }
  };

  const extractTextFromRichText = (richText) => {
    if (!Array.isArray(richText)) return 'N/A';

    return richText
      .map((block) =>
        block?.children?.map((child) => child.text).join(' ')
      )
      .join('\n');
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const getStatusBadge = (status) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500 text-white">Approved</Badge>;
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
            My Justifications
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Justification
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {justifications.length > 0 ? (
                justifications.map((justification) => (
                  <TableRow key={justification.id}>
                    <TableCell>{justification.attributes?.employee?.data?.attributes?.employeeid || 'N/A'}</TableCell>
                    <TableCell>{justification.attributes?.employee?.data?.attributes?.name || 'N/A'}</TableCell>
                    <TableCell className="font-medium">
                      {justification.attributes && format(new Date(justification.attributes.date), "PPP")}
                    </TableCell>
                    <TableCell>{justification.attributes && justification.attributes.type}</TableCell>
                    <TableCell>{justification.attributes && formatTime(justification.attributes.time)}</TableCell>
                    <TableCell>
                      {justification.attributes && extractTextFromRichText(justification.attributes.reason)}
                    </TableCell>
                    <TableCell>{justification.attributes && getStatusBadge(justification.attributes.status)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No justification requests found.
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
            <form onSubmit={form.handleSubmit(handleCreateJustification)}>
              <DialogHeader>
                <DialogTitle>New Justification Request</DialogTitle>
                <DialogDescription>
                  Fill out the form below to submit a new justification.
                </DialogDescription>
              </DialogHeader>

              {employeeDetails && (
                <div className="space-y-2 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Employee Details</p>
                  <p className="text-sm">
                    <span className="font-semibold">Name:</span>{" "}
                    {employeeDetails.attributes?.name || "N/A"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Employee ID:</span>{" "}
                    {employeeDetails.attributes?.employeeid || "N/A"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Department:</span>{" "}
                    {employeeDetails.attributes?.department || "N/A"}
                  </p>
                </div>
              )}

              <div className="py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedType(value);
                          if (value === "Absence") {
                            form.setValue("time", "");
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select justification type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Late Arrival">Late Arrival</SelectItem>
                          <SelectItem value="Early Departure">Early Departure</SelectItem>
                          <SelectItem value="Absence">Absence</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (HH:mm)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 09:30"
                          disabled={selectedType === "Absence"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Justification Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"
                                }`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
                        <Textarea placeholder="Explain your reason for the justification..." className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isFormLoading}>
                  {isFormLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

export default MyJustifications;
