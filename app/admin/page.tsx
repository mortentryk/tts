'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [storySlug, setStorySlug] = useState('');
  const [publishStory, setPublishStory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [showPricing, setShowPricing] = useState(false);
  const [editingStory, setEditingStory] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<{
    price: number;
    is_free: boolean;
    stripe_price_id: string;
  }>({
    price: 0,
    is_free: true,
    stripe_price_id: '',
  });
  const [savingPricing, setSavingPricing] = useState(false);

  // Check if user is logged in via server session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        router.push('/admin/login');
      }
    };
    checkSession();
  }, [router]);

  // Load stories on component mount
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch('/api/admin/stories', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoadingStories(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      // Clear localStorage for safety (legacy cleanup)
      localStorage.removeItem('admin_logged_in');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      router.push('/admin/login');
    }
  };

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
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, data });
        // Reload stories after successful upload
        loadStories();
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

  const handleTogglePublish = async (storySlug: string) => {
    try {
      console.log('🔄 Toggling publish for:', storySlug);
      const response = await fetch('/api/admin/toggle-publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ storySlug }),
      });

      const data = await response.json();
      console.log('📡 Toggle response:', data);

      if (response.ok) {
        console.log('✅ Toggle successful, reloading stories...');
        // Reload stories to show updated status
        loadStories();
      } else {
        console.error('❌ Toggle failed:', data);
        alert(data.error || 'Failed to toggle publish status');
      }
    } catch (error) {
      console.error('❌ Toggle error:', error);
      alert('Failed to toggle publish status');
    }
  };

  const handleDeleteStory = async (storySlug: string, storyTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${storyTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting story:', storySlug);
      const response = await fetch('/api/admin/delete-story', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ storySlug }),
      });

      const data = await response.json();
      console.log('📡 Delete response:', data);

      if (response.ok) {
        console.log('✅ Delete successful, reloading stories...');
        // Reload stories to remove deleted story
        loadStories();
      } else {
        console.error('❌ Delete failed:', data);
        alert(data.error || 'Failed to delete story');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('Failed to delete story');
    }
  };

  const handleEditPricing = (story: any) => {
    setEditingStory(story.id);
    setPricingData({
      price: story.price || 0,
      is_free: story.is_free !== false,
      stripe_price_id: story.stripe_price_id || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingStory(null);
    setPricingData({
      price: 0,
      is_free: true,
      stripe_price_id: '',
    });
  };

  const handleSavePricing = async (storyId: string) => {
    setSavingPricing(true);
    try {
      const updates: any = {
        price: Number(pricingData.price),
        is_free: pricingData.is_free,
      };

      // Only include stripe_price_id if it's provided
      if (pricingData.stripe_price_id.trim()) {
        updates.stripe_price_id = pricingData.stripe_price_id.trim();
      } else {
        updates.stripe_price_id = null;
      }

      const response = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Pricing updated successfully!');
        setEditingStory(null);
        loadStories(); // Reload to show updated data
      } else {
        alert(data.error || 'Failed to update pricing');
      }
    } catch (error) {
      console.error('❌ Pricing update error:', error);
      alert('Failed to update pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              📚 Story Admin Dashboard
            </h1>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/admin/characters')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                🎭 Characters
              </button>
              <button
                onClick={() => router.push('/admin/images/simple')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                🖼️ Images
              </button>
              <button
                onClick={() => router.push('/admin/journey')}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
              >
                🗺️ Journey Map
              </button>
              <button
                onClick={() => router.push('/admin/seo')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                🔍 SEO
              </button>
              <button
                onClick={() => setShowPricing(!showPricing)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
              >
                💰 Pricing
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {/* CSV Upload Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📤 Upload Story from CSV
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Story Slug (URL identifier)
                </label>
                <input
                  type="text"
                  value={storySlug}
                  onChange={(e) => setStorySlug(e.target.value)}
                  placeholder="e.g., cave-adventure, beauty-and-beast"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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

          {/* Pricing Management Section */}
          {showPricing && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                💰 Story Pricing Management
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Configure pricing for your stories. Set the price, mark as free, and link to Stripe Price ID.
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Story</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Free</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe Price ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stories.map((story) => (
                      <tr key={story.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{story.title}</div>
                          <div className="text-xs text-gray-500">{story.slug}</div>
                        </td>
                        <td className="px-4 py-4">
                          {editingStory === story.id ? (
                            <input
                              type="checkbox"
                              checked={pricingData.is_free}
                              onChange={(e) => setPricingData({ ...pricingData, is_free: e.target.checked })}
                              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                            />
                          ) : (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              story.is_free !== false
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {story.is_free !== false ? 'Free' : 'Paid'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {editingStory === story.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricingData.price}
                              onChange={(e) => setPricingData({ ...pricingData, price: parseFloat(e.target.value) || 0 })}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">
                              ${Number(story.price || 0).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {editingStory === story.id ? (
                            <input
                              type="text"
                              value={pricingData.stripe_price_id}
                              onChange={(e) => setPricingData({ ...pricingData, stripe_price_id: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 font-mono"
                              placeholder="price_xxxxxxxxxxxxx"
                            />
                          ) : (
                            <span className="text-xs text-gray-600 font-mono">
                              {story.stripe_price_id || 'Not set'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {editingStory === story.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSavePricing(story.id)}
                                disabled={savingPricing}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400"
                              >
                                {savingPricing ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={savingPricing}
                                className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditPricing(story)}
                              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">📝 Instructions:</h3>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Create a product in Stripe Dashboard → Products (Live mode)</li>
                  <li>Copy the Price ID (starts with <code className="bg-blue-100 px-1 rounded">price_</code>)</li>
                  <li>Paste it in the Stripe Price ID field for your story</li>
                  <li>Set the price to match your Stripe product price</li>
                  <li>Uncheck "Free" to make the story paid</li>
                </ul>
              </div>
            </div>
          )}

          {/* Story List Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📚 Your Stories
            </h2>
            
            {loadingStories ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading stories...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nodes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stories.map((story) => (
                      <tr key={story.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{story.title}</div>
                          {story.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{story.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{story.slug}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            story.is_published 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {story.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{story.click_count || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{story.node_count || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(story.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => router.push(`/story/${story.slug}`)}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => handleTogglePublish(story.slug)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              story.is_published
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {story.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDeleteStory(story.slug, story.title)}
                            className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {stories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No stories found. Upload a CSV to get started.
                  </div>
                )}
              </div>
            )}
          </div>

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