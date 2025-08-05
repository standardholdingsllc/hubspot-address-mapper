import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ExcludedNamesPage() {
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'json'
  const [newUsername, setNewUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNames();
  }, []);

  const fetchNames = async () => {
    try {
      const response = await fetch('/api/names');
      const data = await response.json();
      if (data.success) {
        setNames(data.names);
      }
    } catch (error) {
      console.error('Error fetching names:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setAdding(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Added "${data.username}" to exclusion list`);
        setNewUsername('');
        fetchNames(); // Refresh the list
      } else {
        setError(data.error || 'Failed to add username');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUsername = async (username) => {
    if (!confirm(`Remove "${username}" from exclusion list?`)) return;

    try {
      const response = await fetch('/api/names', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Removed "${username}" from exclusion list`);
        fetchNames(); // Refresh the list
      } else {
        setError(data.error || 'Failed to remove username');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const filteredNames = names.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <title>Excluded Usernames - HubSpot Address Mapper</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Excluded Usernames</h1>
              <p className="text-gray-600 mt-2">{names.length} usernames will be filtered out during processing</p>
            </div>
            <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200">
              ← Back to Home
            </Link>
          </div>

          {/* Add New Username */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Username</h2>
            <form onSubmit={handleAddUsername} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username to Exclude
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  disabled={adding}
                />
              </div>
              <button
                type="submit"
                disabled={adding || !newUsername.trim()}
                className={`px-6 py-2 rounded-lg transition duration-200 ${
                  adding || !newUsername.trim()
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </form>

            {message && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{message}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Search and View Controls */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search usernames..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition duration-200 ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  List View
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
              Showing {filteredNames.length} of {names.length} usernames
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-md">
            {viewMode === 'list' ? (
              <div className="p-6">
                {filteredNames.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {searchTerm ? 'No usernames found matching your search.' : 'No excluded usernames found.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredNames.map((username) => (
                      <div key={username} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-mono text-gray-900">{username}</span>
                        <button
                          onClick={() => handleDeleteUsername(username)}
                          className="text-red-600 hover:text-red-800 text-sm transition duration-200"
                          title="Remove from exclusion list"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm max-h-96">
                  {JSON.stringify(filteredNames, null, 2)}
                </pre>
                {filteredNames.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No usernames found matching your search.</p>
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