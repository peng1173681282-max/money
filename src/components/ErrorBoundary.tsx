import React, { useState, useEffect } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    let errorMessage = '发生了一些错误。';
    try {
      const parsed = JSON.parse(error?.message || '{}');
      if (parsed.error && parsed.error.includes('insufficient permissions')) {
        errorMessage = '权限不足，请检查您的登录状态或预算设置。';
      }
    } catch {
      // Not a JSON error
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-2">出错了</h2>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          刷新页面
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
