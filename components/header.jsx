"use client";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                KMS AI Flow
              </h1>
              <p className="text-sm text-gray-600">
                KMS + AI 赋能平台
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}