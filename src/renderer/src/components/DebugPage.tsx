import React from 'react'

const DebugPage: React.FC = () => {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    VITE_DEV_MODE: import.meta.env.VITE_DEV_MODE,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">调试信息</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">环境变量</h2>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-lg font-semibold mb-4">Import Meta</h2>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(import.meta, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-lg font-semibold mb-4">Window Location</h2>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify({
              href: window.location.href,
              origin: window.location.origin,
              pathname: window.location.pathname,
              hash: window.location.hash,
              search: window.location.search
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default DebugPage
