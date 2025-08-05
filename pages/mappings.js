import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function MappingsPage() {
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'json'
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/mappings');
      const data = await response.json();
      if (data.success) {
        setMappings(data.mappings);
        setServerInfo({
          serverless: data.serverless,
          githubEnabled: data.githubEnabled,
          note: data.note,
          totalMappings: data.totalMappings
        });
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMappings = Object.entries(mappings).filter(([address, mapping]) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      address.toLowerCase().includes(searchLower) ||
      mapping['Company Name'].toLowerCase().includes(searchLower) ||
      mapping.Company.toString().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Address Mappings - HubSpot Address Mapper</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Address Mappings</h1>
              <p className="text-gray-600 mt-2">{Object.keys(mappings).length} total mappings</p>
            </div>
            <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200">
              ← Back to Home
            </Link>
          </div>

          {/* Status Information */}
          {serverInfo && serverInfo.serverless && !serverInfo.githubEnabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Serverless Environment - No GitHub Integration
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Changes to address mappings are temporary and will reset when the application restarts. 
                      Configure GitHub integration for persistent storage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {serverInfo && serverInfo.githubEnabled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    GitHub Persistence Enabled
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      Changes to address mappings will be automatically saved to your GitHub repository and persist permanently.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and View Controls */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search addresses, company names, or IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg transition duration-200 ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-4 py-2 rounded-lg transition duration-200 ${
                    viewMode === 'json'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  JSON View
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Showing {filteredMappings.length} of {Object.keys(mappings).length} mappings
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-md">
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address Street
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMappings.map(([address, mapping]) => (
                      <tr key={address} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mapping.Company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mapping['Company Name']}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMappings.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No mappings found matching your search.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm max-h-96">
                  {JSON.stringify(
                    Object.fromEntries(filteredMappings),
                    null,
                    2
                  )}
                </pre>
                {filteredMappings.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No mappings found matching your search.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 