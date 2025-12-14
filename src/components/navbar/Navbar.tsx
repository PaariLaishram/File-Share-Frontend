import Settings from "../common/Settings";


export default function Navbar() {
  return (
    <nav className="bg-[#F7F5F2] w-full py-4">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <a href="/" className="text-gray-800 font-medium text-lg hover:text-gray-600 transition">
          Home
        </a>
        <Settings />
      </div>
    </nav>
  );
}
