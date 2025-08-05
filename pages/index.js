import { useState, useEffect } from 'react';
import Head from 'next/head';
import FileUpload from '../components/FileUpload';
import MappingManager from '../components/MappingManager';
import ProcessingResults from '../components/ProcessingResults';

export default function Home() {
  const [currentStep, setCurrentStep] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processingResults, setProcessingResults] = useState(null);
  const [mappings, setMappings] = useState({});

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/mappings');
      const data = await response.json();
      if (data.success) {
        setMappings(data.mappings);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const handleFileUploaded = (fileData) => {
    setUploadedFile(fileData);
    setCurrentStep('process');
  };

  const handleProcessingComplete = (results) => {
    setProcessingResults(results);
    setCurrentStep('results');
  };

  const handleMappingAdded = () => {
    fetchMappings();
  };

  const resetProcess = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setProcessingResults(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>HubSpot Address Mapper</title>
        <meta name="description" content="Map addresses to company information for HubSpot imports" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              HubSpot Address Mapper
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload your Excel file and automatically map addresses to company information. 
              Add new mappings as needed and download the processed file.
            </p>
          </header>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : currentStep === 'process' || currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'upload' ? 'border-blue-600 bg-blue-100' : currentStep === 'process' || currentStep === 'results' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                  1
                </div>
                <span className="ml-2 font-medium">Upload</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'process' ? 'text-blue-600' : currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'process' ? 'border-blue-600 bg-blue-100' : currentStep === 'results' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Process</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className={`flex items-center ${currentStep === 'results' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'results' ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`}>
                  3
                </div>
                <span className="ml-2 font-medium">Results</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {currentStep === 'upload' && (
                <FileUpload onFileUploaded={handleFileUploaded} />
              )}

              {currentStep === 'process' && uploadedFile && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Process File</h2>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900">File Information</h3>
                    <p className="text-blue-700">Name: {uploadedFile.fileName}</p>
                    <p className="text-blue-700">Rows: {uploadedFile.rowCount}</p>
                    <p className="text-blue-700">AddressStreet Column: {uploadedFile.addressStreetColumn}</p>
                    <p className="text-blue-700">Columns Added: {uploadedFile.columnsAdded?.join(', ')}</p>
                    {uploadedFile.message && (
                      <p className="text-blue-600 font-medium mt-2">{uploadedFile.message}</p>
                    )}
                  </div>
                  <ProcessingResults 
                    fileId={uploadedFile.fileId}
                    onProcessingComplete={handleProcessingComplete}
                    onReset={resetProcess}
                  />
                </div>
              )}

              {currentStep === 'results' && processingResults && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Processing Complete</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{processingResults.totalRows}</div>
                        <div className="text-sm text-blue-700">Total Rows</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{processingResults.matchedCount}</div>
                        <div className="text-sm text-green-700">Matched</div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{processingResults.unmatchedCount}</div>
                        <div className="text-sm text-orange-700">Unmatched</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <a
                        href={`/api/download?fileName=${processingResults.outputFileName}`}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-center transition duration-200"
                        download
                      >
                        Download Processed File
                      </a>
                      <button
                        onClick={resetProcess}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                      >
                        Process Another File
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <MappingManager 
                mappings={mappings}
                onMappingAdded={handleMappingAdded}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 