"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Upload, Plus, Check, Loader2 } from "lucide-react";
import { saveStage2Rep, removeStage2Rep } from "@/app/actions/issuer-onboarding";
import { useRouter } from "next/navigation";

const repSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  id_type: z.string().min(1, "ID type is required"),
  id_number: z.string().min(1, "ID number is required"),
  is_authorized_signatory: z.boolean().default(false),
  is_director: z.boolean().default(false),
  is_ubo: z.boolean().default(false),
  ubo_percentage: z.string().optional(),
  is_other: z.boolean().default(false),
  other_designation: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.is_ubo) {
    const num = parseFloat(data.ubo_percentage);
    if (isNaN(num) || num < 25 || num > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a number between 25 and 100",
        path: ["ubo_percentage"],
      });
    }
  }
  if (data.is_other && (!data.other_designation || data.other_designation.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the designation",
      path: ["other_designation"],
    });
  }
  if (!data.is_authorized_signatory && !data.is_director && !data.is_ubo && !data.is_other) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one designation must be selected",
      path: ["is_authorized_signatory"], // attach to the first checkbox
    });
  }
});

function RepForm({ rep, onSaved, onCancel }) {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(repSchema),
    defaultValues: {
      full_name: rep?.full_name || "",
      id_type: rep?.id_type || "",
      id_number: rep?.id_number || "",
      is_authorized_signatory: rep?.is_authorized_signatory || false,
      is_director: rep?.is_director || false,
      is_ubo: rep?.is_ubo || false,
      ubo_percentage: rep?.ubo_percentage ? rep.ubo_percentage.toString() : "",
      is_other: !!rep?.other_designation,
      other_designation: rep?.other_designation || "",
    }
  });

  const isUbo = watch("is_ubo");
  const isOther = watch("is_other");

  const [error, setError] = useState(null);

  const onSubmit = async (formData) => {
    // If no existing file and no new file selected, throw error
    if (!rep?.id_url && !file) {
      setFileError("Please upload an ID document");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) {
        // Enforce pdf or image
        if (!file.type.match(/^(image\/.*|application\/pdf)$/)) {
          setFileError("Only images or PDF files are allowed.");
          setIsSaving(false);
          return;
        }
        data.append("file", file);
      }
      if (rep?.id) {
        data.append("repId", rep.id);
      }

      await saveStage2Rep(data);
      onSaved();
    } catch (err) {
      console.error(err);
      setError("Failed to save representative. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}
      <p className="text-sm text-red-500 font-medium">* Indicates a required field</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
          <input type="text" {...register("full_name")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" />
          {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">ID Type <span className="text-red-500">*</span></label>
          <select {...register("id_type")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border">
            <option value="">Select ID Type</option>
            <option value="Passport">Passport</option>
            <option value="National ID">National ID</option>
            <option value="Driving License">Driving License</option>
          </select>
          {errors.id_type && <p className="mt-1 text-sm text-red-600">{errors.id_type.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">ID Number <span className="text-red-500">*</span></label>
          <input type="text" {...register("id_number")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" />
          {errors.id_number && <p className="mt-1 text-sm text-red-600">{errors.id_number.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Designation <span className="text-red-500">*</span></label>
        {errors.is_authorized_signatory && <p className="mb-2 text-sm text-red-600">{errors.is_authorized_signatory.message}</p>}
        <div className="space-y-4">
          <div className="flex items-center">
            <input type="checkbox" {...register("is_authorized_signatory")} className="h-4 w-4 text-[#064e3b] focus:ring-[#064e3b] border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">Authorized Signatory</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register("is_director")} className="h-4 w-4 text-[#064e3b] focus:ring-[#064e3b] border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">Director</label>
          </div>
          <div>
            <div className="flex items-center">
              <input type="checkbox" {...register("is_ubo")} className="h-4 w-4 text-[#064e3b] focus:ring-[#064e3b] border-gray-300 rounded" />
              <label className="ml-2 block text-sm text-gray-900">Beneficial Owner (25%+)</label>
            </div>
            {isUbo && (
              <div className="ml-6 mt-2">
                <input type="number" step="0.01" placeholder="Percentage (e.g. 25.5)" {...register("ubo_percentage")} className="block w-full sm:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" />
                {errors.ubo_percentage && <p className="mt-1 text-sm text-red-600">{errors.ubo_percentage.message}</p>}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center">
              <input type="checkbox" {...register("is_other")} className="h-4 w-4 text-[#064e3b] focus:ring-[#064e3b] border-gray-300 rounded" />
              <label className="ml-2 block text-sm text-gray-900">Other</label>
            </div>
            {isOther && (
              <div className="ml-6 mt-2">
                <input type="text" placeholder="Specify Designation" {...register("other_designation")} className="block w-full sm:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" />
                {errors.other_designation && <p className="mt-1 text-sm text-red-600">{errors.other_designation.message}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Upload ID Document (Image or PDF) <span className="text-red-500">*</span></label>
        <div className="mt-2 flex items-center gap-4">
          <input 
            type="file" 
            accept="image/*,.pdf" 
            ref={fileInputRef} 
            onChange={(e) => {
              setFile(e.target.files[0]);
              setFileError("");
            }} 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current.click()} 
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Upload size={16} className="mr-2" />
            {file ? file.name : (rep?.id_url ? "Change File" : "Select File")}
          </button>
          {!file && rep?.id_url && (
            <span className="text-sm text-green-600 flex items-center">
              <Check size={16} className="mr-1"/> Document on file
            </span>
          )}
        </div>
        {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="flex items-center px-4 py-2 bg-[#064e3b] text-white rounded-md text-sm font-medium hover:bg-[#064e3b]/90 disabled:opacity-50">
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Representative"}
        </button>
      </div>
    </form>
  );
}

export default function Stage2Reps({ reps, onUpdate, onNext, onBack }) {
  const router = useRouter();
  const [editingRep, setEditingRep] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(null);
  const [error, setError] = useState(null);

  const handleRefresh = async () => {
    router.refresh();
  };

  const handleRemove = async (id) => {
    setIsRemoving(id);
    setError(null);
    try {
      await removeStage2Rep(id);
      handleRefresh();
    } catch (err) {
      console.error(err);
      setError("Failed to remove representative. Please try again.");
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authorized Representatives</h3>
        <p className="text-sm text-gray-500">Add all authorized signatories, directors, and ultimate beneficial owners (25%+).</p>
      </div>

      {/* Top Section: Form or Add Button */}
      <div>
        {(isAdding || editingRep) ? (
          <RepForm 
            rep={editingRep} 
            onSaved={() => {
              setIsAdding(false);
              setEditingRep(null);
              handleRefresh();
            }} 
            onCancel={() => {
              setIsAdding(false);
              setEditingRep(null);
            }}
          />
        ) : (
          <button 
            onClick={() => setIsAdding(true)} 
            className="flex items-center px-4 py-2 bg-[#064e3b] text-white rounded-md text-sm font-medium hover:bg-[#064e3b]/90 transition-colors shadow-sm"
          >
            <Plus size={16} className="mr-2" /> Add Representative
          </button>
        )}
      </div>

      {/* Bottom Section: Saved Representatives */}
      <div className="pt-8 border-t border-gray-200">
        <h4 className="text-md font-medium text-gray-900 mb-4">Saved Representatives</h4>
        
        {reps.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-md border border-gray-200">No authorized representatives present</p>
        ) : (
          <div className="space-y-4">
            {reps.map((rep) => (
              <div key={rep.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">{rep.full_name}</p>
                  <p className="text-sm text-gray-500">{rep.id_type}: {rep.id_number}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rep.is_authorized_signatory && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Signatory</span>}
                    {rep.is_director && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Director</span>}
                    {rep.is_ubo && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">UBO ({rep.ubo_percentage}%)</span>}
                    {rep.other_designation && <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{rep.other_designation}</span>}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => { setEditingRep(rep); setIsAdding(false); }} 
                    className="text-sm text-[#064e3b] font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleRemove(rep.id)} 
                    disabled={isRemoving === rep.id} 
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full disabled:opacity-50 transition-colors"
                  >
                    {isRemoving === rep.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">
          Back
        </button>
        <button 
          type="button" 
          onClick={onNext}
          disabled={reps.length === 0 || isAdding || editingRep}
          className="px-6 py-2 bg-[#064e3b] text-white rounded-md font-medium hover:bg-[#064e3b]/90 transition-colors disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
