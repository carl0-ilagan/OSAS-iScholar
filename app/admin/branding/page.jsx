"use client"

import { useState, useRef, useEffect } from "react"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { useBranding } from "@/contexts/BrandingContext"
import { Upload, Save, Loader2, Image as ImageIcon, X, CheckCircle2, AlertCircle, Sparkles, Palette, Globe, Eye } from "lucide-react"
import { toast } from "sonner"

export default function BrandingSettingsPage() {
  const { branding, loading: brandingLoading, updateBranding, refreshBranding } = useBranding()
  const [loading, setLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState(branding.logo)
  const [faviconPreview, setFaviconPreview] = useState(branding.favicon)
  const [formData, setFormData] = useState({
    name: branding.name || "iScholar",
    tabTitle: branding.tabTitle || "iScholar Portal",
    footer: {
      description: branding.footer?.description || "Making scholarship management simple and accessible for all MinSU students.",
      address: branding.footer?.address || "Mariano Jhocson Street, Diliman, Quezon City",
      phone: branding.footer?.phone || "(+63) 2 8981-8500",
      email: branding.footer?.email || "osas@minsu.ph",
      socialLinks: {
        facebook: branding.footer?.socialLinks?.facebook || "",
        linkedin: branding.footer?.socialLinks?.linkedin || "",
        twitter: branding.footer?.socialLinks?.twitter || "",
      },
    },
  })
  const fileInputRef = useRef(null)
  const faviconInputRef = useRef(null)

  // Update form when branding loads
  useEffect(() => {
    if (!brandingLoading && branding) {
      setFormData({
        name: branding.name || "iScholar",
        tabTitle: branding.tabTitle || "iScholar Portal",
        footer: {
          description: branding.footer?.description || "Making scholarship management simple and accessible for all MinSU students.",
          address: branding.footer?.address || "Mariano Jhocson Street, Diliman, Quezon City",
          phone: branding.footer?.phone || "(+63) 2 8981-8500",
          email: branding.footer?.email || "osas@minsu.ph",
          socialLinks: {
            facebook: branding.footer?.socialLinks?.facebook || "",
            linkedin: branding.footer?.socialLinks?.linkedin || "",
            twitter: branding.footer?.socialLinks?.twitter || "",
          },
        },
      })
      setLogoPreview(branding.logo)
      setFaviconPreview(branding.favicon)
    }
  }, [branding, brandingLoading])

  const handleFileChange = (e, type = "logo") => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file", {
        icon: <AlertCircle className="w-4 h-4" />,
      })
      return
    }

    // Validate file size (max 2MB for base64)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB", {
        icon: <AlertCircle className="w-4 h-4" />,
      })
      return
    }

    // Create preview and convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      if (type === "logo") {
        setLogoPreview(reader.result)
      } else {
        setFaviconPreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveFavicon = () => {
    setFaviconPreview(null)
    if (faviconInputRef.current) {
      faviconInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let logoBase64 = branding.logo
      let faviconBase64 = branding.favicon

      // Get base64 from file if new file selected
      if (fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0]
        const reader = new FileReader()
        
        logoBase64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      } else if (!logoPreview) {
        logoBase64 = null
      } else {
        logoBase64 = logoPreview
      }

      // Get favicon base64
      if (faviconInputRef.current?.files?.[0]) {
        const file = faviconInputRef.current.files[0]
        const reader = new FileReader()
        
        faviconBase64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      } else if (!faviconPreview) {
        faviconBase64 = null
      } else {
        faviconBase64 = faviconPreview
      }

      // Prepare branding data
      const brandingData = {
        logo: logoBase64,
        favicon: faviconBase64,
        name: formData.name.trim(),
        tabTitle: formData.tabTitle.trim(),
        footer: {
          description: formData.footer.description.trim(),
          address: formData.footer.address.trim(),
          phone: formData.footer.phone.trim(),
          email: formData.footer.email.trim(),
          socialLinks: {
            facebook: formData.footer.socialLinks.facebook.trim(),
            linkedin: formData.footer.socialLinks.linkedin.trim(),
            twitter: formData.footer.socialLinks.twitter.trim(),
          },
        },
        updatedAt: new Date().toISOString(),
        createdAt: branding.createdAt || new Date().toISOString(),
      }

      // Update branding in Firestore
      await updateBranding(brandingData)

      // Refresh branding to update all components
      await refreshBranding()

      toast.success("Branding settings updated successfully!", {
        icon: <CheckCircle2 className="w-4 h-4" />,
        description: "Your changes have been saved and will appear across the site.",
        duration: 4000,
      })
      
      // Clear file inputs if removed
      if (!logoPreview && fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      if (!faviconPreview && faviconInputRef.current) {
        faviconInputRef.current.value = ""
      }
    } catch (err) {
      console.error("Error updating branding:", err)
      toast.error("Failed to update branding settings", {
        icon: <AlertCircle className="w-4 h-4" />,
        description: err.message || "Please try again later.",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  if (brandingLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading branding settings...</p>
        </div>
      </div>
    )
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
        {/* Floating Banner */}
        <AdminPageBanner
          icon={Palette}
          title="Branding Settings"
          description="Customize your website logo, name, and favicon"
        />

        {/* Content */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Branding Settings
                  </h1>
                  <p className="text-muted-foreground text-lg mt-1">Customize your brand identity</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Changes will reflect across all pages instantly</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Settings Form - Takes 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Logo Upload */}
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/50">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Logo</h2>
                        <p className="text-sm text-muted-foreground">Your main brand logo</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {logoPreview ? (
                        <div className="relative inline-block group">
                          <div className="relative bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-6 border-2 border-border/50">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="max-w-full max-h-48 object-contain"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="absolute -top-3 -right-3 w-10 h-10 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-all shadow-lg hover:scale-110 backdrop-blur-sm"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/40 hover:to-muted/20 transition-all">
                          <ImageIcon className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground mb-2">No logo uploaded</p>
                          <p className="text-xs text-muted-foreground">Upload an image to get started</p>
                        </div>
                      )}

                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "logo")}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-border rounded-xl bg-input hover:bg-input/80 cursor-pointer transition-all font-medium hover:border-primary/50 hover:shadow-md"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Choose Logo Image</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-3">
                          Recommended: PNG or SVG format, max 2MB. Will appear in header, sidebar, and login pages.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/50">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center">
                        <Globe className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Favicon</h2>
                        <p className="text-sm text-muted-foreground">Browser tab icon</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {faviconPreview ? (
                        <div className="relative inline-block group">
                          <div className="relative bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-6 border-2 border-border/50">
                            <img
                              src={faviconPreview}
                              alt="Favicon preview"
                              className="w-16 h-16 object-contain"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveFavicon}
                              className="absolute -top-3 -right-3 w-10 h-10 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-all shadow-lg hover:scale-110 backdrop-blur-sm"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/40 hover:to-muted/20 transition-all">
                          <Globe className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground mb-2">No favicon uploaded</p>
                          <p className="text-xs text-muted-foreground">Upload a square image (16x16 or 32x32 recommended)</p>
                        </div>
                      )}

                      <div>
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "favicon")}
                          className="hidden"
                          id="favicon-upload"
                        />
                        <label
                          htmlFor="favicon-upload"
                          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-border rounded-xl bg-input hover:bg-input/80 cursor-pointer transition-all font-medium hover:border-accent/50 hover:shadow-md"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Choose Favicon Image</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-3">
                          Recommended: Square PNG or ICO format, 16x16 or 32x32 pixels, max 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/50">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                        <span className="text-primary font-bold text-xl">N</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Website Name</h2>
                        <p className="text-sm text-muted-foreground">Your brand name</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="iScholar"
                        className="w-full px-4 py-3 border-2 border-border rounded-xl bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        This name will appear in the header, sidebar, and login page
                      </p>
                    </div>
                  </div>

                  {/* Tab Title */}
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/50">
                      <div className="w-12 h-12 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl flex items-center justify-center">
                        <span className="text-secondary font-bold text-xl">T</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Tab Title</h2>
                        <p className="text-sm text-muted-foreground">Browser tab title</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Browser Tab Title
                      </label>
                      <input
                        type="text"
                        value={formData.tabTitle}
                        onChange={(e) => setFormData({ ...formData, tabTitle: e.target.value })}
                        placeholder="iScholar Portal"
                        className="w-full px-4 py-3 border-2 border-border rounded-xl bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        This will appear in the browser tab title
                      </p>
                    </div>
                  </div>

                  {/* Footer Settings */}
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/50">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center">
                        <span className="text-accent font-bold text-xl">F</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Footer Settings</h2>
                        <p className="text-sm text-muted-foreground">Customize footer content</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                          Description
                        </label>
                        <textarea
                          value={formData.footer.description}
                          onChange={(e) => setFormData({
                            ...formData,
                            footer: { ...formData.footer, description: e.target.value }
                          })}
                          placeholder="Making scholarship management simple and accessible for all MinSU students."
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-border rounded-xl bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                        />
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                          Address
                        </label>
                        <input
                          type="text"
                          value={formData.footer.address}
                          onChange={(e) => setFormData({
                            ...formData,
                            footer: { ...formData.footer, address: e.target.value }
                          })}
                          placeholder="Mariano Jhocson Street, Diliman, Quezon City"
                          className="w-full px-4 py-3 border-2 border-border rounded-xl bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={formData.footer.phone}
                          onChange={(e) => setFormData({
                            ...formData,
                            footer: { ...formData.footer, phone: e.target.value }
                          })}
                          placeholder="(+63) 2 8981-8500"
                          className="w-full px-4 py-3 border-2 border-border rounded-xl bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.footer.email}
                          onChange={(e) => setFormData({
                            ...formData,
                            footer: { ...formData.footer, email: e.target.value }
                          })}
                          placeholder="osas@minsu.ph"
                          className="w-full px-4 py-3 border-2 border-border rounded-xl bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>

                      {/* Social Links */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                          Social Media Links
                        </label>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">Facebook URL</label>
                            <input
                              type="url"
                              value={formData.footer.socialLinks.facebook}
                              onChange={(e) => setFormData({
                                ...formData,
                                footer: {
                                  ...formData.footer,
                                  socialLinks: { ...formData.footer.socialLinks, facebook: e.target.value }
                                }
                              })}
                              placeholder="https://facebook.com/..."
                              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">LinkedIn URL</label>
                            <input
                              type="url"
                              value={formData.footer.socialLinks.linkedin}
                              onChange={(e) => setFormData({
                                ...formData,
                                footer: {
                                  ...formData.footer,
                                  socialLinks: { ...formData.footer.socialLinks, linkedin: e.target.value }
                                }
                              })}
                              placeholder="https://linkedin.com/..."
                              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">Twitter/X URL</label>
                            <input
                              type="url"
                              value={formData.footer.socialLinks.twitter}
                              onChange={(e) => setFormData({
                                ...formData,
                                footer: {
                                  ...formData.footer,
                                  socialLinks: { ...formData.footer.socialLinks, twitter: e.target.value }
                                }
                              })}
                              placeholder="https://twitter.com/... or https://x.com/..."
                              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save All Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Preview - Takes 1 column */}
              <div className="lg:sticky lg:top-6 h-fit">
                <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
                    <Eye className="w-5 h-5 text-accent" />
                    <h2 className="text-xl font-bold text-foreground">Live Preview</h2>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></span>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Tab Title Preview */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-3">Browser Tab</p>
                      <div className="bg-muted border border-border rounded-t-lg p-2.5 flex items-center gap-2 shadow-sm">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded px-3 py-1.5">
                          {faviconPreview && (
                            <img src={faviconPreview} alt="Favicon" className="w-4 h-4" />
                          )}
                          <span className="text-xs text-foreground truncate font-medium">
                            {formData.tabTitle || "iScholar Portal"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Welcome Page Header Preview */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-3">Welcome Page Header</p>
                      <div className="bg-white border border-border rounded-lg p-4 shadow-md">
                        <div className="flex items-center gap-2">
                          {logoPreview ? (
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs">
                              iS
                            </div>
                          )}
                          <span className="font-bold text-primary text-sm">
                            {formData.name || "iScholar"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Sidebar Preview */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-3">Admin Sidebar</p>
                      <div className="bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 rounded-lg p-4 border border-sidebar-border shadow-md">
                        <div className="flex items-center gap-2">
                          {logoPreview ? (
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="w-8 h-8 object-contain bg-sidebar-accent/20 rounded-lg p-1"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-sidebar-accent rounded-lg flex items-center justify-center font-bold text-sidebar text-xs">
                              iA
                            </div>
                          )}
                          <span className="font-bold text-sidebar-foreground text-sm">
                            {formData.name || "iScholar"} Admin
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Student Sidebar Preview */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-3">Student Sidebar</p>
                      <div className="bg-gradient-to-b from-primary via-primary to-secondary rounded-lg p-4 border border-primary/20 shadow-md">
                        <div className="flex items-center gap-3">
                          {logoPreview ? (
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="w-10 h-10 object-contain bg-white/10 rounded-xl p-1"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-bold text-primary text-sm">
                              iS
                            </div>
                          )}
                          <span className="font-bold text-white text-base">
                            {formData.name || "iScholar"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Login Preview */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-3">Admin Login Page</p>
                      <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-5 border border-primary/20 shadow-md">
                        <div className="text-center">
                          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                            {logoPreview ? (
                              <img 
                                src={logoPreview} 
                                alt="Logo preview" 
                                className="w-12 h-12 object-contain p-1"
                              />
                            ) : (
                              <span className="text-xl font-bold text-primary">iA</span>
                            )}
                          </div>
                          <p className="text-white font-semibold text-sm">
                            {formData.name || "iScholar"} Portal Administration
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}
