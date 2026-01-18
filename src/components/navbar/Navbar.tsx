import Settings from "../common/Settings";

export default function Navbar() {
  return (
    <nav className="bg-white w-full py-4 border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <a
          href="/"
          className="text-gray-900 font-semibold text-lg hover:text-blue-600 transition"
        >
          FileShare
        </a>
        <Settings />
      </div>
    </nav>
  );
}
