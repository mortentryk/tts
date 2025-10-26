'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
}

interface Journey {
  id: string;
  story_id: string;
  node_key: string;
  journey_title: string;
  journey_text: string;
  image_url?: string;
  video_url?: string;
  sort_order: number;
  is_active: boolean;
  stories?: {
    slug: string;
    title: string;
  };
}

export default function JourneyManager() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedText, setExpandedText] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nodeKey: '',
    journeyTitle: '',
    journeyText: '',
    sortOrder: 0,
  });

  // Check if user is logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    if (!isLoggedIn) {
      router.push('/admin/login');
    }
  }, [router]);

  // Load stories on mount
  useEffect(() => {
    loadStories();
  }, []);

  // Load journeys when story changes
  useEffect(() => {
    if (selectedStory) {
      loadJourneys();
    } else {
      setJourneys([]);
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

  const loadJourneys = async () => {
    if (!selectedStory) return;

    try {
      const response = await fetch(`/api/admin/journey?storySlug=${selectedStory}`);
      if (response.ok) {
        const data = await response.json();
        setJourneys(data);
      }
    } catch (error) {
      console.error('Failed to load journeys:', error);
    }
  };

  const createJourney = async () => {
    if (!selectedStory || !formData.journeyTitle || !formData.journeyText || !formData.nodeKey) {
      alert('❌ Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeKey: formData.nodeKey,
          journeyTitle: formData.journeyTitle,
          journeyText: formData.journeyText,
          sortOrder: formData.sortOrder,
        }),
      });

      if (response.ok) {
        alert('✅ Journey created successfully!');
        setShowCreateForm(false);
        setFormData({ nodeKey: '', journeyTitle: '', journeyText: '', sortOrder: 0 });
        loadJourneys();
      } else {
        const data = await response.json();
        alert(`❌ Failed to create journey: ${data.error}`);
      }
    } catch (error) {
      console.error('Create journey error:', error);
      alert('❌ Failed to create journey');
    }
  };

  const updateJourney = async (journeyId: string, updates: Partial<Journey>) => {
    try {
      const response = await fetch('/api/admin/journey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          ...updates,
        }),
      });

      if (response.ok) {
        loadJourneys();
      } else {
        const data = await response.json();
        alert(`❌ Failed to update journey: ${data.error}`);
      }
    } catch (error) {
      console.error('Update journey error:', error);
      alert('❌ Failed to update journey');
    }
  };

  const deleteJourney = async (journeyId: string) => {
    if (!confirm('Are you sure you want to delete this journey?')) return;

    try {
      const response = await fetch(`/api/admin/journey?journeyId=${journeyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Journey deleted successfully');
        loadJourneys();
      } else {
        const data = await response.json();
        alert(`❌ Failed to delete journey: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete journey error:', error);
      alert('❌ Failed to delete journey');
    }
  };

  const generateImage = async (journeyId: string, journeyText: string, journeyTitle: string) => {
    setGeneratingImage(journeyId);

    try {
      const response = await fetch('/api/admin/journey/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          journeyText,
          journeyTitle,
          style: 'epic fantasy adventure map illustration, dramatic lighting, cinematic, map style',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Image generated!\nCost: $${data.image.cost.toFixed(2)}`);
        loadJourneys();
      } else {
        alert(`❌ Failed to generate image: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate image error:', error);
      alert('❌ Failed to generate image');
    } finally {
      setGeneratingImage(null);
    }
  };

  const generateVideo = async (journeyId: string) => {
    const confirmed = confirm(
      'Generate video from this image? This will cost approximately $0.10 and take 1-2 minutes.'
    );
    if (!confirmed) return;

    setGeneratingVideo(journeyId);

    try {
      const response = await fetch('/api/admin/journey/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Video generated!\nCost: $${data.video.cost}`);
        loadJourneys();
      } else {
        alert(`❌ Failed to generate video: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate video error:', error);
      alert('❌ Failed to generate video');
    } finally {
      setGeneratingVideo(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    router.push('/admin/login');
  };

  const selectedStoryData = stories.find((s) => s.slug === selectedStory);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">🗺️ Journey Map Manager</h1>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📚 Select Story</h2>
                <select
                  value={selectedStory}
                  onChange={(e) => setSelectedStory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                >
                  <option value="">Choose a story...</option>
                  {stories.map((story) => (
                    <option key={story.slug} value={story.slug}>
                      {story.title}
                    </option>
                  ))}
                </select>

                {selectedStoryData && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900">{selectedStoryData.title}</h3>
                    <p className="text-blue-600 text-sm mt-2">
                      {selectedStoryData.is_published ? 'Published' : 'Draft'} • {journeys.length}{' '}
                      journey{journeys.length !== 1 ? 's' : ''}
                    </p>
            </div>
          )}
        </div>

              {/* Create Journey Button */}
              {selectedStory && (
                <div>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 text-lg font-semibold"
                  >
                    {showCreateForm ? '❌ Cancel' : '➕ Create New Journey'}
                  </button>
                </div>
              )}

              {/* Create Journey Form */}
              {showCreateForm && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Journey</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Node Key (e.g., "1" or "start")
                      </label>
                    <input
                        type="text"
                        value={formData.nodeKey}
                        onChange={(e) => setFormData({ ...formData, nodeKey: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Journey Title
                  </label>
                      <input
                        type="text"
                        value={formData.journeyTitle}
                        onChange={(e) => setFormData({ ...formData, journeyTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        placeholder="The Dragon's Lair"
                      />
                </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Journey Text (shown before accepting quest)
                      </label>
                      <textarea
                        value={formData.journeyText}
                        onChange={(e) => setFormData({ ...formData, journeyText: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 h-32"
                        placeholder="A dark shadow looms over the kingdom. The ancient dragon has awakened and threatens to destroy everything in its path. Will you accept this perilous quest?"
                      />
              </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Sort Order (optional)
                    </label>
                    <input
                      type="number"
                        value={formData.sortOrder}
                        onChange={(e) =>
                          setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    <button
                      onClick={createJourney}
                      className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                    >
                      ✅ Create Journey
                    </button>
                  </div>
                </div>
              )}

              {/* Journeys Table */}
              {selectedStory && journeys.length > 0 && (
                  <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🗺️ Journey Stories</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                            Node
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                            Title
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                            Journey Text
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                            Image
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                            Video
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                            Actions
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {journeys.map((journey) => (
                          <tr key={journey.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-mono text-sm text-gray-900 font-semibold">
                              {journey.node_key}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-900 font-medium">
                              {journey.journey_title}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 max-w-md">
                              <div className="text-sm text-gray-900">
                                {journey.journey_text.substring(0, 100)}...
                              </div>
                              <button
                                onClick={() => setExpandedText(journey.id)}
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                📖 Read full text
                              </button>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {journey.image_url ? (
                                <div className="flex items-center space-x-2">
                                  <img
                                    src={journey.image_url}
                                    alt={journey.journey_title}
                                    className="w-16 h-16 object-cover rounded border"
                                  />
                                  <button
                                    onClick={() => window.open(journey.image_url, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    👁️ View
                                  </button>
                                </div>
                              ) : (
                                <div className="text-gray-600 text-sm">No image</div>
                              )}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {journey.video_url ? (
                                <div className="flex items-center space-x-2">
                                  <video
                                    src={journey.video_url}
                                    className="w-16 h-16 object-cover rounded border"
                                    controls={false}
                                  />
                                  <button
                                    onClick={() => window.open(journey.video_url, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    🎬 Play
                                  </button>
                                </div>
                              ) : (
                                <div className="text-gray-600 text-sm">No video</div>
                              )}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <div className="flex flex-wrap gap-2">
                                {!journey.image_url ? (
                                  <button
                                    onClick={() =>
                                      generateImage(journey.id, journey.journey_text, journey.journey_title)
                                    }
                                    disabled={generatingImage === journey.id}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                                  >
                                    {generatingImage === journey.id
                                      ? '⏳ Generating...'
                                      : '🎨 Make Image'}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        generateImage(journey.id, journey.journey_text, journey.journey_title)
                                      }
                                      className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                                    >
                                      🔄 Redo Image
                                    </button>
                                    <button
                                      onClick={() => generateVideo(journey.id)}
                                      disabled={generatingVideo === journey.id}
                                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                      {generatingVideo === journey.id ? '⏳ Video...' : '🎬 Video'}
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() =>
                                    updateJourney(journey.id, { is_active: !journey.is_active })
                                  }
                                  className={`${
                                    journey.is_active ? 'bg-orange-600' : 'bg-gray-600'
                                  } text-white px-3 py-1 rounded text-sm hover:opacity-80`}
                                >
                                  {journey.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                                </button>
                                <button
                                  onClick={() => deleteJourney(journey.id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <div
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  journey.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {journey.is_active ? '✅ Active' : '⏸️ Inactive'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedStory && journeys.length === 0 && !showCreateForm && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Journeys Yet</h3>
                  <p className="text-gray-600">
                    Click "Create New Journey" to add your first journey story.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

      {/* Full Text Modal */}
      {expandedText && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedText(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">📖 Journey Text</h2>
              <button
                onClick={() => setExpandedText(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {journeys.find((j) => j.id === expandedText)?.journey_title}
              </h3>
              <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
                {journeys.find((j) => j.id === expandedText)?.journey_text}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setExpandedText(null)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
          </div>
        )}
    </div>
  );
}
