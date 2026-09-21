"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import { useProfileStore } from "@/lib/store/profileStore";
import storeTypeList from "@/lib/storetype.json";

// Zod Schema
// Store details (contact, whatsapp, location) ekhane optional rakha hoyeche,
// karon ADMIN create korar shomoy ei field gulo form e thake na.
// Required check ta superRefine e `requireStoreDetails` flag diye hoy.
const baseStoreFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  storeName: z.string().min(2, "Store name is required"),
  storeType: z.string().min(1, "Store type is required"),
  description: z.string().optional(),
  contactNo: z.string().optional(),
  whatsappNo: z.string().optional(),
  supportNo: z.string().optional(),
  gstin: z.string().optional(),
  lat: z.number().min(-90).max(90, "Invalid latitude"),
  long: z.number().min(-180).max(180, "Invalid longitude"),
  area: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  isActive: z.boolean().optional(),
  isVerify: z.boolean().optional(),
});

const getStoreFormSchema = (
  isEditMode: boolean,
  mode: "admin" | "store",
  requireStoreDetails: boolean,
) =>
  baseStoreFormSchema.superRefine((values, context) => {
    const requireOwnerFields = mode !== "store";

    // ---------- Owner fields ----------
    if (requireOwnerFields && !values.name?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Owner name is required",
      });
    }

    if (requireOwnerFields && !values.email?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Valid email is required",
      });
    } else if (
      requireOwnerFields &&
      values.email &&
      !/^\S+@\S+\.\S+$/.test(values.email)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Valid email is required",
      });
    }

    if (requireOwnerFields && !values.phone?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Valid phone number required",
      });
    } else if (requireOwnerFields && (values.phone?.length || 0) < 10) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Valid phone number required",
      });
    }

    if (!isEditMode && !values.password?.trim() && requireOwnerFields) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required",
      });
    } else if (
      !isEditMode &&
      requireOwnerFields &&
      (values.password?.length || 0) < 6
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 6 characters",
      });
    }

    // ---------- Store details (sudhu jokhon form e dekhano hocche) ----------
    if (requireStoreDetails) {
      if ((values.contactNo?.trim().length || 0) < 10) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contactNo"],
          message: "Contact number is required",
        });
      }

      if ((values.whatsappNo?.trim().length || 0) < 10) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["whatsappNo"],
          message: "WhatsApp number is required",
        });
      }

      if ((values.area?.trim().length || 0) < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["area"],
          message: "Area is required",
        });
      }

      if ((values.state?.trim().length || 0) < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["state"],
          message: "State is required",
        });
      }

      if ((values.country?.trim().length || 0) < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["country"],
          message: "Country is required",
        });
      }
    }
  });

type StoreFormData = z.infer<typeof baseStoreFormSchema>;

type StoreFormProps = {
  storeId?: string | null;
  createEndpoint?: string;
  mode?: "admin" | "store";
  onClose: () => void;
  onSuccess: () => void;
};

type StoreTypeOption = {
  label: string;
  value: string;
  icon: string;
};

type LocationSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string | undefined>;
};

