export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <a href="/settings/profile" className="border-b-2 border-blue-500 py-2 px-4 text-sm font-medium text-blue-600">Profile</a>
            <a href="/settings/account" className="border-b-2 border-transparent py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">Account</a>
            <a href="/settings/preferences" className="border-b-2 border-transparent py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">Preferences</a>
          </nav>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Settings interface will be implemented here</p>
        </div>
      </div>
    </div>
  )
}