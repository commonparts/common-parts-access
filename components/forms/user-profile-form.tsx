import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"

interface UserProfileData {
  username: string
  email: string
  firstName: string
  lastName: string
  bio: string
  website: string
  location: string
  company: string
  avatar?: File
  socialLinks: {
    twitter?: string
    github?: string
    linkedin?: string
    behance?: string
  }
  preferences: {
    publicProfile: boolean
    emailNotifications: boolean
    marketingEmails: boolean
  }
}

interface UserProfileFormProps {
  initialData?: Partial<UserProfileData>
  onSubmit: (data: UserProfileData) => void
  loading?: boolean
  className?: string
}

export function UserProfileForm({ 
  initialData, 
  onSubmit, 
  loading = false, 
  className 
}: UserProfileFormProps) {
  const [formData, setFormData] = React.useState<UserProfileData>({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    bio: "",
    website: "",
    location: "",
    company: "",
    socialLinks: {},
    preferences: {
      publicProfile: true,
      emailNotifications: true,
      marketingEmails: false
    },
    ...initialData
  })

  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, avatar: file }))
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const updateField = <K extends keyof UserProfileData>(field: K, value: UserProfileData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateSocialLink = (platform: keyof UserProfileData['socialLinks'], value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }))
  }

  const updatePreference = (key: keyof UserProfileData['preferences'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }))
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20">
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover rounded-full" width={80} height={80} unoptimized />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </Avatar>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <Label htmlFor="avatar-upload">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Change Picture</span>
                </Button>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG or WebP. Max size: 2MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => updateField('username', e.target.value)}
              placeholder="Choose a unique username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Tell others about yourself..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Your company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://your-website.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                type="text"
                value={formData.socialLinks.twitter || ''}
                onChange={(e) => updateSocialLink('twitter', e.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                type="text"
                value={formData.socialLinks.github || ''}
                onChange={(e) => updateSocialLink('github', e.target.value)}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                type="text"
                value={formData.socialLinks.linkedin || ''}
                onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                placeholder="in/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="behance">Behance</Label>
              <Input
                id="behance"
                type="text"
                value={formData.socialLinks.behance || ''}
                onChange={(e) => updateSocialLink('behance', e.target.value)}
                placeholder="username"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Public Profile</Label>
              <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
            </div>
            <input
              type="checkbox"
              checked={formData.preferences.publicProfile}
              onChange={(e) => updatePreference('publicProfile', e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications about your models and activity</p>
            </div>
            <input
              type="checkbox"
              checked={formData.preferences.emailNotifications}
              onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
            </div>
            <input
              type="checkbox"
              checked={formData.preferences.marketingEmails}
              onChange={(e) => updatePreference('marketingEmails', e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.username || !formData.email}>
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  )
}