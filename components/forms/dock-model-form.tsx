"use client";

import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/supabase/queries/auth.client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect } from "react";
import { Upload, Ship, Anchor, MapPin, FileCheck, AlertCircle, CheckCircle2, Compass, Image, ChevronDown } from "lucide-react";

interface DockModelFormProps extends React.ComponentPropsWithoutRef<"div"> {}

interface Category {
  id: string;
  name: string;
}

interface Brand extends ComboboxOption {
  id: string;
  name: string;
}

export function DockModelForm({ className, ...props }: DockModelFormProps) {
  const [formData, setFormData] = useState({
    modelName: "",
    description: "",
    category: "",
    brand: "",
    tags: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories and brands on component mount
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');
      
      if (brandsError) {
        console.error('Error fetching brands:', brandsError);
      } else {
        setBrands(brandsData || []);
      }
    };

    fetchData();
  }, []);

  // Handle brand selection for combobox
  const handleBrandSelect = (brand: Brand) => {
    handleInputChange("brand", brand.id);
    setBrandSearchTerm(brand.name);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.modelName.trim()) {
      errors.modelName = "A ship needs a name to dock properly";
    }
    
    if (!formData.description.trim()) {
      errors.description = "Tell us what this treasure does";
    }
    
    if (selectedFiles.length === 0) {
      errors.files = "No cargo detected - please select files to dock";
    }
    
    // Validate file types
    const allowedTypes = ['.stl', '.obj', '.3mf', '.ply', '.amf'];
    const invalidFiles = selectedFiles.filter(file => 
      !allowedTypes.some(type => file.name.toLowerCase().endsWith(type))
    );
    
    if (invalidFiles.length > 0) {
      errors.files = `Harbor only accepts 3D model files: ${allowedTypes.join(', ')}`;
    }
    
    // Check file sizes (max 50MB per file)
    const largeFiles = selectedFiles.filter(file => file.size > 50 * 1024 * 1024);
    if (largeFiles.length > 0) {
      errors.files = "Some files are too large for the harbor (max 50MB per file)";
    }
    
    // Validate thumbnail if provided
    if (thumbnailFile) {
      const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];
      const isValidImageType = allowedImageTypes.some(type => 
        thumbnailFile.name.toLowerCase().endsWith(type)
      );
      
      if (!isValidImageType) {
        errors.thumbnail = `Thumbnail must be an image: ${allowedImageTypes.join(', ')}`;
      }
      
      // Check thumbnail size (max 5MB)
      if (thumbnailFile.size > 5 * 1024 * 1024) {
        errors.thumbnail = "Thumbnail image is too large (max 5MB)";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      // Clear file errors when new files are selected
      if (formErrors.files) {
        setFormErrors(prev => ({ ...prev, files: "" }));
      }
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
      // Clear thumbnail errors when new file is selected
      if (formErrors.thumbnail) {
        setFormErrors(prev => ({ ...prev, thumbnail: "" }));
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
      // Clear file errors when new files are dropped
      if (formErrors.files) {
        setFormErrors(prev => ({ ...prev, files: "" }));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setUploadStatus("error");
      setStatusMessage("Harbor master found some issues - please check the form and try again");
      return;
    }

    setIsLoading(true);
    setUploadStatus("uploading");
    setStatusMessage("Preparing to dock your model...");

    const supabase = createClient();

    try {
      // Get current user
      const { data: { user }, error: userError } = await getCurrentUser();
      if (userError || !user) {
        throw new Error("You must be logged in to dock a model");
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatusMessage("Hoisting sails and setting course for the harbor...");
      
      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        setStatusMessage("Securing thumbnail at the dock...");
        const thumbnailFileName = `${user.id}/${Date.now()}-${thumbnailFile.name}`;
        const { data: thumbnailData, error: thumbnailError } = await supabase.storage
          .from('models-thumbnails')
          .upload(thumbnailFileName, thumbnailFile);

        if (thumbnailError) {
          throw new Error(`Failed to upload thumbnail: ${thumbnailError.message}`);
        }

        // Get public URL for thumbnail
        const { data: { publicUrl } } = supabase.storage
          .from('models-thumbnails')
          .getPublicUrl(thumbnailFileName);
        
        thumbnailUrl = publicUrl;
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      setStatusMessage("Navigating the shipping lanes...");
      
      // Upload model files (using the first file for now)
      let stlUrl = null;
      if (selectedFiles.length > 0) {
        setStatusMessage("Loading cargo into the hold...");
        const modelFile = selectedFiles[0]; // For now, just use the first file
        const modelFileName = `${user.id}/${Date.now()}-${modelFile.name}`;
        
        const { data: modelData, error: modelError } = await supabase.storage
          .from('models-files')
          .upload(modelFileName, modelFile);

        if (modelError) {
          throw new Error(`Failed to upload model file: ${modelError.message}`);
        }

        // Get public URL for model file
        const { data: { publicUrl } } = supabase.storage
          .from('models-files')
          .getPublicUrl(modelFileName);
        
        stlUrl = publicUrl;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatusMessage("Harbor master approving docking clearance...");
      
      // Insert model data into database
      const modelData = {
        name: formData.modelName,
        description: formData.description,
        category: formData.category || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : null,
        thumbnail: thumbnailUrl,
        stl_key: stlUrl,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };

      const { data: insertedModel, error: insertError } = await supabase
        .from('models')
        .insert([modelData])
        .select();

      if (insertError) {
        throw new Error(`Failed to save model to harbor: ${insertError.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 700));
      setStatusMessage("🎉 Model successfully docked! Welcome to the harbor!");
      
      setUploadStatus("success");
      // Reset form after successful upload
      setTimeout(() => {
        setFormData({
          modelName: "",
          description: "",
          category: "",
          brand: "",
          tags: "",
        });
        setSelectedFiles([]);
        setThumbnailFile(null);
        setUploadStatus("idle");
        setStatusMessage("");
        setFormErrors({});
      }, 4000);
    } catch (error) {
      setUploadStatus("error");
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setStatusMessage(`Rough seas ahead! ${errorMessage}`);
      console.error("Upload error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
        return <Ship className="w-5 h-5 animate-pulse" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 max-w-4xl mx-auto", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Anchor className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-heading font-bold">Dock Your Model</CardTitle>
          <CardDescription className="text-base text-foreground/70">
            Welcome to the harbor! Share your 3D model with our community of makers and help others repair their belongings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File Upload Section */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Cargo Manifest (Model Files)
              </Label>
              <div
                className={cn(
                  "relative border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center transition-colors hover:border-primary/50",
                  selectedFiles.length > 0 && "border-primary/50 bg-primary/5",
                  formErrors.files && "border-red-300 bg-red-50/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".stl,.obj,.3mf,.ply,.amf"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-muted p-4">
                    <Ship className="w-8 h-8 text-foreground/70" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Drop your model files here to begin docking</p>
                    <p className="text-sm text-foreground/70">
                      Or click to browse • STL, OBJ, 3MF, PLY, AMF files accepted
                    </p>
                  </div>
                </div>
              </div>
              
              {formErrors.files && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {formErrors.files}
                </div>
              )}
              
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Files ready for docking:</Label>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <FileCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">{file.name}</span>
                      <span className="text-xs text-foreground/60">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Upload Section */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Image className="w-5 h-5" />
                Ship's Portrait (Thumbnail)
              </Label>
              <div
                className={cn(
                  "relative border border-dashed border-muted-foreground/25 rounded-lg p-4 text-center transition-colors hover:border-primary/50",
                  thumbnailFile && "border-primary/50 bg-primary/5",
                  formErrors.thumbnail && "border-red-300 bg-red-50/50"
                )}
              >
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleThumbnailSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full bg-muted p-2">
                    <Image className="w-5 h-5 text-foreground/70" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {thumbnailFile ? thumbnailFile.name : "Click to add thumbnail"}
                    </p>
                    <p className="text-xs text-foreground/70">
                      JPG, PNG, WebP • Max 5MB
                    </p>
                  </div>
                </div>
              </div>
              
              {formErrors.thumbnail && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {formErrors.thumbnail}
                </div>
              )}
              
              {thumbnailFile && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(thumbnailFile)}
                      alt="Thumbnail preview"
                      className="w-24 h-24 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setThumbnailFile(null)}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Model Information */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Harbor Details
              </Label>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="modelName">Model Name *</Label>
                  <Input
                    id="modelName"
                    placeholder="e.g., Coffee Maker Handle Replacement"
                    value={formData.modelName}
                    onChange={(e) => handleInputChange("modelName", e.target.value)}
                    className={cn(
                      "placeholder:text-foreground/50",
                      formErrors.modelName ? "border-red-300" : ""
                    )}
                    required
                  />
                  {formErrors.modelName && (
                    <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.modelName}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    className={cn(
                      "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      formErrors.description && "border-red-300"
                    )}
                    placeholder="Describe what this part is, what it fixes, and any important details..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    required
                  />
                  {formErrors.description && (
                    <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.description}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                        type="button"
                      >
                        {formData.category ? 
                          categories.find(cat => cat.id === formData.category)?.name || "Select a category..." 
                          : "Select a category..."
                        }
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full min-w-[200px]">
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <DropdownMenuItem
                            key={category.id}
                            onClick={() => handleInputChange("category", category.id)}
                            className="cursor-pointer"
                          >
                            {category.name}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          Loading categories...
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Combobox
                  id="brand"
                  label="Brand"
                  placeholder="e.g., Breville, Samsung, IKEA"
                  options={brands}
                  value={formData.brand}
                  searchTerm={brandSearchTerm}
                  onSearchChange={setBrandSearchTerm}
                  onSelect={handleBrandSelect}
                  isOpen={showBrandDropdown}
                  onOpenChange={setShowBrandDropdown}
                />

                <div>
                  <Label htmlFor="tags">Harbor Tags</Label>
                  <Input
                    id="tags"
                    placeholder="e.g., replacement, spare-part, kitchen, appliance (separated by commas)"
                    value={formData.tags}
                    onChange={(e) => handleInputChange("tags", e.target.value)}
                    className="placeholder:text-foreground/50"
                  />
                </div>
              </div>
            </div>

            {/* Status Message */}
            {uploadStatus !== "idle" && (
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-lg",
                uploadStatus === "success" && "bg-green-50 text-green-700 border border-green-200",
                uploadStatus === "error" && "bg-red-50 text-red-700 border border-red-200",
                uploadStatus === "uploading" && "bg-blue-50 text-blue-700 border border-blue-200"
              )}>
                {getStatusIcon()}
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button 
                type="submit" 
                size="lg"
                disabled={isLoading}
                className="px-8"
              >
                {isLoading ? (
                  <>
                    <Ship className="w-4 h-4 animate-pulse mr-2" />
                    Docking in Progress...
                  </>
                ) : (
                  <>
                    <Anchor className="w-4 h-4 mr-2" />
                    Dock This Model
                  </>
                )}
              </Button>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-foreground/60 text-center">
              By docking your model, you agree to share it with the PartHarbor community under our open repair initiative. 
              <br />
              Your model will be reviewed by our harbor master before becoming available to other makers.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}