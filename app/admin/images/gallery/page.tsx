'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StoryImage {
  id: string;
  image_url: string;
  thumbnail_url: string;
  node_key?: string;
  characters: string[];
  generated_at: string;
  cost: number;
  model: string;
  prompt: string;
  status: 'generated' | 'assigned' | 'unused';
  width?: number;
  height?: number;
  image_assignments?: Array<{
    node_key: string;
    assigned_at: string;
  }>;
}

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
}

export default function ImageGallery() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [images, setImages] = useState<StoryImage[]>([]);
  const [nodes, setNodes] = useState<StoryNode[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    character: '',
    status: '',
    nodeKey: '',
  });
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentNodeKey, setAssignmentNodeKey] = useState('');

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

  // Load images when story changes
  useEffect(() => {
    if (selectedStory) {
      loadImageGallery();
    } else {
      setImages([]);
      setNodes([]);
      setCharacters([]);
    }
  }, [selectedStory, filters]);

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

  const loadImageGallery = async () => {
    try {
      const params = new URLSearchParams({
        storySlug: selectedStory,
        ...(filters.search && { search: filters.search }),
        ...(filters.character && { character: filters.character }),
        ...(filters.status && { status: filters.status }),
        ...(filters.nodeKey && { nodeKey: filters.nodeKey }),
      });

      const response = await fetch(`/api/admin/images/gallery?${params}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
        setNodes(data.nodes || []);
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error('Failed to load image gallery:', error);
    }
  };

  const handleImageSelect = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedImages.length === 0 || !assignmentNodeKey) {
      alert('Please select images and a story node');
      return;
    }

    try {
      const response = await fetch('/api/admin/images/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storySlug: selectedStory,
          operation: 'assign',
          imageIds: selectedImages,
          nodeKey: assignmentNodeKey,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Assigned ${selectedImages.length} images to node ${assignmentNodeKey}`);
        setSelectedImages([]);
        setShowAssignmentModal(false);
        loadImageGallery();
      } else {
        alert(`❌ Failed to assign images: ${data.error}`);
      }
    } catch (error) {
      console.error('Bulk assignment error:', error);
      alert('❌ Failed to assign images');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) {
      alert('Please select images to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedImages.length} images? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/images/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storySlug: selectedStory,
          operation: 'delete',
          imageIds: selectedImages,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Deleted ${selectedImages.length} images`);
        setSelectedImages([]);
        loadImageGallery();
      } else {
        alert(`❌ Failed to delete images: ${data.error}`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('❌ Failed to delete images');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    router.push('/admin/login');
  };

  const selectedStoryData = stories.find(s => s.slug === selectedStory);
  const totalCost = images.reduce((sum, img) => sum + (img.cost || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🖼️ Smart Image Gallery
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

              {/* Filters and Controls */}
              {selectedStory && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔍 Search
                      </label>
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        placeholder="Search images..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎭 Character
                      </label>
                      <select
                        value={filters.character}
                        onChange={(e) => setFilters(prev => ({ ...prev, character: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Characters</option>
                        {characters.map((char) => (
                          <option key={char.name} value={char.name}>
                            {char.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📊 Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="generated">Generated</option>
                        <option value="assigned">Assigned</option>
                        <option value="unused">Unused</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📖 Node
                      </label>
                      <select
                        value={filters.nodeKey}
                        onChange={(e) => setFilters(prev => ({ ...prev, nodeKey: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Nodes</option>
                        {nodes.map((node) => (
                          <option key={node.node_key} value={node.node_key}>
                            Node {node.node_key}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bulk Operations */}
                  {selectedImages.length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-800 font-medium">
                          {selectedImages.length} images selected
                        </span>
                        <div className="space-x-4">
                          <button
                            onClick={() => setShowAssignmentModal(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                          >
                            📎 Assign to Node
                          </button>
                          <button
                            onClick={handleBulkDelete}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                          >
                            🗑️ Delete Selected
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                          selectedImages.includes(image.id)
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleImageSelect(image.id)}
                      >
                        <img
                          src={image.thumbnail_url || image.image_url}
                          alt={`Image ${image.id}`}
                          className="w-full h-32 object-cover"
                        />
                        
                        {/* Status Badge */}
                        <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded ${
                          image.status === 'assigned' 
                            ? 'bg-green-100 text-green-800'
                            : image.status === 'generated'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {image.status}
                        </div>

                        {/* Selection Checkbox */}
                        {selectedImages.includes(image.id) && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            ✓
                          </div>
                        )}

                        {/* Image Info */}
                        <div className="p-2 bg-white">
                          <div className="text-xs text-gray-600">
                            {image.characters.length > 0 && (
                              <div className="mb-1">
                                🎭 {image.characters.join(', ')}
                              </div>
                            )}
                            {image.node_key && (
                              <div className="mb-1">
                                📖 Node {image.node_key}
                              </div>
                            )}
                            <div className="text-gray-500">
                              ${image.cost.toFixed(4)} • {image.model}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Total Images:</span>
                        <span className="ml-2 text-gray-600">{images.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Cost:</span>
                        <span className="ml-2 text-gray-600">${totalCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Assigned:</span>
                        <span className="ml-2 text-gray-600">
                          {images.filter(img => img.status === 'assigned').length}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Unused:</span>
                        <span className="ml-2 text-gray-600">
                          {images.filter(img => img.status === 'unused').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {images.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-6xl mb-4">🖼️</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Found</h3>
                      <p className="text-gray-600 mb-4">
                        {filters.search || filters.character || filters.status || filters.nodeKey
                          ? 'Try adjusting your filters'
                          : 'Generate some images to get started'
                        }
                      </p>
                      <button
                        onClick={() => router.push('/admin/images')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        🎨 Generate Images
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Assignment Modal */}
              {showAssignmentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      📎 Assign Images to Story Node
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Story Node
                        </label>
                        <select
                          value={assignmentNodeKey}
                          onChange={(e) => setAssignmentNodeKey(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a node...</option>
                          {nodes.map((node) => (
                            <option key={node.node_key} value={node.node_key}>
                              Node {node.node_key}: {node.text_md.substring(0, 50)}...
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p><strong>Selected Images:</strong> {selectedImages.length}</p>
                        <p><strong>Total Cost:</strong> ${images
                          .filter(img => selectedImages.includes(img.id))
                          .reduce((sum, img) => sum + img.cost, 0)
                          .toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                      <button
                        onClick={() => setShowAssignmentModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkAssign}
                        disabled={!assignmentNodeKey}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Assign Images
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