const getStoreTypeIcon = (label: string) => {
  const normalized = label.toLowerCase();

  if (/grocery/.test(normalized)) {
    return "pi pi-shopping-cart";
  }

  if (/supermarket/.test(normalized)) {
    return "pi pi-shop";
  }

  if (/convenience/.test(normalized)) {
    return "pi pi-shopping-bag";
  }

  if (
    /clothing|boutique|fashion|footwear|accessor|jewell|cosmetic|beauty|optical|supplement|tailor/.test(
      normalized,
    )
  ) {
    return "pi pi-shopping-bag";
  }

  if (
    /electronics|appliance|it services|software|digital marketing|design studio|mobile/.test(
      normalized,
    )
  ) {
    return "pi pi-desktop";
  }

  if (
    /furniture|home decor|interior|real estate|property|construction|building materials|hardware|paint|tiles|plumbing|cement|steel/.test(
      normalized,
    )
  ) {
    return "pi pi-home";
  }

  if (
    /restaurant|café|cafe|bakery|sweet|ice cream|fast food|food truck|cloud kitchen|catering|juice|meat|fruits|vegetables|bar|hotel|resort/.test(
      normalized,
    )
  ) {
    return "pi pi-star";
  }

  if (
    /car|vehicle|tyre|battery|garage|wash|transport|courier|logistics|delivery|warehouse/.test(
      normalized,
    )
  ) {
    return "pi pi-truck";
  }

  if (
    /medical|clinic|dental|lab|hospital|physio|gym|spa|optician|health|pharmacy/.test(
      normalized,
    )
  ) {
    return "pi pi-heart";
  }

  if (
    /accounting|legal|marketing|consultancy|agency|business|insurance|bank|finance|crypto|microfinance|stock|mutual fund|recruitment|hr|event management/.test(
      normalized,
    )
  ) {
    return "pi pi-briefcase";
  }

  if (
    /school|college|coaching|training|academy|language|daycare|edtech|music|film|photography|gaming|publishing/.test(
      normalized,
    )
  ) {
    return "pi pi-book";
  }

  if (
    /cleaning|pest control|painting|renovation|repair|gardening|laundry|security|import export|factory|manufacturing/.test(
      normalized,
    )
  ) {
    return "pi pi-cog";
  }

  if (/pet|astrology|religious|ngo|charity/.test(normalized)) {
    return "pi pi-star";
  }

  return "pi pi-tag";
};

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

const LocationPicker = dynamic(() => import("@/helper/LocationPicker"), {
  ssr: false,
});

const INDIA_CENTER = {
  latitude: 22.9734,
  longitude: 78.6569,
};

