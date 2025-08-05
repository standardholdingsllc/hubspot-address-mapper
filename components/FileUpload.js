import { useState, useCallback } from 'react';

export default function FileUpload({ onFileUploaded }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    setError('');
    setUploading(true);

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('Please select an Excel file (.xlsx or .xls)');
      setUploading(false);
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onFileUploaded(data);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Excel File</h2>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          {uploading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600">Uploading and validating file...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Drop your Excel file here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports .xlsx and .xls files up to 10MB
              </p>
              <p className="text-xs text-gray-400">
                Make sure your file has an "AddressStreet" column
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Requirements:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Excel file must contain an "AddressStreet" column</li>
          <li>File size should be under 10MB</li>
          <li>Supported formats: .xlsx, .xls</li>
        </ul>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Three new columns (Company, Company Name, Lifestyle Stage) 
            will be automatically inserted after the AddressStreet column during upload.
          </p>
        </div>
      </div>
    </div>
  );
} 