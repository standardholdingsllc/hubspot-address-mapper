import { useState } from 'react';

export default function ProcessingResults({ fileId, onProcessingComplete, onReset }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleProcess = async () => {
    setProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      const data = await response.json();

      if (data.success) {
        onProcessingComplete(data);
      } else {
        setError(data.error || 'Processing failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={handleProcess}
          disabled={processing}
          className={`flex-1 font-bold py-3 px-6 rounded-lg transition duration-200 ${
            processing
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Process File'
          )}
        </button>
        
        <button
          onClick={onReset}
          disabled={processing}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200"
        >
          Cancel
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <p className="mb-2">This will:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Match addresses to existing company mappings</li>
          <li>Fill Company, Company Name, and Lifestyle Stage columns</li>
          <li>Leave Company fields empty for unmatched addresses</li>
          <li>Generate a downloadable Excel file</li>
        </ul>
      </div>
    </div>
  );
} 