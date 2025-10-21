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

interface StoryNode {
  node_key: string;
  text_md: string;
  image_url?: string;
}

interface ImageRow {
  id: string;
  node_key: string;
  text: string;
  image_url: string;
  status: 'empty' | 'generating' | 'ready' | 'error';
  generated_at?: string;
  cost?: number;
}

export default function SimpleImageManager() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [nodes, setNodes] = useState<StoryNode[]>([]);
  const [imageRows, setImageRows] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

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

  // Load nodes when story changes
  useEffect(() => {
    if (selectedStory) {
      loadStoryNodes();
    } else {
      setNodes([]);
      setImageRows([]);
    }
  }, [selectedStory]);

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

  const loadStoryNodes = async () => {
    try {
      const response = await fetch(`/api/stories/${selectedStory}`);
      if (response.ok) {
        const data = await response.json();
        setNodes(data.nodes || []);
        
        // Create image rows for each node
        const rows: ImageRow[] = data.nodes.map((node: StoryNode) => ({
          id: `node-${node.node_key}`,
          node_key: node.node_key,
          text: node.text_md,
          image_url: node.image_url || '',
          status: node.image_url ? 'ready' : 'empty',
          generated_at: node.image_url ? new Date().toISOString() : undefined,
          cost: 0
        }));
        
        setImageRows(rows);
      }
    } catch (error) {
      console.error('Failed to load story nodes:', error);
    }
  };

  const generateImage = async (nodeKey: string) => {
    if (!selectedStory) return;
    
    setGenerating(nodeKey);
    
    try {
      const response = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeKey: nodeKey,
          style: 'fantasy adventure book illustration',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the image row
        setImageRows(prev => prev.map(row => 
          row.node_key === nodeKey 
            ? { 
                ...row, 
                image_url: data.imageUrl, 
                status: 'ready',
                generated_at: new Date().toISOString(),
                cost: data.cost || 0
              }
            : row
        ));
        
        // Reload story nodes to update the database
        loadStoryNodes();
      } else {
        // Mark as error
        setImageRows(prev => prev.map(row => 
          row.node_key === nodeKey 
            ? { ...row, status: 'error' }
            : row
        ));
        alert(`❌ Failed to generate image: ${data.error}`);
      }
    } catch (error) {
      console.error('Image generation error:', error);
      setImageRows(prev => prev.map(row => 
        row.node_key === nodeKey 
          ? { ...row, status: 'error' }
          : row
      ));
      alert('❌ Failed to generate image');
    } finally {
      setGenerating(null);
    }
  };

  const redoImage = async (nodeKey: string) => {
    // Mark as empty and regenerate
    setImageRows(prev => prev.map(row => 
      row.node_key === nodeKey 
        ? { ...row, image_url: '', status: 'empty' }
        : row
    ));
    
    // Generate new image
    await generateImage(nodeKey);
  };

  const deleteImage = async (nodeKey: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      // Update the image row
      setImageRows(prev => prev.map(row => 
        row.node_key === nodeKey 
          ? { ...row, image_url: '', status: 'empty' }
          : row
      ));
      
      // Update the database
      const response = await fetch(`/api/stories/${selectedStory}/nodes/${nodeKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: null
        }),
      });

      if (!response.ok) {
        alert('❌ Failed to delete image');
      }
    } catch (error) {
      console.error('Delete image error:', error);
      alert('❌ Failed to delete image');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    router.push('/admin/login');
  };

  const selectedStoryData = stories.find(s => s.slug === selectedStory);
  const totalCost = imageRows.reduce((sum, row) => sum + (row.cost || 0), 0);
  const readyImages = imageRows.filter(row => row.status === 'ready').length;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🖼️ Simple Image Manager
            </h1>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                ← Back to Admin
              </button>
              <button
                onClick={() => router.push('/admin/images')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                🎨 AI Images
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

              {/* Image Spreadsheet */}
              {selectedStory && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">
                      🖼️ Story Images
                    </h2>
                    <div className="text-sm text-gray-600">
                      {readyImages} / {imageRows.length} images ready • Total cost: ${totalCost.toFixed(2)}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Node</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Text</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Image</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imageRows.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                              {row.node_key}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 max-w-md">
                              <div className="text-sm text-gray-700 line-clamp-3">
                                {row.text.substring(0, 100)}...
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {row.image_url ? (
                                <div className="flex items-center space-x-2">
                                  <img
                                    src={row.image_url}
                                    alt={`Node ${row.node_key}`}
                                    className="w-16 h-16 object-cover rounded border"
                                  />
                                  <button
                                    onClick={() => window.open(row.image_url, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    👁️ See
                                  </button>
                                </div>
                              ) : (
                                <div className="text-gray-400 text-sm">No image</div>
                              )}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <div className="flex space-x-2">
                                {row.status === 'empty' && (
                                  <button
                                    onClick={() => generateImage(row.node_key)}
                                    disabled={generating === row.node_key}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                                  >
                                    {generating === row.node_key ? '⏳ Generating...' : '🎨 Make Image'}
                                  </button>
                                )}
                                
                                {row.status === 'ready' && (
                                  <>
                                    <button
                                      onClick={() => redoImage(row.node_key)}
                                      className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                                    >
                                      🔄 Redo
                                    </button>
                                    <button
                                      onClick={() => deleteImage(row.node_key)}
                                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </>
                                )}
                                
                                {row.status === 'error' && (
                                  <button
                                    onClick={() => generateImage(row.node_key)}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                  >
                                    🔄 Retry
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                row.status === 'ready' 
                                  ? 'bg-green-100 text-green-800'
                                  : row.status === 'generating'
                                  ? 'bg-blue-100 text-blue-800'
                                  : row.status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {row.status === 'ready' && '✅ Ready'}
                                {row.status === 'generating' && '⏳ Generating...'}
                                {row.status === 'error' && '❌ Error'}
                                {row.status === 'empty' && '⚪ Empty'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {imageRows.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-6xl mb-4">📖</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Story Nodes Found</h3>
                      <p className="text-gray-600">This story doesn't have any nodes yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
