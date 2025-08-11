'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Check, Clock, FileText, X, AlertCircle, CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface Justification {
  id: number;
  attributes: {
    date: string;
    type: string;
    time: string | null;
    reason: any[];
    status: 'pending' | 'approved' | 'rejected';
    submittedDate: string;
    employee: {
      data: {
        id: number;
        attributes: {
          name: string;
          employeeid: string;
          department: string;
        };
      } | null;
    };
  };
}

interface Employee {
  id: number;
  attributes: {
    name: string;
    employeeid: string;
    department: string;
  };
}

// Custom toast-like function since an actual toast component is not provided in the code.
const showCustomToast = (title: string, description: string, variant: string = 'default') => {
  console.log(`[Toast ${variant.toUpperCase()}] ${title}: ${description}`);
};

export default function Justifications() {
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Justification | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [justificationToUpdate, setJustificationToUpdate] = useState<{ id: number, status: 'approved' | 'rejected' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    employee: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Late Arrival',
    time: '09:00',
    reason: '',
  });

  // CORRECTED: Hardcoding the role to "manager" to demonstrate the restricted view.
  // Change this to "admin" or "hr" to see the full functionality.
  const [userRole, setUserRole] = useState("manager");

  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      console.error("Authentication token not found. Cannot fetch data.");
    }
  }, [token]);

  async function fetchData() {
    if (!token) {
      console.error("Authentication token not found. Aborting fetchData.");
      return;
    }
    setIsLoading(true);
    try {
      const [justRes, empRes] = await Promise.all([
        axios.get('http://localhost:1337/api/justifications?populate=employee', authConfig),
        axios.get('http://localhost:1337/api/employees', authConfig)
      ]);

      let fetchedJustifications: Justification[] = justRes.data.data;

      fetchedJustifications.sort((a, b) => {
        const empIdA = a.attributes.employee?.data?.attributes?.employeeid;
        const empIdB = b.attributes.employee?.data?.attributes?.employeeid;

        if (empIdA && empIdB) {
          return parseInt(empIdA) - parseInt(empIdB);
        }
        if (empIdA) return -1;
        if (empIdB) return 1;
        return 0;
      });

      setJustifications(fetchedJustifications);
      setEmployees(empRes.data.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      showCustomToast("Error", "Failed to load data. Please check your API endpoints and network connection.", "destructive");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit() {
    // Only allow managers to submit a justification.
    if (userRole !== "manager") {
      alert("You don't have access to this feature.");
      setIsAddDialogOpen(false);
      return;
    }

    if (!token) {
      console.error("Authentication token not found. Cannot submit justification.");
      return;
    }
    if (!formData.employee || !formData.date || !formData.type || !formData.reason) {
      showCustomToast("Warning", "Please fill in all required fields.");
      return;
    }

    const payload = {
      data: {
        employee: parseInt(formData.employee),
        date: formData.date,
        type: formData.type,
        time: formData.type === 'Absence' ? null : (formData.time + ':00.000'),
        reason: [{ type: 'paragraph', children: [{ type: 'text', text: formData.reason }] }],
        status: 'pending',
        submittedDate: format(new Date(), 'yyyy-MM-dd'),
      }
    };

    try {
      await axios.post('http://localhost:1337/api/justifications', payload, authConfig);
      showCustomToast("Success", "Justification submitted successfully!");
      setIsAddDialogOpen(false);
      setFormData({
        employee: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'Late Arrival',
        time: '09:00',
        reason: '',
      });
      fetchData();
    } catch (err) {
      console.error("Error submitting justification:", err);
      showCustomToast("Error", "Failed to submit justification. Check console for details.", "destructive");
    }
  }

  const handleUpdateStatus = async () => {
    // Only allow managers to approve/reject justifications.
    if (userRole !== "manager") {
      alert("You don't have access to this feature.");
      setIsConfirmDialogOpen(false);
      return;
    }

    if (!justificationToUpdate || !token) {
      return;
    }

    const { id, status } = justificationToUpdate;

    try {
      await axios.put(`http://localhost:1337/api/justifications/${id}`, {
        data: { status },
      }, authConfig);
      showCustomToast("Success", `Justification ${status} successfully!`);
      fetchData();
    } catch (err) {
      console.error(`Error updating status to ${status}:`, err);
      showCustomToast("Error", `Failed to ${status} justification. Check console for details.`, "destructive");
    } finally {
      setIsConfirmDialogOpen(false);
      setJustificationToUpdate(null);
    }
  };

  const formatReason = (reason: any[] | null | undefined) => {
    if (!reason || !Array.isArray(reason) || reason.length === 0) {
      return '';
    }
    const firstParagraph = reason[0];
    if (firstParagraph && firstParagraph.type === 'paragraph' && firstParagraph.children && firstParagraph.children.length > 0) {
      const textChild = firstParagraph.children.find((child: any) => child.type === 'text');
      return textChild ? textChild.text : '';
    }
    return '';
  };

  const getStatusBadge = (status: Justification['attributes']['status']) => {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">{statusText}</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">{statusText}</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">{statusText}</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: Justification['attributes']['status']) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Late Arrival':
      case 'Early Departure':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'Absence':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const pendingCount = justifications.filter(j => j.attributes.status === 'pending').length;
  const approvedCount = justifications.filter(j => j.attributes.status === 'approved').length;
  const rejectedCount = justifications.filter(j => j.attributes.status === 'rejected').length;

  // The isAllowedToCreateRequest flag now correctly checks for the "manager" role.
  const isAllowedToCreateRequest = userRole === "manager";
  const isAllowedToUpdateStatus = userRole === "manager";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Absence/Late Justifications</h1>
          <p className="text-muted-foreground">Manage employee justifications for late arrivals and absences</p>
        </div>
        {isAllowedToCreateRequest && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Submit Justification
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Submit Justification</DialogTitle>
                <DialogDescription>
                  Provide your reason for being late or absent.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Employee</Label>
                  <select
                    className="col-span-3 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.employee}
                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                  >
                    <option value="">Select</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.attributes.name} - {emp.attributes.employeeid} - {emp.attributes.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "col-span-3 justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(parseISO(formData.date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseISO(formData.date)}
                        onSelect={(date) => setFormData({ ...formData, date: date ? format(date, 'yyyy-MM-dd') : '' })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Type</Label>
                  <select
                    className="col-span-3 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Late Arrival">Late Arrival</option>
                    <option value="Early Departure">Early Departure</option>
                    <option value="Absence">Absence</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Time</Label>
                  <Input
                    type="time"
                    className="col-span-3 px-3 py-2 border rounded-md"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    disabled={formData.type === 'Absence'}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Reason</Label>
                  <Textarea
                    className="col-span-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Write your reason..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSubmit}>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {["pending", "approved", "rejected"].map(status => (
          <Card key={status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{status[0].toUpperCase() + status.slice(1)}</CardTitle>
              {status === 'pending' ? <Clock className="h-4 w-4 text-yellow-500" /> : status === 'approved' ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${status === 'approved' ? 'text-green-600' : status === 'rejected' ? 'text-red-600' : ''}`}>
                {justifications.filter(j => j.attributes.status === status).length}
              </div>
              <p className="text-xs text-muted-foreground">{status === 'pending' ? 'Awaiting approval' : 'Total this month'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Justification Requests</CardTitle>
          <p className="text-sm text-muted-foreground">All submitted justifications and their status</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead>Id</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {justifications.length > 0 ? (
                  justifications.map((j) => (
                    <TableRow key={j.id}>
                       <TableCell>{j.attributes.employee?.data?.attributes?.employeeid || 'N/A'}</TableCell>
                      <TableCell>{j.attributes.employee?.data?.attributes?.name || 'N/A'}</TableCell>
                      <TableCell>{dayjs(j.attributes.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(j.attributes.type)}
                          <span>{j.attributes.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {j.attributes.type === 'Absence' ? 'Full Day' : (j.attributes.time ? dayjs(`2020-01-01T${j.attributes.time}`).format('h:mm A') : 'N/A')}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">{formatReason(j.attributes.reason)}</div>
                        <Button variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => setSelected(j)}>
                          View full reason
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(j.attributes.status)}
                          {getStatusBadge(j.attributes.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAllowedToUpdateStatus && j.attributes.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => {
                                setJustificationToUpdate({ id: j.id, status: 'approved' });
                                setIsConfirmDialogOpen(true);
                              }} className="bg-green-500 hover:bg-green-600 text-white">
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => {
                                setJustificationToUpdate({ id: j.id, status: 'rejected' });
                                setIsConfirmDialogOpen(true);
                              }}>
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No actions</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No justifications found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justification Details</DialogTitle>
            <DialogDescription>Full details of the justification request</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Employee Name:</Label>
                <p className="text-sm">{selected.attributes.employee?.data?.attributes?.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Employee ID:</Label>
                <p className="text-sm">{selected.attributes.employee?.data?.attributes.employeeid || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Date:</Label>
                <p className="text-sm">{dayjs(selected.attributes.date).format('DD/MM/YYYY')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Type:</Label>
                <p className="text-sm">{selected.attributes.type}</p>
              </div>
              {selected.attributes.type !== 'Absence' && (
                <div>
                  <Label className="text-sm font-medium">Time:</Label>
                  <p className="text-sm">{selected.attributes.time ? dayjs(`2020-01-01T${selected.attributes.time}`).format('h:mm A') : 'N/A'}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Status:</Label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selected.attributes.status)}
                  {getStatusBadge(selected.attributes.status)}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Submitted On:</Label>
                <p className="text-sm">{dayjs(selected.attributes.submittedDate).format('DD/MM/YYYY')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Full Reason:</Label>
                <p className="text-sm border p-3 rounded-md bg-muted/50">{formatReason(selected.attributes.reason)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {justificationToUpdate?.status}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUpdateStatus}
              className={justificationToUpdate?.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
