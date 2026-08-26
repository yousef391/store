import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-black mb-4">404</h1>
      <p className="text-gray-400 mb-6">الصفحة غير موجودة</p>
      <Link
        href="/"
        className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
      >
        العودة للمتجر
      </Link>
    </div>
  );
}
