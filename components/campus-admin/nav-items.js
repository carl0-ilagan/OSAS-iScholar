import { LayoutDashboard, Users, FileText, Award, MessageSquare, Video } from "lucide-react"

export const campusAdminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/campus-admin" },
  { icon: Users, label: "User Management", href: "/campus-admin/users" },
  { icon: FileText, label: "Applications", href: "/campus-admin/applications" },
  { icon: Award, label: "Scholarships", href: "/campus-admin/scholarships" },
  { icon: MessageSquare, label: "Testimonials", href: "/campus-admin/testimonials" },
  { icon: Video, label: "Consultations", href: "/campus-admin/consultations" },
]
