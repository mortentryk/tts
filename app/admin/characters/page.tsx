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
}

export default function CharacterManager() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    referenceImageUrl: '',
    appearancePrompt: '',
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

  // Load characters when story changes
  useEffect(() => {
    if (selectedStory) {
      loadCharacters();
    } else {
      setCharacters([]);
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

  const loadCharacters = async () => {
    try {
      const response = await fetch(`/api/admin/characters?storySlug=${selectedStory}`);
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
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
              🎭 Character Manager
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

              {/* Character Management */}
              {selectedStory && (
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
                  💡 Character Consistency Guide
                </h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>1. Create Characters:</strong> Add main characters with descriptions and reference images</p>
                  <p><strong>2. Assign to Nodes:</strong> Link characters to specific story scenes</p>
                  <p><strong>3. Generate Images:</strong> AI will create consistent character appearances</p>
                  <p><strong>4. Review & Adjust:</strong> Fine-tune character descriptions as needed</p>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">🎨 Tips for Better Consistency:</h4>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Use detailed appearance prompts</li>
                      <li>• Upload reference images when possible</li>
                      <li>• Be specific about clothing and accessories</li>
                      <li>• Include character emotions and actions</li>
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
