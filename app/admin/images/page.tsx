'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  slug: string;
  title: string;
  description?: string;
  is_published: boolean;
  node_count: number;
}

interface GenerationResult {
  nodeId: string;
  status: 'success' | 'skipped' | 'error';
  imageUrl?: string;
  error?: string;
  cost?: number;
  model?: string;
}

export default function ImageGenerator() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [resolveResults, setResolveResults] = useState<any[]>([]);
  const [generationSettings, setGenerationSettings] = useState({
    model: 'dalle3',
    style: 'fantasy adventure book illustration',
    size: '1024x1024',
    quality: 'standard',
    replaceExisting: false,
  });

  // Check if user is logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    if (!isLoggedIn) {
      router.push('/admin/login');
    }
  }, [router]);

  // Load stories on component mount
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch('/api/admin/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBulkImages = async () => {
    if (!selectedStory) {
      alert('Please select a story');
      return;
    }

    setGenerating(true);
    setResults([]);

    try {
      const response = await fetch('/api/admin/generate-bulk-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storySlug: selectedStory,
          ...generationSettings,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        alert(`✅ Generated ${data.summary.successful} images successfully! Total cost: $${data.summary.totalCost}`);
      } else {
        alert(`❌ Generation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('❌ Generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleResolveAssets = async () => {
    if (!selectedStory) {
      alert('Please select a story');
      return;
    }

    setResolving(true);
    setResolveResults([]);

    try {
      const response = await fetch('/api/admin/resolve-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storySlug: selectedStory,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResolveResults(data.results || []);
        alert(`✅ Resolved ${data.summary.successful} asset references!`);
      } else {
        alert(`❌ Asset resolution failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Asset resolution error:', error);
      alert('❌ Asset resolution failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setResolving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    router.push('/admin/login');
  };

  const selectedStoryData = stories.find(s => s.slug === selectedStory);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🎨 AI Image Generator
            </h1>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                ← Back to Admin
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading stories...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Story Selection */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  📚 Select Story
                </h2>
                <select
                  value={selectedStory}
                  onChange={(e) => setSelectedStory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a story...</option>
                  {stories.map((story) => (
                    <option key={story.slug} value={story.slug}>
                      {story.title} ({story.node_count} nodes)
                    </option>
                  ))}
                </select>
                
                {selectedStoryData && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900">{selectedStoryData.title}</h3>
                    {selectedStoryData.description && (
                      <p className="text-blue-700 mt-1">{selectedStoryData.description}</p>
                    )}
                    <p className="text-blue-600 text-sm mt-2">
                      {selectedStoryData.node_count} nodes • {selectedStoryData.is_published ? 'Published' : 'Draft'}
                    </p>
                  </div>
                )}
              </div>

              {/* Generation Settings */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  ⚙️ Generation Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select
                      value={generationSettings.model}
                      onChange={(e) => setGenerationSettings(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="dalle3">DALL-E 3 (High Quality, $0.04/image)</option>
                      <option value="stable-diffusion">Stable Diffusion (Good Quality, $0.0023/image)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style
                    </label>
                    <input
                      type="text"
                      value={generationSettings.style}
                      onChange={(e) => setGenerationSettings(prev => ({ ...prev, style: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="fantasy adventure book illustration"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size
                    </label>
                    <select
                      value={generationSettings.size}
                      onChange={(e) => setGenerationSettings(prev => ({ ...prev, size: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1024x1024">1024x1024 (Square)</option>
                      <option value="1024x1792">1024x1792 (Portrait)</option>
                      <option value="1792x1024">1792x1024 (Landscape)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality
                    </label>
                    <select
                      value={generationSettings.quality}
                      onChange={(e) => setGenerationSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="standard">Standard</option>
                      <option value="hd">HD (Higher Cost)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={generationSettings.replaceExisting}
                      onChange={(e) => setGenerationSettings(prev => ({ ...prev, replaceExisting: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Replace existing images
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleResolveAssets}
                    disabled={!selectedStory || resolving}
                    className="bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-semibold"
                  >
                    {resolving ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Resolving Assets...
                      </span>
                    ) : (
                      '🔗 Resolve Asset References'
                    )}
                  </button>
                  
                  <button
                    onClick={handleGenerateBulkImages}
                    disabled={!selectedStory || generating}
                    className="bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-semibold"
                  >
                    {generating ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Generating Images...
                      </span>
                    ) : (
                      '🎨 Generate All Images'
                    )}
                  </button>
                </div>
              </div>

              {/* Resolve Results */}
              {resolveResults.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    🔗 Asset Resolution Results
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Node</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cloudinary URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {resolveResults.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.nodeId}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                result.status === 'success' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.originalReference || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {result.cloudinaryUrl ? (
                                <a
                                  href={result.cloudinaryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  View Image
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    📊 Generation Results
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Node</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {results.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.nodeId}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                result.status === 'success' 
                                  ? 'bg-green-100 text-green-800'
                                  : result.status === 'skipped'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {result.imageUrl ? (
                                <a
                                  href={result.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  View Image
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.cost ? `$${result.cost.toFixed(4)}` : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.model || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Help Section */}
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  💡 How It Works
                </h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Option 1: Asset References (Recommended)</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>In your Google Sheet, use "image-1", "image-2", etc. in the image column</li>
                    <li>Upload your CSV to the admin dashboard</li>
                    <li>Click "Resolve Asset References" to convert references to Cloudinary URLs</li>
                    <li>Then generate AI images to replace the references</li>
                  </ul>
                  
                  <p><strong>Option 2: Direct AI Generation</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Select a story and configure AI settings</li>
                    <li>Click "Generate All Images" to create images for each node</li>
                    <li>AI will analyze story text and create appropriate images</li>
                  </ul>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">💰 Cost Estimates:</h4>
                    <ul className="text-blue-700 space-y-1">
                      <li>• DALL-E 3: ~$0.04 per image (high quality)</li>
                      <li>• Stable Diffusion: ~$0.0023 per image (good quality)</li>
                      <li>• 50 images = $2.00 (DALL-E) or $0.12 (Stable Diffusion)</li>
                    </ul>
                  </div>
                  
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">📝 Google Sheets Format:</h4>
                    <p className="text-green-700">Use these values in your image column:</p>
                    <ul className="text-green-700 space-y-1 mt-2">
                      <li>• <code>image-1</code> - First image reference</li>
                      <li>• <code>image-2</code> - Second image reference</li>
                      <li>• <code>video-1</code> - First video reference</li>
                      <li>• <code>https://example.com/image.jpg</code> - Direct URL (used as-is)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
