'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Character {
  id: string;
  name: string;
  description?: string;
  reference_image_url?: string;
  appearance_prompt?: string;
  created_at: string;
}

interface Story {
  id: string;
  slug: string;
  title: string;
  description?: string;
  is_published: boolean;
  node_count: number;
  visual_style?: string;
}

interface CharacterAssignment {
  node_key: string;
  character_id: string;
  character_name: string;
  role?: string;
  emotion?: string;
  action?: string;
}

export default function CharacterManager() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterAssignments, setCharacterAssignments] = useState<CharacterAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [visualStyle, setVisualStyle] = useState<string>('');
  const [savingStyle, setSavingStyle] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    referenceImageUrl: '',
    appearancePrompt: '',
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

  // Load stories on component mount
  useEffect(() => {
    loadStories();
  }, []);

  // Load characters, assignments, and visual style when story changes
  useEffect(() => {
    if (selectedStory) {
      loadCharacters();
      loadCharacterAssignments();
      loadVisualStyle();
    } else {
      setCharacters([]);
      setCharacterAssignments([]);
      setVisualStyle('');
    }
  }, [selectedStory, stories]);

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

  const loadCharacters = async () => {
    try {
      const response = await fetch(`/api/admin/characters?storySlug=${selectedStory}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const loadCharacterAssignments = async () => {
    if (!selectedStory) return;
    try {
      const response = await fetch(`/api/admin/character-assignments?storySlug=${selectedStory}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const transformed = (data || []).map((assignment: any) => ({
          node_key: assignment.node_key,
          character_id: assignment.character_id,
          character_name: assignment.characters?.name || 'Unknown',
          role: assignment.role,
          emotion: assignment.emotion,
          action: assignment.action,
        }));
        setCharacterAssignments(transformed);
      }
    } catch (error) {
      console.error('Failed to load character assignments:', error);
    }
  };

  const loadVisualStyle = async () => {
    if (!selectedStory) return;
    try {
      const story = stories.find(s => s.slug === selectedStory);
      if (story && story.visual_style !== undefined) {
        setVisualStyle(story.visual_style || '');
      }
    } catch (error) {
      console.error('Failed to load visual style:', error);
    }
  };

  const handleSaveVisualStyle = async () => {
    if (!selectedStory) return;
    const story = stories.find(s => s.slug === selectedStory);
    if (!story) return;

    setSavingStyle(true);
    try {
      const response = await fetch(`/api/admin/stories/${story.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ visual_style: visualStyle }),
      });

      if (response.ok) {
        alert('✅ Visual style saved successfully!');
        // Update the story in the list
        setStories(stories.map(s => 
          s.id === story.id ? { ...s, visual_style: visualStyle } : s
        ));
      } else {
        const data = await response.json();
        alert(`❌ Failed to save visual style: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save visual style:', error);
      alert('❌ Failed to save visual style');
    } finally {
      setSavingStyle(false);
    }
  };

  const handleCreateCharacter = async () => {
    if (!selectedStory || !formData.name) {
      alert('Please select a story and enter a character name');
      return;
    }

    try {
      const response = await fetch('/api/admin/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          storySlug: selectedStory,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCharacters([...characters, data.character]);
        setShowCreateForm(false);
        setFormData({ name: '', description: '', referenceImageUrl: '', appearancePrompt: '' });
        alert('✅ Character created successfully!');
      } else {
        alert(`❌ Failed to create character: ${data.error}`);
      }
    } catch (error) {
      console.error('Character creation error:', error);
      alert('❌ Failed to create character');
    }
  };

  const handleUpdateCharacter = async () => {
    if (!editingCharacter) return;

    try {
      const response = await fetch(`/api/admin/characters/${editingCharacter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setCharacters(characters.map(char => 
          char.id === editingCharacter.id ? data.character : char
        ));
        setEditingCharacter(null);
        setFormData({ name: '', description: '', referenceImageUrl: '', appearancePrompt: '' });
        alert('✅ Character updated successfully!');
      } else {
        alert(`❌ Failed to update character: ${data.error}`);
      }
    } catch (error) {
      console.error('Character update error:', error);
      alert('❌ Failed to update character');
    }
  };

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    if (!confirm(`Are you sure you want to delete "${characterName}"? This will remove all character assignments.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setCharacters(characters.filter(char => char.id !== characterId));
        alert('✅ Character deleted successfully!');
      } else {
        alert(`❌ Failed to delete character: ${data.error}`);
      }
    } catch (error) {
      console.error('Character deletion error:', error);
      alert('❌ Failed to delete character');
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name,
      description: character.description || '',
      referenceImageUrl: character.reference_image_url || '',
      appearancePrompt: character.appearance_prompt || '',
    });
    setShowCreateForm(true);
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

  const selectedStoryData = stories.find(s => s.slug === selectedStory);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🎭 Story Configuration Hub
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

              {/* Story Configuration Section */}
              {selectedStory && (
                <div className="space-y-8">
                  {/* Visual Style Configuration */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      🎨 Visual Style Configuration
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Set the visual style for all images in this story. This ensures consistent look and feel across all generated images.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Visual Style Description
                        </label>
                        <textarea
                          value={visualStyle}
                          onChange={(e) => setVisualStyle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          rows={3}
                          placeholder="e.g., Disney-style animation, polished and professional, expressive characters, vibrant colors, soft rounded shapes, family-friendly aesthetic, cinematic quality"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Tip: Be specific about art style, colors, lighting, and mood. This style will be applied to all images.
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handleSaveVisualStyle}
                          disabled={savingStyle}
                          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingStyle ? 'Saving...' : '💾 Save Visual Style'}
                        </button>
                        <button
                          onClick={() => setVisualStyle('Disney-style animation, polished and professional, expressive characters, vibrant colors, soft rounded shapes, family-friendly aesthetic, cinematic quality')}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Use Default Disney Style
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      ⚡ Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => router.push(`/admin/images/simple?story=${selectedStory}`)}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 text-left"
                      >
                        <div className="font-semibold">🎨 Generate Images</div>
                        <div className="text-sm opacity-90">Create images for all scenes</div>
                      </button>
                      <button
                        onClick={() => router.push(`/admin/media?story=${selectedStory}`)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-left"
                      >
                        <div className="font-semibold">📹 Manage Media</div>
                        <div className="text-sm opacity-90">View and manage generated media</div>
                      </button>
                      <button
                        onClick={() => router.push(`/admin/images/simple?story=${selectedStory}`)}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-left"
                      >
                        <div className="font-semibold">👥 Assign Characters</div>
                        <div className="text-sm opacity-90">Assign characters to scenes</div>
                      </button>
                    </div>
                  </div>

                  {/* Character Assignment Overview */}
                  {characterAssignments.length > 0 && (
                    <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        📋 Character Assignment Overview
                      </h2>
                      <div className="text-sm text-gray-700 mb-4">
                        {characterAssignments.length} character assignment{characterAssignments.length !== 1 ? 's' : ''} across {new Set(characterAssignments.map(a => a.node_key)).size} scene{new Set(characterAssignments.map(a => a.node_key)).size !== 1 ? 's' : ''}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                        {Array.from(new Set(characterAssignments.map(a => a.node_key))).map(nodeKey => {
                          const nodeAssignments = characterAssignments.filter(a => a.node_key === nodeKey);
                          return (
                            <div key={nodeKey} className="bg-white p-3 rounded border border-yellow-300">
                              <div className="font-semibold text-sm mb-2">Scene {nodeKey}</div>
                              <div className="space-y-1">
                                {nodeAssignments.map((assignment, idx) => (
                                  <div key={idx} className="text-xs text-gray-600">
                                    • {assignment.character_name}
                                    {assignment.role && ` (${assignment.role})`}
                                    {assignment.emotion && ` - ${assignment.emotion}`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Character Management */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">
                        🎭 Characters ({characters.length})
                      </h2>
                      <button
                        onClick={() => {
                          setEditingCharacter(null);
                          setFormData({ name: '', description: '', referenceImageUrl: '', appearancePrompt: '' });
                          setShowCreateForm(true);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        ➕ Add Character
                      </button>
                    </div>

                  {/* Character List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {characters.map((character) => (
                      <div key={character.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{character.name}</h3>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditCharacter(character)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCharacter(character.id, character.name)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        {character.description && (
                          <p className="text-gray-600 text-sm mb-2">{character.description}</p>
                        )}
                        
                        {character.reference_image_url && (
                          <div className="mb-2">
                            <img
                              src={character.reference_image_url}
                              alt={character.name}
                              className="w-full h-32 object-cover rounded"
                            />
                          </div>
                        )}
                        
                        {character.appearance_prompt && (
                          <p className="text-gray-500 text-xs">
                            <strong>Appearance:</strong> {character.appearance_prompt}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                    {characters.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No characters found. Add your first character to get started.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Create/Edit Form */}
              {showCreateForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {editingCharacter ? '✏️ Edit Character' : '➕ Create Character'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Character Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Princess Elara"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="e.g., A brave princess with golden hair and a kind heart"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reference Image URL
                        </label>
                        <input
                          type="url"
                          value={formData.referenceImageUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, referenceImageUrl: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/character-image.jpg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Appearance Prompt
                        </label>
                        <textarea
                          value={formData.appearancePrompt}
                          onChange={(e) => setFormData(prev => ({ ...prev, appearancePrompt: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="e.g., tall, blonde hair, blue eyes, wearing a white dress"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingCharacter ? handleUpdateCharacter : handleCreateCharacter}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        {editingCharacter ? 'Update Character' : 'Create Character'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Section */}
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  💡 Story Configuration Workflow
                </h3>
                <div className="text-sm text-gray-600 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">1. Configure Visual Style</p>
                      <p className="text-gray-600">Set the overall visual style for all images in your story. This ensures consistency across all generated images.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">2. Create Characters</p>
                      <p className="text-gray-600">Add main characters with detailed descriptions and reference images for consistent appearance.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">3. Assign Characters</p>
                      <p className="text-gray-600">Link characters to specific story scenes with roles, emotions, and actions.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">4. Generate Images</p>
                      <p className="text-gray-600">Use the image generation page to create consistent images with your configured style and characters.</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">🎨 Tips for Better Results:</h4>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Set visual style first - it applies to all images</li>
                      <li>• Use detailed character appearance prompts</li>
                      <li>• Upload reference images when possible</li>
                      <li>• Be specific about clothing, colors, and features</li>
                      <li>• Assign characters to scenes before generating images</li>
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