const STATE_CENTERS: Record<string, [number, number]> = {
  "Andhra Pradesh": [15.9129, 79.74],
  "Arunachal Pradesh": [28.218, 94.7278],
  Assam: [26.2006, 92.9376],
  Bihar: [25.0961, 85.3131],
  Chhattisgarh: [21.2787, 81.8661],
  Goa: [15.2993, 74.124],
  Gujarat: [22.2587, 71.1924],
  Haryana: [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  Jharkhand: [23.6102, 85.2799],
  Karnataka: [15.3173, 75.7139],
  Kerala: [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  Maharashtra: [19.7515, 75.7139],
  Manipur: [24.6637, 93.9063],
  Meghalaya: [25.467, 91.3662],
  Mizoram: [23.1645, 92.9376],
  Nagaland: [26.1584, 94.5624],
  Odisha: [20.9517, 85.0985],
  Punjab: [31.1471, 75.3412],
  Rajasthan: [27.0238, 74.2179],
  Sikkim: [27.533, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  Telangana: [18.1124, 79.0193],
  Tripura: [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  Uttarakhand: [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.855],
  "Andaman and Nicobar Islands": [11.7401, 92.6586],
  Chandigarh: [30.7333, 76.7794],
  "Dadra and Nagar Haveli and Daman and Diu": [20.3974, 72.8328],
  Delhi: [28.7041, 77.1025],
  "Jammu and Kashmir": [33.7782, 76.5762],
  Ladakh: [34.2268, 77.5619],
  Lakshadweep: [10.5667, 72.6417],
  Puducherry: [11.9416, 79.8083],
};

function StoreForm({
  storeId,
  createEndpoint = "/api/register/create-user",
  mode = "admin",
  onClose,
  onSuccess,
}: StoreFormProps) {
  const { profile } = useProfileStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isVerify, setIsVerify] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<
    LocationSearchResult[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");
  const canShowVerifyField = profile?.role === "ADMIN";

  const isEditMode = !!storeId;
  const isStoreMode = mode === "store" && !isEditMode;

  // ADMIN notun store add korle: sudhu owner info + store name + store type
  // STORE user (create/edit) ar ADMIN edit mode: puro form
  const isAdminCreate = profile?.role === "ADMIN" && !isEditMode;
  const showStoreDetails = !isAdminCreate;

  const storeFormSchema = getStoreFormSchema(
    isEditMode,
    mode,
    showStoreDetails,
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      storeName: "",
      storeType: "",
      description: "",
      contactNo: "",
      whatsappNo: "",
      supportNo: "",
      gstin: "",
      lat: 0,
      long: 0,
      area: "",
      state: "",
      country: "India",
      isActive: true,
      isVerify: false,
    },
  });

  useEffect(() => {
    if (storeId && isEditMode) {
      fetchStoreData();
    }
  }, [storeId]);

  const selectedLat = watch("lat");
  const selectedLong = watch("long");
  const selectedArea = watch("area");
  const selectedState = watch("state") || "";
  const selectedCountry = watch("country") || "India";
  const mapCenter = STATE_CENTERS[selectedState] || [
    INDIA_CENTER.latitude,
    INDIA_CENTER.longitude,
  ];
  const storeTypeOptions: StoreTypeOption[] = storeTypeList.map((option) => ({
    label: option.label,
    value: option.label,
    icon: getStoreTypeIcon(option.label),
  }));

  useEffect(() => {
    setLocationResults([]);
  }, [selectedState, selectedCountry]);

  const renderStoreTypeOption = (option: StoreTypeOption) => (
    <div className="flex items-center gap-2">
      <i className={`${option.icon} text-yellow-700`} />
      <span>{option.label}</span>
    </div>
  );

  const renderStoreTypeValue = (option: StoreTypeOption | null) => {
    if (!option) {
      return <span className="text-gray-400">Select store type</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <i className={`${option.icon} text-yellow-700`} />
        <span>{option.label}</span>
      </div>
    );
  };

  const formatDetailedLocation = (
    address: Record<string, string | undefined>,
    fallback: string,
  ) => {
    const street = [address.house_number, address.road]
      .filter(Boolean)
      .join(" ");
    const locality = [
      address.suburb,
      address.neighbourhood,
      address.city_district,
      address.city,
      address.town,
      address.village,
      address.municipality,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      [street, locality, address.state, address.country]
        .filter(Boolean)
        .join(", ") || fallback
    );
  };

  const applyLocationResult = (result: LocationSearchResult) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const address = result.address || {};

    const road = [address.house_number, address.road].filter(Boolean).join(" ");
    const locality =
      address.suburb ||
      address.neighbourhood ||
      address.city_district ||
      address.city ||
      address.town ||
      address.village ||
      "";
    const pincode = address.postcode || "";

    const areaValue =
      [road, locality, pincode].filter(Boolean).join(", ") ||
      result.display_name;

    const stateName =
      address.state || address.state_district || selectedState || "";
    const countryName = address.country || "India";

    setValue("lat", latitude, { shouldDirty: true, shouldValidate: true });
    setValue("long", longitude, { shouldDirty: true, shouldValidate: true });
    setValue("area", areaValue, { shouldDirty: true, shouldValidate: true });

    if (stateName) {
      const matchedState = INDIAN_STATES.find(
        (s) => s.toLowerCase() === stateName.toLowerCase(),
      );
      setValue("state", matchedState || stateName, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    setValue("country", countryName, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setLocationQuery(areaValue);
    setSelectedLocationLabel(areaValue);
    setLocationResults([]);
  };

  const searchDetailedLocation = async () => {
    const query = locationQuery.trim();

    if (!query) {
      toast.error("Enter a street, landmark, or locality to search.");
      return;
    }

    setIsSearchingLocation(true);
    setLocationResults([]);

    try {
      let results: LocationSearchResult[] = [];

      const attempt = async (q: string) => {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=in&q=${encodeURIComponent(q)}`,
          { headers: { Accept: "application/json", "Accept-Language": "en" } },
        );
        if (!res.ok) throw new Error("Search failed");
        return (await res.json()) as LocationSearchResult[];
      };

      results = await attempt(query);

      if (results.length === 0) {
        const parts = query
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        for (let i = 1; i < parts.length && results.length === 0; i++) {
          const shorterQuery = parts.slice(i).join(", ");
          results = await attempt(shorterQuery);
        }
      }

      if (results.length === 0) {
        const parts = query
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          results = await attempt(parts.slice(0, 2).join(", "));
        }
      }

      if (results.length === 0) {
        toast.info(
          "No results found. Try shorter address like 'Belghoria, Kolkata'",
        );
        return;
      }

      setLocationResults(results);
    } catch (error: any) {
      toast.error(error?.message || "Failed to search locations");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const setLocationFromMap = async (latitude: number, longitude: number) => {
    setValue("lat", latitude, { shouldDirty: true, shouldValidate: true });
    setValue("long", longitude, { shouldDirty: true, shouldValidate: true });

    setIsMapLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) {
        throw new Error("Unable to resolve location from map");
      }

      const result = await response.json();
      const address = (result?.address || {}) as Record<
        string,
        string | undefined
      >;
      const detailedLocation = formatDetailedLocation(
        address,
        result?.display_name || selectedArea || "",
      );

      const stateName =
        address.state ||
        address.region ||
        address.state_district ||
        selectedState ||
        "";
      const countryName = address.country || selectedCountry || "India";

      setValue("area", detailedLocation, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (stateName) {
        setValue("state", stateName, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      setValue("country", countryName, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setLocationQuery(detailedLocation);
      setSelectedLocationLabel(detailedLocation);
    } catch (error: any) {
      toast.error(error?.message || "Failed to resolve location from map");
    } finally {
      setIsMapLoading(false);
    }
  };

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/register/single-store/${storeId}`,
      );
      const store = res.data.store;

      setValue("name", store.owner?.name || "");
      setValue("email", store.owner?.email || "");
      setValue("phone", store.owner?.phone || "");
      setValue("storeName", store.storeName?.trim() || "");
      setValue("storeType", store.storeType?.trim() || "");
      setValue("description", store.description?.trim() || "");
      setValue("contactNo", store.contactNo?.trim() || "");
      setValue("whatsappNo", store.whatsappNo?.trim() || "");
      setValue("supportNo", store.supportNo?.trim() || "");
      setValue("gstin", store.gstin?.trim() || "");
      setValue("lat", store.lat || 0);
      setValue("long", store.long || 0);
      setValue("area", store.address?.area?.trim() || "");
      setValue("state", store.address?.state?.trim() || "");
      setValue("country", store.address?.country?.trim() || "");
      setLocationQuery(store.address?.area?.trim() || "");
      setSelectedLocationLabel(store.address?.area?.trim() || "");

      setExistingImages(store.images || []);

      setIsActive(typeof store.isActive === "boolean" ? store.isActive : true);
      setIsVerify(typeof store.isVerify === "boolean" ? store.isVerify : false);

      setLoading(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch store data",
      );
      onClose();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles([...imageFiles, ...files]);

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreviews((prev) => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImages(existingImages.filter((_, i) => i !== index));
    } else {
      setImageFiles(imageFiles.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: StoreFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      if (!isStoreMode) {
        if (data.name) formData.append("name", data.name);
        if (data.email) formData.append("email", data.email);
        if (data.phone) formData.append("phone", data.phone);
        if (data.password && !isEditMode) {
          formData.append("password", data.password);
        }
      }

      // Sob mode e lagbe
      formData.append("storeName", data.storeName || "");
      formData.append("storeType", data.storeType || "");

      // Baki field sudhu jokhon form e dekhano hocche
      if (showStoreDetails) {
        formData.append("description", data.description || "");
        formData.append("contactNo", data.contactNo || "");
        formData.append("whatsappNo", data.whatsappNo || "");
        formData.append("supportNo", data.supportNo || "");
        formData.append("gstin", data.gstin || "");
        formData.append("lat", data.lat.toString());
        formData.append("long", data.long.toString());

        formData.append("address[area]", data.area || "");
        formData.append("address[state]", data.state || "");
        formData.append("address[country]", data.country || "");

        existingImages.forEach((url, index) => {
          formData.append(`existingImages[${index}]`, url);
        });

        imageFiles.forEach((file, index) => {
          formData.append(`image[${index}]`, file);
        });
      }

      formData.append("isActive", isActive.toString());
      formData.append("isVerify", isVerify.toString());

      let res;
      if (isEditMode) {
        res = await axiosInstance.put(
          `/api/register/update-store-and-user/${storeId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );
      } else {
        res = await axiosInstance.post(createEndpoint, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast.success(
        res.data.message ||
          `Store ${isEditMode ? "updated" : "created"} successfully!`,
      );
      reset();
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImages([]);
      setLocationQuery("");
      setLocationResults([]);
      setSelectedLocationLabel("");
      onSuccess();
    } catch (error: any) {
      console.error("Store operation error:", error);
      toast.error(error.response?.data?.message || "Failed to save store");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <i
          className="pi pi-spin pi-spinner text-3xl"
          style={{ color: "#d89f00" }}
        ></i>
      </div>
    );
  }

  return (
    <div className={`px-4 pt-2 pb-4 ${showStoreDetails ? "min-h-[80vh]" : ""}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isStoreMode && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-user" style={{ color: "#d89f00" }}></i>
              Owner Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Owner Name <span className="text-red-500">*</span>
                </label>
                <InputText
                  {...register("name")}
                  placeholder="Enter owner name"
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /\d/g,
                      "",
                    );
                  }}
                  className={`w-full p-2 border rounded-lg ${errors.name ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.name && (
                  <small className="text-red-500">{errors.name.message}</small>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <InputText
                  {...register("email")}
                  type="email"
                  placeholder="Enter email"
                  className={`w-full p-2 border rounded-lg ${errors.email ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.email && (
                  <small className="text-red-500">{errors.email.message}</small>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <InputText
                  {...register("phone")}
                  placeholder="Enter phone"
                  inputMode="numeric"
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /\D/g,
                      "",
                    );
                  }}
                  className={`w-full p-2 border rounded-lg ${errors.phone ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.phone && (
                  <small className="text-red-500">{errors.phone.message}</small>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Password{" "}
                  {!isEditMode && <span className="text-red-500">*</span>}
                </label>
                <InputText
                  {...register("password")}
                  type="password"
                  placeholder="Enter password"
                  className={`w-full p-2 border rounded-lg ${errors.password ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.password && (
                  <small className="text-red-500">
                    {errors.password.message}
                  </small>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Store Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-shop" style={{ color: "#d89f00" }}></i>
            Store Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Store Name <span className="text-red-500">*</span>
              </label>
              <InputText
                {...register("storeName")}
                placeholder="Enter store name"
                className={`w-full p-2 border rounded-lg ${errors.storeName ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.storeName && (
                <small className="text-red-500">
                  {errors.storeName.message}
                </small>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Store Type <span className="text-red-500">*</span>
              </label>
              <Controller
                name="storeType"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    options={storeTypeOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select store type"
                    className={`w-full ${errors.storeType ? "border-red-500" : "border-yellow-300"}`}
                    panelClassName="!text-sm"
                    itemTemplate={renderStoreTypeOption}
                    valueTemplate={renderStoreTypeValue}
                  />
                )}
              />
              {errors.storeType && (
                <small className="text-red-500">
                  {errors.storeType.message}
                </small>
              )}
            </div>

            {showStoreDetails && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    {...register("contactNo")}
                    placeholder="Enter contact number"
                    inputMode="numeric"
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      e.currentTarget.value = e.currentTarget.value.replace(
                        /\D/g,
                        "",
                      );
                    }}
                    className={`w-full p-2 border rounded-lg ${errors.contactNo ? "border-red-500" : "border-yellow-300"}`}
                  />
                  {errors.contactNo && (
                    <small className="text-red-500">
                      {errors.contactNo.message}
                    </small>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    {...register("whatsappNo")}
                    placeholder="Enter WhatsApp number"
                    inputMode="numeric"
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      e.currentTarget.value = e.currentTarget.value.replace(
                        /\D/g,
                        "",
                      );
                    }}
                    className={`w-full p-2 border rounded-lg ${errors.whatsappNo ? "border-red-500" : "border-yellow-300"}`}
                  />
                  {errors.whatsappNo && (
                    <small className="text-red-500">
                      {errors.whatsappNo.message}
                    </small>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    Support Number
                  </label>
                  <InputText
                    {...register("supportNo")}
                    placeholder="Enter support number"
                    inputMode="numeric"
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      e.currentTarget.value = e.currentTarget.value.replace(
                        /\D/g,
                        "",
                      );
                    }}
                    className={`w-full p-2 border rounded-lg ${errors.supportNo ? "border-red-500" : "border-yellow-300"}`}
                  />
                  {errors.supportNo && (
                    <small className="text-red-500">
                      {errors.supportNo.message}
                    </small>
                  )}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Description
                  </label>
                  <InputTextarea
                    {...register("description")}
                    placeholder="Enter store description"
                    rows={3}
                    className={`w-full p-2 border rounded-lg ${errors.description ? "border-red-500" : "border-yellow-300"}`}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location Information */}
        {showStoreDetails && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-map-marker" style={{ color: "#d89f00" }}></i>
              Location Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Country
                </label>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <InputText
                      value={field.value || "India"}
                      readOnly
                      className="w-full p-2 border rounded-lg border-yellow-300 bg-gray-100 text-gray-700"
                    />
                  )}
                />
                {errors.country && (
                  <small className="text-red-500">
                    {errors.country.message}
                  </small>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  State
                </label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      options={INDIAN_STATES.map((stateName) => ({
                        label: stateName,
                        value: stateName,
                      }))}
                      placeholder="Select state"
                      className={`w-full ${errors.state ? "border-red-500" : "border-yellow-300"}`}
                      panelClassName="!text-sm"
                    />
                  )}
                />
                {errors.state && (
                  <small className="text-red-500">{errors.state.message}</small>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      Detailed Location <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Search by street, house number, landmark, or locality. The
                      selected state narrows the results.
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    <div>Selected state: {selectedState || "Not selected"}</div>
                    <div>Country: {selectedCountry || "India"}</div>
                  </div>
                </div>

                <Controller
                  name="area"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-3">
                      <div className="flex flex-col md:flex-row gap-2">
                        <InputText
                          value={locationQuery || field.value || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setLocationQuery(value);
                            setSelectedLocationLabel(value);
                            field.onChange(value);
                            setLocationResults([]);
                          }}
                          placeholder="15 Sridhar Chakrabory Street, Uttarpara"
                          className={`w-full p-2 border rounded-lg ${errors.area ? "border-red-500" : "border-yellow-300"}`}
                        />
                        <Button
                          type="button"
                          label={
                            isSearchingLocation ? "Searching..." : "Search"
                          }
                          icon={
                            isSearchingLocation
                              ? "pi pi-spin pi-spinner"
                              : "pi pi-search"
                          }
                          onClick={searchDetailedLocation}
                          className="!bg-yellow-400 !text-gray-900 !border-yellow-500 md:!w-40"
                          disabled={isSearchingLocation}
                        />
                      </div>

                      {locationResults.length > 0 && (
                        <div className="rounded-2xl border border-yellow-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] overflow-hidden">
                          <div className="px-4 py-3 border-b border-yellow-100 bg-yellow-50/70">
                            <p className="text-sm font-semibold text-gray-800 m-0">
                              Select the exact place
                            </p>
                            <p className="text-xs text-gray-500 mt-1 m-0">
                              Pick the matching street-level result to place the
                              map pin precisely.
                            </p>
                          </div>
                          <div className="max-h-56 overflow-auto divide-y divide-yellow-100">
                            {locationResults.map((result, index) => {
                              const itemLabel = formatDetailedLocation(
                                result.address || {},
                                result.display_name,
                              );

                              return (
                                <button
                                  key={`${result.display_name}-${index}`}
                                  type="button"
                                  onClick={() => applyLocationResult(result)}
                                  className="w-full text-left px-4 py-3 hover:bg-yellow-50 transition"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                                      <i className="pi pi-map-marker" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-800 leading-6 truncate">
                                        {itemLabel}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Lat {Number(result.lat).toFixed(6)} |
                                        Long {Number(result.lon).toFixed(6)}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {errors.area && (
                        <small className="text-red-500">
                          {errors.area.message}
                        </small>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Refine on map
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Click the map or drag the marker after choosing a detailed
                      location.
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    <div>
                      Lat:{" "}
                      {Number(selectedLat || INDIA_CENTER.latitude).toFixed(6)}
                    </div>
                    <div>
                      Long:{" "}
                      {Number(selectedLong || INDIA_CENTER.longitude).toFixed(
                        6,
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-2xl overflow-hidden border border-yellow-200 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                  style={{
                    minHeight: 320,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,251,236,0.98) 100%)",
                  }}
                >
                  {isMapLoading ? (
                    <div className="h-[420px] flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white text-gray-600">
                      Resolving location...
                    </div>
                  ) : (
                    <LocationPicker
                      latitude={Number(selectedLat || INDIA_CENTER.latitude)}
                      longitude={Number(selectedLong || INDIA_CENTER.longitude)}
                      center={mapCenter}
                      selectedLocation={
                        selectedLocationLabel ||
                        locationQuery ||
                        selectedArea ||
                        undefined
                      }
                      onPick={(latitude, longitude) => {
                        void setLocationFromMap(latitude, longitude);
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  GSTIN
                </label>
                <InputText
                  {...register("gstin")}
                  placeholder="Enter GSTIN"
                  className={`w-full p-2 border rounded-lg border-yellow-300`}
                />
              </div>

              <input
                type="hidden"
                {...register("lat", { valueAsNumber: true })}
              />
              <input
                type="hidden"
                {...register("long", { valueAsNumber: true })}
              />
            </div>
          </div>
        )}

        {/* Images */}
        {showStoreDetails && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-image" style={{ color: "#d89f00" }}></i>
              Store Images
            </h3>

            {existingImages.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Existing Images
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {existingImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Existing ${idx}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-yellow-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx, true)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <i className="pi pi-times text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  New Images Preview
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${idx}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-green-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx, false)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <i className="pi pi-times text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Add More Images
              </label>
              <input
                type="file"
                multiple
                onChange={handleImageChange}
                className="w-full p-2 border border-yellow-300 rounded-lg"
                accept="image/*"
              />
              <small className="text-gray-600">
                Total images: {existingImages.length + imageFiles.length}
              </small>
            </div>
          </div>
        )}

        {/* Status & Verification */}
        {isEditMode && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i
                className="pi pi-check-circle"
                style={{ color: "#d89f00" }}
              ></i>
              Status & Verification
            </h3>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isActive}
                  onChange={(e) => setIsActive(e.checked || false)}
                  inputId="isActive"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-semibold text-gray-700"
                >
                  Active Store
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT BUTTONS */}
        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            onClick={onClose}
            className="flex-1"
            style={{
              background: "#f5f5f5",
              color: "#666",
              border: "1px solid #ddd",
            }}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            label={
              isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Update Store"
                  : "Create Store"
            }
            icon={
              isSubmitting
                ? "pi pi-spin pi-spinner"
                : isEditMode
                  ? "pi pi-pencil"
                  : "pi pi-check"
            }
            className="flex-1"
            style={{
              background: "linear-gradient(120deg,#f3be27,#e4a90e)",
              color: "#3b2f0f",
              border: "1px solid #e0ac1f",
            }}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}

export default StoreForm;