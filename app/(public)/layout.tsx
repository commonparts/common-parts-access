import Navbar from "@/components/layout/navbar"

export default function PublicLayout({
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
      <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-sm gap-8 py-8 bg-background/50 backdrop-blur-sm">
        <p>
          Footer content here. Made with ❤️ by me.
        </p>
      </footer>
    </div>
  )
}