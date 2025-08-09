"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useUser } from "@/context/UserContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import qs from "qs";

const MyProfile = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [employeeData, setEmployeeData] = useState(null);
  const [editableData, setEditableData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:1337/api";
  const token = typeof window !== 'undefined' ? localStorage.getItem("jwt_token") : null;

  const authConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }), [token]);

  const fetchMyProfile = async () => {
    if (!user?.id || !token) {
      setIsLoading(false);
      setError("User data or authentication token not available. Please log in again.");
      return;
    }

    const query = qs.stringify(
      {
        filters: {
          users_permissions_user: {
            id: {
              $eq: user.id,
            },
          },
        },
        populate: ['users_permissions_user', 'department'],
      },
      { encodeValuesOnly: true }
    );

    try {
      const res = await axios.get(
        `${API_BASE_URL}/employees?${query}`,
        authConfig
      );
      if (res.data.data.length > 0) {
        const data = res.data.data[0];
        setEmployeeData({ ...data.attributes, id: data.id });
        setEditableData({ ...data.attributes }); 
      } else {
        setError("Employee data not found for the logged-in user.");
      }
    } catch (err) {
      console.error("Error fetching my profile:", err);
      setError("Failed to fetch profile data. This is likely a backend permissions issue.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProfile();
  }, [user, authConfig, token, API_BASE_URL]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
   
    setEditableData({ ...employeeData });
  };

  const handleSaveClick = async () => {
    if (!employeeData || !editableData) return;
    setIsSaving(true);
    try {
      const payload = {
        data: {
          accountHolderName: editableData.accountHolderName,
          bankName: editableData.bankName,
          ifsc: editableData.ifsc,
          accountNumber: editableData.accountNumber,
          accountType: editableData.accountType,
          paymentMode: editableData.paymentMode,
        },
      };

      await axios.put(`${API_BASE_URL}/employees/${employeeData.id}`, payload, authConfig);
      
      toast({
        title: "Success",
        description: "Payment information updated successfully.",
      });
     
      await fetchMyProfile();
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditableData((prev) => ({ ...prev, [name]: value }));
  };

  const renderPaymentInfo = () => {
    if (isEditing) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Payment Mode</Label>
            <Input name="paymentMode" value={editableData.paymentMode || ""} onChange={handleChange} className="border-gray-300" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Account Holder Name</Label>
            <Input name="accountHolderName" value={editableData.accountHolderName || ""} onChange={handleChange} className="border-gray-300" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Bank Name</Label>
            <Input name="bankName" value={editableData.bankName || ""} onChange={handleChange} className="border-gray-300" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">IFSC</Label>
            <Input name="ifsc" value={editableData.ifsc || ""} onChange={handleChange} className="border-gray-300" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Account Type</Label>
            <Input name="accountType" value={editableData.accountType || ""} onChange={handleChange} className="border-gray-300" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Account Number</Label>
            <Input name="accountNumber" value={editableData.accountNumber || ""} onChange={handleChange} className="border-gray-300" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Payment Mode</Label>
          <Input value={employeeData.paymentMode || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Account Holder Name</Label>
          <Input value={employeeData.accountHolderName || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Bank Name</Label>
          <Input value={employeeData.bankName || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">IFSC</Label>
          <Input value={employeeData.ifsc || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Account Type</Label>
          <Input value={employeeData.accountType || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Account Number</Label>
          <div className="flex items-center">
            <Input
              value={showPaymentInfo ? employeeData.accountNumber : "XXXXXXXXXX"}
              readOnly
              className="bg-gray-100 border-gray-200 flex-grow"
            />
            <Button
              variant="link"
              className="text-blue-600 ml-2"
              onClick={() => setShowPaymentInfo(!showPaymentInfo)}
            >
              {showPaymentInfo ? "Hide A/C No" : "Show A/C No"}
            </Button>
          </div>
        </div>
      </div>
    );
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

  if (!employeeData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">No profile data available.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between p-6 bg-gray-50 border-b rounded-t-xl">
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={employeeData.profilePictureUrl || "/placeholder-avatar.png"} alt={`${employeeData.name}'s avatar`} />
                  <AvatarFallback className="bg-blue-600 text-white text-3xl font-bold">
                    {employeeData.name?.[0]?.toUpperCase() || "E"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left">
                  <CardTitle className="text-3xl font-bold text-gray-900">
                    {employeeData.name}
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    {employeeData.position}
                  </CardDescription>
                  <Badge variant="secondary" className="mt-2 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                    Employee ID: {employeeData.employeeid}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-800">Basic Information</h3>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Full Name</Label>
                  <Input value={employeeData.name || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Email</Label>
                  <Input value={employeeData.email || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Phone</Label>
                  <Input value={employeeData.phone || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Date of Joining</Label>
                  <Input value={employeeData.joinDate || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Department</Label>
                  <Input value={employeeData.department?.data?.attributes?.name || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Position</Label>
                  <Input value={employeeData.position || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Office Location</Label>
                  <Input value={employeeData.officeLocation || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Gender</Label>
                  <Input value={employeeData.gender || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Monthly CTC</Label>
                  <Input value={`${employeeData.monthly_ctc?.toFixed() || "0.00"}`} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Status</Label>
                  <Input value={employeeData.status || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-800">Personal Information</h3>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Date of Birth</Label>
                  <Input value={employeeData.dob || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Father's Name</Label>
                  <Input value={employeeData.fathersName || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">PAN</Label>
                  <Input value={employeeData.pan || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Residential Address</Label>
                  <Input value={employeeData.residentialAddress || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Personal Email</Label>
                  <Input value={employeeData.personalEmail || "N/A"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Differently Abled</Label>
                  <Input value={employeeData.differentlyAbled || "None"} readOnly className="bg-gray-100 border-gray-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between p-6 bg-gray-50 border-b rounded-t-xl">
              <CardTitle className="text-xl font-bold">Payment Information</CardTitle>
              {!isEditing && (
                <Button onClick={handleEditClick} variant="ghost" size="icon">
                  <Pencil className="h-5 w-5 text-gray-500" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {renderPaymentInfo()}
            </CardContent>
            {isEditing && (
              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <Button variant="outline" onClick={handleCancelClick}>Cancel</Button>
                <Button onClick={handleSaveClick} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;