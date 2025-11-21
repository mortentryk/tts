'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  journey_order?: number | null;
  landmark_type?: string | null;
  in_journey?: boolean;
}

interface JourneySegment {
  id: string;
  story_id: string;
  node_key: string;
  sequence_number: number;
  journey_title: string;
  journey_text: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  duration_seconds: number;
  is_active: boolean;
}

export default function JourneyTimelineManager() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [showJourneyConfig, setShowJourneyConfig] = useState(false);
  const [editingJourney, setEditingJourney] = useState<string | null>(null);
  const [journeyData, setJourneyData] = useState<{
    journey_order: number | null;
    landmark_type: string;
    in_journey: boolean;
  }>({
    journey_order: null,
    landmark_type: '',
    in_journey: false,
  });
  const [savingJourney, setSavingJourney] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nodeKey: '1',
    title: '',
    text: '',
    duration: 5,
  });

  // Edit form state
  const [editData, setEditData] = useState({
    title: '',
    text: '',
    duration: 5,
  });

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

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    if (selectedStory) {
      loadSegments();
    } else {
      setSegments([]);
    }
  }, [selectedStory]);

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
      setLoading(false);
    }
  };

  const loadSegments = async () => {
    if (!selectedStory) return;

    try {
      const response = await fetch(`/api/admin/journey?storySlug=${selectedStory}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSegments(data);
      }
    } catch (error) {
      console.error('Failed to load segments:', error);
    }
  };

  const createSegment = async () => {
    if (!selectedStory || !formData.title || !formData.text) {
      alert('❌ Please fill in title and text');
      return;
    }

    try {
      const response = await fetch('/api/admin/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeKey: formData.nodeKey,
          journeyTitle: formData.title,
          journeyText: formData.text,
          durationSeconds: formData.duration,
        }),
      });

      if (response.ok) {
        alert('✅ Segment added to timeline!');
        setShowCreateForm(false);
        setFormData({ nodeKey: '1', title: '', text: '', duration: 5 });
        loadSegments();
      } else {
        const data = await response.json();
        alert(`❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('❌ Failed to create segment');
    }
  };

  const updateSegment = async (id: string) => {
    if (!editData.title || !editData.text) {
      alert('❌ Please fill in title and text');
      return;
    }

    try {
      const response = await fetch('/api/admin/journey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          journeyId: id,
          journey_title: editData.title,
          journey_text: editData.text,
          duration_seconds: editData.duration,
        }),
      });

      if (response.ok) {
        alert('✅ Segment updated!');
        setEditingSegment(null);
        loadSegments();
      } else {
        const data = await response.json();
        alert(`❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('❌ Failed to update segment');
    }
  };

  const startEditing = (segment: JourneySegment) => {
    setEditingSegment(segment.id);
    setEditData({
      title: segment.journey_title,
      text: segment.journey_text,
      duration: segment.duration_seconds,
    });
  };

  const deleteSegment = async (id: string) => {
    if (!confirm('Delete this segment from the timeline?')) return;

    try {
      const response = await fetch(`/api/admin/journey?journeyId=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadSegments();
      } else {
        alert('❌ Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const moveSegment = async (id: string, direction: 'up' | 'down') => {
    const index = segments.findIndex(s => s.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === segments.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const segment = segments[index];
    const targetSegment = segments[targetIndex];

    try {
      // Swap sequence numbers
      await fetch('/api/admin/journey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          journeyId: segment.id,
          sequence_number: targetSegment.sequence_number,
        }),
      });

      await fetch('/api/admin/journey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          journeyId: targetSegment.id,
          sequence_number: segment.sequence_number,
        }),
      });

      loadSegments();
    } catch (error) {
      console.error('Move error:', error);
      alert('❌ Failed to reorder');
    }
  };

  const generateImage = async (id: string, text: string, title: string) => {
    setGeneratingImage(id);
    try {
      const response = await fetch('/api/admin/journey/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          journeyId: id,
          journeyText: text,
          journeyTitle: title,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`✅ Image generated! Cost: $${data.image.cost.toFixed(2)}`);
        loadSegments();
      } else {
        alert(`❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate image error:', error);
      alert('❌ Failed to generate image');
    } finally {
      setGeneratingImage(null);
    }
  };

  const generateVideo = async (id: string) => {
    if (!confirm('Generate video? (~$0.10, 1-2 minutes)')) return;
    
    setGeneratingVideo(id);
    try {
      const response = await fetch('/api/admin/journey/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ journeyId: id }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`✅ Video generated! Cost: $${data.video.cost}`);
        loadSegments();
      } else {
        alert(`❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate video error:', error);
      alert('❌ Failed to generate video');
    } finally {
      setGeneratingVideo(null);
    }
  };

  const generateAudio = async (id: string) => {
    setGeneratingAudio(id);
    try {
      const response = await fetch('/api/admin/journey/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ journeyId: id }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (e.g., timeout errors)
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
      }

      if (response.ok) {
        const characters = data.audio?.characters ?? 0;
        const cost = data.audio?.cost ?? 0;
        const cached = data.audio?.cached ?? false;
        alert(`✅ Audio generated!\n${characters} characters\nCost: $${cost.toFixed(4)}\nCached: ${cached ? 'Yes' : 'No'}`);
        loadSegments();
      } else {
        alert(`❌ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Generate audio error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('504') || errorMessage.includes('timeout')) {
        alert('❌ Request timed out. The audio generation may still be processing. Please try again in a moment.');
      } else {
        alert(`❌ Failed to generate audio: ${errorMessage}`);
      }
    } finally {
      setGeneratingAudio(null);
    }
  };

  const handleEditJourney = (story: Story) => {
    setEditingJourney(story.id);
    setJourneyData({
      journey_order: story.journey_order ?? null,
      landmark_type: story.landmark_type || '',
      in_journey: story.in_journey || false,
    });
  };

  const handleCancelJourneyEdit = () => {
    setEditingJourney(null);
    setJourneyData({
      journey_order: null,
      landmark_type: '',
      in_journey: false,
    });
  };

  const handleSaveJourney = async (storyId: string) => {
    setSavingJourney(true);
    try {
      const updates: any = {
        in_journey: journeyData.in_journey,
      };

      // Only set journey_order if in_journey is true
      if (journeyData.in_journey) {
        updates.journey_order = journeyData.journey_order || null;
        updates.landmark_type = journeyData.landmark_type || null;
      } else {
        // If removing from journey, clear the order and landmark
        updates.journey_order = null;
        updates.landmark_type = null;
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
        alert('✅ Journey settings updated successfully!');
        setEditingJourney(null);
        loadStories(); // Reload to show updated data
      } else {
        alert(data.error || 'Failed to update journey settings');
      }
    } catch (error) {
      console.error('❌ Journey update error:', error);
      alert('Failed to update journey settings');
    } finally {
      setSavingJourney(false);
    }
  };

  const selectedStoryData = stories.find((s) => s.slug === selectedStory);
  const totalDuration = segments.reduce((sum, s) => sum + s.duration_seconds, 0);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎬 Journey Timeline</h1>
              <p className="text-gray-600 mt-1">Create cinematic intro sequences with multiple segments</p>
            </div>
            <div className="space-x-4">
          <button
            onClick={() => router.push('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                ← Back
            </button>
            <button
                onClick={() => setShowJourneyConfig(!showJourneyConfig)}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
              >
                {showJourneyConfig ? '❌ Hide' : '🗺️'} Journey Config
            </button>
            <button
                onClick={async () => {
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
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
            </button>
          </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading...</p>
                </div>
              ) : (
            <div className="space-y-6">
              {/* Journey Configuration */}
              {showJourneyConfig && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    🗺️ Configure Journey Stories
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Set which stories appear in the Eventyrrejse. Stories need a journey_order to appear in the journey.
                  </p>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Story</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Journey</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Landmark</th>
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
                              {editingJourney === story.id ? (
                                <input
                                  type="checkbox"
                                  checked={journeyData.in_journey}
                                  onChange={(e) => setJourneyData({ ...journeyData, in_journey: e.target.checked })}
                                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                />
                              ) : (
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  story.in_journey && story.journey_order !== null
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {story.in_journey && story.journey_order !== null ? 'Yes' : 'No'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {editingJourney === story.id ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={journeyData.journey_order || ''}
                                  onChange={(e) => setJourneyData({ ...journeyData, journey_order: e.target.value ? parseInt(e.target.value) : null })}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                  placeholder="Order"
                                  disabled={!journeyData.in_journey}
                                />
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {story.journey_order ?? '—'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {editingJourney === story.id ? (
                                <select
                                  value={journeyData.landmark_type || ''}
                                  onChange={(e) => setJourneyData({ ...journeyData, landmark_type: e.target.value })}
                                  className="w-32 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                  disabled={!journeyData.in_journey}
                                >
                                  <option value="">Select...</option>
                                  <option value="tree">🌳 Tree</option>
                                  <option value="sea">🌊 Sea</option>
                                  <option value="cave">🕳️ Cave</option>
                                  <option value="castle">🏰 Castle</option>
                                  <option value="forest">🌲 Forest</option>
                                </select>
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {story.landmark_type ? (
                                    <>
                                      {story.landmark_type === 'tree' && '🌳'}
                                      {story.landmark_type === 'sea' && '🌊'}
                                      {story.landmark_type === 'cave' && '🕳️'}
                                      {story.landmark_type === 'castle' && '🏰'}
                                      {story.landmark_type === 'forest' && '🌲'}
                                      {' '}
                                      {story.landmark_type}
                                    </>
                                  ) : '—'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {editingJourney === story.id ? (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleSaveJourney(story.id)}
                                    disabled={savingJourney}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400"
                                  >
                                    {savingJourney ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={handleCancelJourneyEdit}
                                    disabled={savingJourney}
                                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEditJourney(story)}
                                  className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
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
                      <li>Check "In Journey" to include a story in the Eventyrrejse</li>
                      <li>Set the "Order" number (1, 2, 3, etc.) to control the sequence</li>
                      <li>Choose a "Landmark" type to set the icon on the journey map</li>
                      <li>Stories without a journey_order will NOT appear in the journey</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Story Selection */}
                <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">Select Story</label>
                <select
                  value={selectedStory}
                  onChange={(e) => setSelectedStory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                >
                  <option value="">Choose a story...</option>
                  {stories.map((story) => (
                    <option key={story.slug} value={story.slug}>
                      {story.title}
                    </option>
                  ))}
                </select>
        </div>

              {selectedStoryData && (
                <>
                  {/* Timeline Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex justify-between items-center">
                <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedStoryData.title}</h2>
                        <p className="text-gray-700 mt-2">
                          <span className="font-semibold">{segments.length}</span> segment{segments.length !== 1 ? 's' : ''} • 
                          <span className="font-semibold ml-2">{totalDuration}s</span> total duration
                        </p>
                </div>
                      <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        {showCreateForm ? '❌ Cancel' : '➕ Add Segment'}
                      </button>
            </div>
        </div>

                  {/* Create Form */}
                  {showCreateForm && (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Timeline Segment</h3>
        <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Segment Title</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            placeholder="e.g., The Witch Appears"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Story Text</label>
                          <textarea
                            value={formData.text}
                            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 h-32"
                            placeholder="Write the text for this segment..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Node Key</label>
                            <input
                              type="text"
                              value={formData.nodeKey}
                              onChange={(e) => setFormData({ ...formData, nodeKey: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                              placeholder="1"
                            />
                </div>
                  <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Duration (seconds)</label>
                    <input
                      type="number"
                              value={formData.duration}
                              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 5 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      min="1"
                              max="30"
                            />
                          </div>
                        </div>
                        <button
                          onClick={createSegment}
                          className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-semibold"
                        >
                          ✅ Add to Timeline
                        </button>
                </div>
              </div>
                  )}

                  {/* Timeline View */}
                  {segments.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-900">Timeline Sequence</h3>
                      {segments.map((segment, index) => (
                        <div
                          key={segment.id}
                          className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors"
                        >
                          {editingSegment === segment.id ? (
                            /* Edit Mode */
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Title</label>
                                <input
                                  type="text"
                                  value={editData.title}
                                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Text</label>
                                <textarea
                                  value={editData.text}
                                  onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 h-32"
                                />
                              </div>
                  <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Duration (seconds)</label>
                    <input
                      type="number"
                                  value={editData.duration}
                                  onChange={(e) => setEditData({ ...editData, duration: parseInt(e.target.value) || 5 })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      min="1"
                                  max="30"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateSegment(segment.id)}
                                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                                >
                                  ✅ Save
                                </button>
                                <button
                                  onClick={() => setEditingSegment(null)}
                                  className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* View Mode */
                            <div className="flex items-start gap-6">
                              {/* Sequence Number */}
                              <div className="flex-shrink-0">
                                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                                  {index + 1}
                                </div>
                                <div className="text-center mt-2 text-sm text-gray-600">
                                  {segment.duration_seconds}s
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-grow">
                                <h4 className="text-lg font-bold text-gray-900 mb-2">
                                  {segment.journey_title}
                                </h4>
                                <p className="text-gray-700 text-sm mb-4">
                                  {segment.journey_text.substring(0, 150)}...
                                  {segment.journey_text.length > 150 && (
                                    <button
                                      onClick={() => setExpandedSegment(segment.id)}
                                      className="text-blue-600 hover:underline ml-2"
                                    >
                                      Read more
                                    </button>
                                  )}
                                </p>

                              {/* Media Preview */}
                              <div className="flex gap-4 mb-4">
                                {segment.video_url ? (
                                  <div className="relative">
                                    <video src={segment.video_url} className="w-32 h-32 object-cover rounded border-2 border-green-500" />
                                    <span className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded">VIDEO</span>
                                  </div>
                                ) : segment.image_url ? (
                                  <div className="relative">
                                    <img src={segment.image_url} alt={segment.journey_title} className="w-32 h-32 object-cover rounded border-2 border-blue-500" />
                                    <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">IMAGE</span>
                                  </div>
                                ) : (
                                  <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                                    No Media
                                  </div>
                                )}
                                {segment.audio_url && (
                                  <div className="flex items-center bg-purple-100 px-4 py-2 rounded border-2 border-purple-500">
                                    <span className="text-purple-700 text-sm font-semibold">🎵 Audio Available</span>
                                  </div>
                                )}
                  </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => startEditing(segment)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
                                  >
                                    ✏️ Edit
                                  </button>
                                  {!segment.image_url && (
                                    <button
                                      onClick={() => generateImage(segment.id, segment.journey_text, segment.journey_title)}
                                      disabled={generatingImage === segment.id}
                                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                      {generatingImage === segment.id ? '⏳ Generating...' : '🎨 Generate Image'}
                                    </button>
                                  )}
                                  {segment.image_url && !segment.video_url && (
                                    <button
                                      onClick={() => generateVideo(segment.id)}
                                      disabled={generatingVideo === segment.id}
                                      className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                      {generatingVideo === segment.id ? '⏳ Video...' : '🎬 Make Video'}
                                    </button>
                                  )}
                                  {!segment.audio_url && (
                                    <button
                                      onClick={() => generateAudio(segment.id)}
                                      disabled={generatingAudio === segment.id}
                                      className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
                                    >
                                      {generatingAudio === segment.id ? '⏳ Audio...' : '🎙️ Add Audio'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => moveSegment(segment.id, 'up')}
                                    disabled={index === 0}
                                    className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 disabled:bg-gray-300"
                                  >
                                    ↑ Move Up
                                  </button>
                                  <button
                                    onClick={() => moveSegment(segment.id, 'down')}
                                    disabled={index === segments.length - 1}
                                    className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 disabled:bg-gray-300"
                                  >
                                    ↓ Move Down
                                  </button>
                                  <button
                                    onClick={() => deleteSegment(segment.id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-6xl mb-4">🎬</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Segments Yet</h3>
                      <p>Click "Add Segment" to create your first timeline segment</p>
                </div>
                  )}
                </>
              )}
          </div>
        )}
      </div>
        </div>

      {/* Text Modal */}
      {expandedSegment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedSegment(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Full Text</h2>
              <button
                onClick={() => setExpandedSegment(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
              {segments.find((s) => s.id === expandedSegment)?.journey_text}
            </p>
          </div>
          </div>
        )}
    </div>
  );
}
