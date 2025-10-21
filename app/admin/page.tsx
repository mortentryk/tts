'use client';

import { useState } from 'react';

export default function AdminDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [storySlug, setStorySlug] = useState('');
  const [publishStory, setPublishStory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !storySlug) {
      alert('Please select a file and enter a story slug');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('storySlug', storySlug);
      formData.append('publishStory', publishStory.toString());

      const response = await fetch('/api/admin/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, data });
      } else {
        setResult({ success: false, error: data.error || 'Upload failed' });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            📚 Story Admin Dashboard
          </h1>

          {/* CSV Upload Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📤 Upload Story from CSV
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Story Slug (URL identifier)
                </label>
                <input
                  type="text"
                  value={storySlug}
                  onChange={(e) => setStorySlug(e.target.value)}
                  placeholder="e.g., cave-adventure, beauty-and-beast"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="publishStory"
                  checked={publishStory}
                  onChange={(e) => setPublishStory(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="publishStory" className="ml-2 block text-sm text-gray-700">
                  Publish story immediately (make it visible on website)
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !file || !storySlug}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploading ? '📤 Uploading...' : '📤 Upload Story'}
              </button>
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div className={`p-4 rounded-md ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    ✅ Upload Successful!
                  </h3>
                  <div className="text-green-700">
                    <p><strong>Story:</strong> {result.data.story.title}</p>
                    <p><strong>Slug:</strong> {result.data.story.slug}</p>
                    <p><strong>Nodes:</strong> {result.data.story.nodes}</p>
                    <p><strong>Choices:</strong> {result.data.story.choices}</p>
                    <p><strong>Published:</strong> {result.data.story.published ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    ❌ Upload Failed
                  </h3>
                  <p className="text-red-700">{result.error}</p>
                </div>
              )}
            </div>
          )}

          {/* CSV Format Help */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📋 CSV Format Guide
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Required columns:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>id</code> - Node identifier (e.g., "1", "2", "3")</li>
                <li><code>text</code> - Story text content</li>
              </ul>
              
              <p><strong>Optional columns:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>valg1_label</code>, <code>valg1_goto</code> - First choice</li>
                <li><code>valg2_label</code>, <code>valg2_goto</code> - Second choice</li>
                <li><code>valg3_label</code>, <code>valg3_goto</code> - Third choice</li>
                <li><code>image</code> - Image URL for the scene</li>
                <li><code>check_stat</code>, <code>check_dc</code> - Dice check mechanics</li>
                <li><code>check_success</code>, <code>check_fail</code> - Dice check outcomes</li>
              </ul>

              <p><strong>Metadata (in first row):</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>story_title</code> - Story title</li>
                <li><code>story_description</code> - Story description</li>
                <li><code>front_screen_image</code> - Cover image URL</li>
                <li><code>length</code> - Estimated reading time</li>
                <li><code>age</code> - Target age group</li>
                <li><code>author</code> - Author name</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}