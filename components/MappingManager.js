import { useState } from 'react';

export default function MappingManager({ mappings, onMappingAdded }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMappings, setShowMappings] = useState(false);
  const [formData, setFormData] = useState({
    addressStreet: '',
    company: '',
    companyName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Mapping added successfully!');
        setFormData({ addressStreet: '', company: '', companyName: '' });
        setShowAddForm(false);
        onMappingAdded();
      } else {
        setError(data.error || 'Failed to add mapping');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Add mapping error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const mappingEntries = Object.entries(mappings);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Address Mappings</h2>
      
      <div className="space-y-4">
        {/* Stats */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{mappingEntries.length}</div>
          <div className="text-sm text-gray-600">Total Mappings</div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Add Mapping Button */}
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError('');
            setSuccess('');
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
        >
          {showAddForm ? 'Cancel' : 'Add New Mapping'}
        </button>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Street
              </label>
              <input
                type="text"
                name="addressStreet"
                value={formData.addressStreet}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main St"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company ID
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="12345678901"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Acme Corp"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full font-medium py-2 px-4 rounded-lg transition duration-200 ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {submitting ? 'Adding...' : 'Add Mapping'}
            </button>
          </form>
        )}

        {/* View Mappings Button */}
        <button
          onClick={() => setShowMappings(!showMappings)}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
        >
          {showMappings ? 'Hide Mappings' : 'View All Mappings'}
        </button>

        {/* Mappings List */}
        {showMappings && (
          <div className="border-t pt-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">All Mappings</h3>
            {mappingEntries.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No mappings found.</p>
            ) : (
              <div className="space-y-2">
                {mappingEntries.map(([address, mapping]) => (
                  <div key={address} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="font-medium text-gray-900 truncate" title={address}>
                      {address}
                    </div>
                    <div className="text-gray-600 mt-1">
                      <div>ID: {mapping.Company}</div>
                      <div className="truncate" title={mapping['Company Name']}>
                        {mapping['Company Name']}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 