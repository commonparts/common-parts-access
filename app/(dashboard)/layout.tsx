import Navbar from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <Navbar />
        <div className="flex-1 flex flex-col w-full">
          <main>{children}</main>
        </div>
      </div>
      <Footer />
    </div>
  )
}