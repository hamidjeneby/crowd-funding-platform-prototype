"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Country, State, City } from "country-state-city";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { saveStage1Individual } from "@/app/actions/investor-onboarding";
import { AlertCircle, Loader2 } from "lucide-react";

const ALLOWED_COUNTRIES = ["AE", "QA", "SG", "MY", "TH", "SA", "OM", "TR"];

const stage1Schema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  personal_email: z.string().email("Please enter a valid email address"),
  personal_phone_number: z.string().min(5, "Please enter a valid phone number"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  id_number: z.string().min(1, "National ID / Passport number is required"),
  net_worth: z.string().min(1, "Net worth is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
  annual_income: z.string().min(1, "Annual income is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
  investment_experience_years: z.string().min(1, "Investment experience is required").refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0, "Must be a valid number of years"),
});

export default function Stage1PersonalInfo({ data, onSave, onNext }) {
  const allCountries = Country.getAllCountries();
  const initCountry = data.country 
    ? (allCountries.find(c => c.isoCode === data.country || c.name === data.country)?.name || data.country)
    : "";

  const [savingType, setSavingType] = useState(null);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [countries, setCountries] = useState(() => {
    return allCountries.filter(c => ALLOWED_COUNTRIES.includes(c.isoCode));
  });
  const [cities, setCities] = useState(() => {
    if (initCountry) {
      const countryObj = allCountries.find(c => c.name === initCountry || c.isoCode === initCountry);
      if (countryObj) {
        const countryCities = City.getCitiesOfCountry(countryObj.isoCode) || [];
        return Array.from(new Set(countryCities.map(c => c.name))).sort();
      }
    }
    return [];
  });

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    resolver: zodResolver(stage1Schema),
    defaultValues: {
      full_name: data.full_name || "",
      country: initCountry,
      city: data.city || "",
      personal_email: data.email || "",
      personal_phone_number: data.phone || "",
      date_of_birth: data.DOB ? new Date(data.DOB).toISOString().split('T')[0] : "",
      nationality: data.nationality || "",
      id_number: data.id_number || "",
      net_worth: data.net_worth ? data.net_worth.toString() : "",
      annual_income: data.annual_income ? data.annual_income.toString() : "",
      investment_experience_years: data.investment_experience_years !== null && data.investment_experience_years !== undefined ? data.investment_experience_years.toString() : "",
    }
  });

  const selectedCountry = watch("country");

  useEffect(() => {
    if (selectedCountry) {
      const all = Country.getAllCountries();
      const countryObj = all.find(c => c.name === selectedCountry || c.isoCode === selectedCountry);
      if (countryObj) {
        const countryCities = City.getCitiesOfCountry(countryObj.isoCode) || [];
        const uniqueCities = Array.from(new Set(countryCities.map(c => c.name))).sort();
        setCities(uniqueCities);
      } else {
        setCities([]);
      }
    } else {
      setCities([]);
    }
  }, [selectedCountry]);

  const onSubmit = async (formData) => {
    setSavingType("next");
    setFormError(null);
    setSuccessMsg(null);
    try {
      await saveStage1Individual(formData);
      onSave({
        ...formData,
        email: formData.personal_email,
        phone: formData.personal_phone_number
      });
      onNext();
    } catch (error) {
      console.error(error);
      setFormError("An error occurred while saving your details. Please try again.");
    } finally {
      setSavingType(null);
    }
  };

  const onSaveDraft = async () => {
    const formData = watch();
    setSavingType("draft");
    setFormError(null);
    setSuccessMsg(null);
    try {
      await saveStage1Individual(formData);
      onSave({
        ...formData,
        email: formData.personal_email,
        phone: formData.personal_phone_number
      });
      setSuccessMsg("Draft saved successfully.");
    } catch (error) {
      console.error(error);
      setFormError("An error occurred while saving your details. Please try again.");
    } finally {
      setSavingType(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError && (
        <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
          {formError}
        </div>
      )}
      {successMsg && (
        <div className="p-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
          {successMsg}
        </div>
      )}
      <p className="text-sm text-gray-500 mb-4">
        Fields marked with <span className="text-red-500">*</span> are required.
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register("full_name")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            {...register("date_of_birth")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Nationality <span className="text-red-500">*</span></label>
          <select 
            {...register("nationality")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border"
          >
            <option value="">Select a nationality</option>
            {Country.getAllCountries().map(c => (
              <option key={c.isoCode} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Country of Residence <span className="text-red-500">*</span></label>
          <select 
            {...register("country")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border"
          >
            <option value="">Select a country</option>
            {countries.map(c => (
              <option key={c.isoCode} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">National ID / Passport Number <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register("id_number")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
          <select 
            {...register("city")}
            disabled={!selectedCountry}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border disabled:bg-gray-100"
          >
            <option value="">Select a city</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Personal Email <span className="text-red-500">*</span></label>
          <input 
            type="email" 
            {...register("personal_email")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Personal Phone Number <span className="text-red-500">*</span></label>
          <Controller
            name="personal_phone_number"
            control={control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                className="mt-1 flex w-full rounded-md border-gray-300 shadow-sm focus-within:border-[#064e3b] focus-within:ring-1 focus-within:ring-[#064e3b] sm:text-sm p-2 border"
                defaultCountry="AE"
              />
            )}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Net Worth (AED) <span className="text-red-500">*</span></label>
          <input 
            type="number" 
            step="0.01"
            {...register("net_worth")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Annual Income (AED) <span className="text-red-500">*</span></label>
          <input 
            type="number" 
            step="0.01"
            {...register("annual_income")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Investment Experience (Years) <span className="text-red-500">*</span></label>
          <input 
            type="number"
            min="0"
            {...register("investment_experience_years")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Please correct the following errors:</h3>
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>{error.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button 
          type="button" 
          onClick={onSaveDraft}
          disabled={savingType !== null}
          className="flex items-center px-6 py-2 border border-[#064e3b] text-[#064e3b] rounded-md font-medium hover:bg-[#064e3b]/5 transition-colors disabled:opacity-50"
        >
          {savingType === "draft" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save for Later"}
        </button>
        <button 
          type="submit" 
          disabled={savingType !== null}
          className="px-6 py-2 bg-[#064e3b] text-white rounded-md font-medium hover:bg-[#064e3b]/90 transition-colors disabled:opacity-50 flex items-center"
        >
          {savingType === "next" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : "Save and Continue"}
        </button>
      </div>
    </form>
  );
}
