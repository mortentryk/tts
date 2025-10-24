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
  video_url?: string;
  audio_url?: string;
}

interface ImageRow {
  id: string;
  node_key: string;
  text: string;
  image_url: string;
  video_url?: string;
  audio_url?: string;
  status: 'empty' | 'generating' | 'ready' | 'error';
  generated_at?: string;
  cost?: number;
}

interface Character {
  id: string;
  name: string;
  description?: string;
  appearance_prompt?: string;
}

interface CharacterAssignment {
  node_key: string;
  character_id: string;
  character_name: string;
  role?: string;
  emotion?: string;
  action?: string;
}

export default function SimpleImageManager() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [nodes, setNodes] = useState<StoryNode[]>([]);
  const [imageRows, setImageRows] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterAssignments, setCharacterAssignments] = useState<CharacterAssignment[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ characterId: '', emotion: '', action: '' });
  const [customPromptNode, setCustomPromptNode] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

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
      loadCharacters();
      loadCharacterAssignments();
    } else {
      setNodes([]);
      setImageRows([]);
      setCharacters([]);
      setCharacterAssignments([]);
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
          video_url: node.video_url || '',
          audio_url: node.audio_url || '',
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

  const loadCharacters = async () => {
    if (!selectedStory) return;
    
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

  const loadCharacterAssignments = async () => {
    if (!selectedStory) return;
    
    try {
      const response = await fetch(`/api/admin/character-assignments?storySlug=${selectedStory}`);
      if (response.ok) {
        const data = await response.json();
        const assignments: CharacterAssignment[] = data.map((a: any) => ({
          node_key: a.node_key,
          character_id: a.character_id,
          character_name: a.characters?.name || 'Unknown',
          role: a.role,
          emotion: a.emotion,
          action: a.action,
        }));
        setCharacterAssignments(assignments);
      }
    } catch (error) {
      console.error('Failed to load character assignments:', error);
    }
  };

  const generateImage = async (nodeKey: string) => {
    if (!selectedStory) return;
    
    setGenerating(nodeKey);
    
    try {
      // Find the node to get its text
      const node = nodes.find(n => n.node_key === nodeKey);
      if (!node) {
        alert('❌ Node not found');
        return;
      }

      const response = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeId: nodeKey,
          storyText: node.text_md,
          storyTitle: selectedStoryData?.title || selectedStory,
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
                image_url: data.image?.url || data.imageUrl, 
                status: 'ready',
                generated_at: new Date().toISOString(),
                cost: data.image?.cost || data.cost || 0
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

  const generateWithCustomPrompt = async (nodeKey: string) => {
    if (!selectedStory || !customPrompt.trim()) {
      alert('❌ Please enter a custom prompt');
      return;
    }
    
    setGenerating(nodeKey);
    
    try {
      const node = nodes.find(n => n.node_key === nodeKey);
      if (!node) {
        alert('❌ Node not found');
        return;
      }

      const response = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeId: nodeKey,
          storyText: customPrompt, // Use custom prompt as story text
          storyTitle: selectedStoryData?.title || selectedStory,
          style: '', // No style prefix, use prompt as-is
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setImageRows(prev => prev.map(row => 
          row.node_key === nodeKey 
            ? { 
                ...row, 
                image_url: data.image?.url || data.imageUrl,
                status: 'ready',
                generated_at: new Date().toISOString(),
                cost: data.image?.cost || data.cost || 0
              }
            : row
        ));
        setCustomPrompt('');
        setCustomPromptNode(null);
        loadStoryNodes();
      } else {
        alert(`❌ Failed to generate image: ${data.error}`);
        setImageRows(prev => prev.map(row => 
          row.node_key === nodeKey ? { ...row, status: 'error' } : row
        ));
      }
    } catch (error) {
      console.error('Generate with custom prompt error:', error);
      alert('❌ Failed to generate image with custom prompt');
      setImageRows(prev => prev.map(row => 
        row.node_key === nodeKey ? { ...row, status: 'error' } : row
      ));
    } finally {
      setGenerating(null);
    }
  };

  const generateVideo = async (nodeKey: string) => {
    if (!selectedStory) return;
    
    const confirmed = confirm('Generate video from this image? This will cost approximately $0.10 and take 1-2 minutes.');
    if (!confirmed) return;
    
    setGeneratingVideo(nodeKey);
    
    try {
      const response = await fetch('/api/admin/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeId: nodeKey,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Video generated! URL: ${data.video.url}\nCost: $${data.video.cost}`);
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

  const generateAudio = async (nodeKey: string) => {
    if (!selectedStory) return;
    
    setGeneratingAudio(nodeKey);
    
    try {
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeId: nodeKey,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Audio generated!\n${data.audio.characters} characters\nCost: $${data.audio.cost.toFixed(4)}\nCached: ${data.audio.cached ? 'Yes' : 'No'}`);
        
        // Update the row to show audio is available
        setImageRows(prev => prev.map(row => 
          row.node_key === nodeKey 
            ? { ...row, audio_url: data.audio.url }
            : row
        ));
      } else {
        alert(`❌ Failed to generate audio: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate audio error:', error);
      alert('❌ Failed to generate audio');
    } finally {
      setGeneratingAudio(null);
    }
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

  const deleteVideo = async (nodeKey: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
      // Update the image row
      setImageRows(prev => prev.map(row => 
        row.node_key === nodeKey 
          ? { ...row, video_url: '' }
          : row
      ));
      
      // Update the database
      const response = await fetch(`/api/stories/${selectedStory}/nodes/${nodeKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: null
        }),
      });

      if (!response.ok) {
        alert('❌ Failed to delete video');
      }
    } catch (error) {
      console.error('Delete video error:', error);
      alert('❌ Failed to delete video');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    router.push('/admin/login');
  };

  const assignCharacterToNode = async (nodeKey: string) => {
    if (!selectedStory || !assignForm.characterId) {
      alert('Please select a character');
      return;
    }

    try {
      const response = await fetch('/api/admin/character-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeKey: nodeKey,
          assignments: [{
            characterId: assignForm.characterId,
            emotion: assignForm.emotion || null,
            action: assignForm.action || null,
            role: 'main',
          }],
        }),
      });

      if (response.ok) {
        // Reload assignments
        await loadCharacterAssignments();
        setEditingNode(null);
        setAssignForm({ characterId: '', emotion: '', action: '' });
      } else {
        alert('❌ Failed to assign character');
      }
    } catch (error) {
      console.error('Assign character error:', error);
      alert('❌ Failed to assign character');
    }
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
              🎨 Media Manager
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  📚 Select Story
                </h2>
                <select
                  value={selectedStory}
                  onChange={(e) => setSelectedStory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
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
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-blue-900">{selectedStoryData.title}</h3>
                        {selectedStoryData.description && (
                          <p className="text-blue-700 mt-1">{selectedStoryData.description}</p>
                        )}
                        <p className="text-blue-600 text-sm mt-2">
                          {selectedStoryData.node_count} nodes • {selectedStoryData.is_published ? 'Published' : 'Draft'}
                          {characters.length > 0 && ` • ${characters.length} character${characters.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push('/admin/characters')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                      >
                        🎭 Manage Characters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Spreadsheet */}
              {selectedStory && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      🎨 Story Media
                    </h2>
                    <div className="text-sm text-gray-900 font-medium">
                      {readyImages} / {imageRows.length} media ready • Total cost: ${totalCost.toFixed(2)}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">Node</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">Text</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">Characters</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">Media</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">Audio</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">Actions</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imageRows.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-mono text-sm text-gray-900 font-semibold">
                              {row.node_key}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 max-w-md">
                              <div className="text-sm text-gray-900 font-medium">
                                {row.text.substring(0, 100)}...
                              </div>
                              <button
                                onClick={() => setExpandedText(row.node_key)}
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                📖 Read full text
                              </button>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {(() => {
                                const nodeChars = characterAssignments.filter(a => a.node_key === row.node_key);
                                
                                if (editingNode === row.node_key) {
                                  return (
                                    <div className="space-y-2">
                                      <select
                                        value={assignForm.characterId}
                                        onChange={(e) => setAssignForm({...assignForm, characterId: e.target.value})}
                                        className="w-full text-xs px-2 py-1 border rounded"
                                      >
                                        <option value="">Select character...</option>
                                        {characters.map(char => (
                                          <option key={char.id} value={char.id}>{char.name}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        placeholder="Emotion (e.g. happy)"
                                        value={assignForm.emotion}
                                        onChange={(e) => setAssignForm({...assignForm, emotion: e.target.value})}
                                        className="w-full text-xs px-2 py-1 border rounded"
                                      />
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => assignCharacterToNode(row.node_key)}
                                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                        >
                                          ✓ Save
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingNode(null);
                                            setAssignForm({ characterId: '', emotion: '', action: '' });
                                          }}
                                          className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="space-y-1">
                                    {nodeChars.length > 0 ? (
                                      nodeChars.map((assignment, idx) => (
                                        <div key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                          🎭 {assignment.character_name}
                                          {assignment.emotion && ` • ${assignment.emotion}`}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-gray-600 text-xs">No characters</div>
                                    )}
                                    <button
                                      onClick={() => setEditingNode(row.node_key)}
                                      className="mt-1 text-xs text-purple-600 hover:text-purple-800 hover:underline"
                                    >
                                      {nodeChars.length > 0 ? '✏️ Edit' : '➕ Add Character'}
                                    </button>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {(() => {
                                // Priority: Video first, then image, then none
                                if (row.video_url) {
                                  return (
                                    <div className="flex items-center space-x-3">
                                      <div className="relative group">
                                        <video
                                          src={row.video_url}
                                          className="w-20 h-20 object-cover rounded-lg border-2 border-purple-300 shadow-md"
                                          controls={false}
                                          muted
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-white text-2xl">▶️</span>
                                        </div>
                                        <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs px-1 py-0.5 rounded">
                                          🎬
                                        </div>
                                      </div>
                                      <div className="flex flex-col space-y-1">
                                        <button
                                          onClick={() => window.open(row.video_url, '_blank')}
                                          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 flex items-center space-x-1"
                                        >
                                          <span>🎬</span>
                                          <span>Play Video</span>
                                        </button>
                                        <button
                                          onClick={() => deleteVideo(row.node_key)}
                                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                                        >
                                          <span>🗑️</span>
                                          <span>Delete Video</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                } else if (row.image_url) {
                                  return (
                                    <div className="flex items-center space-x-3">
                                      <div className="relative group">
                                        <img
                                          src={row.image_url}
                                          alt={`Node ${row.node_key}`}
                                          className="w-20 h-20 object-cover rounded-lg border-2 border-blue-300 shadow-md"
                                        />
                                        <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded">
                                          🖼️
                                        </div>
                                      </div>
                                      <div className="flex flex-col space-y-1">
                                        <button
                                          onClick={() => window.open(row.image_url, '_blank')}
                                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
                                        >
                                          <span>👁️</span>
                                          <span>View Image</span>
                                        </button>
                                        <button
                                          onClick={() => generateVideo(row.node_key)}
                                          disabled={generatingVideo === row.node_key}
                                          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400 flex items-center space-x-1"
                                        >
                                          <span>🎬</span>
                                          <span>{generatingVideo === row.node_key ? 'Generating...' : 'Generate Video'}</span>
                                        </button>
                                        <button
                                          onClick={() => deleteImage(row.node_key)}
                                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                                        >
                                          <span>🗑️</span>
                                          <span>Delete Image</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="text-center py-4">
                                      <div className="text-gray-400 text-4xl mb-2">📷</div>
                                      <div className="text-gray-600 text-sm mb-3">No media</div>
                                      <button
                                        onClick={() => generateImage(row.node_key)}
                                        disabled={generating === row.node_key}
                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                                      >
                                        {generating === row.node_key ? '⏳ Generating...' : '🎨 Generate Image'}
                                      </button>
                                    </div>
                                  );
                                }
                              })()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {row.audio_url ? (
                                <div className="flex items-center space-x-2">
                                  <audio
                                    src={row.audio_url}
                                    controls
                                    className="h-8"
                                    style={{ maxWidth: '150px' }}
                                  />
                                  <button
                                    onClick={() => window.open(row.audio_url, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    🔊 Open
                                  </button>
                                </div>
                              ) : (
                                <div className="text-gray-600 text-sm">No audio</div>
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
                                      onClick={() => {
                                        setCustomPromptNode(row.node_key);
                                        setCustomPrompt('');
                                      }}
                                      className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                                    >
                                      ✏️ Custom
                                    </button>
                                    {!row.video_url && (
                                      <button
                                        onClick={() => generateVideo(row.node_key)}
                                        disabled={generatingVideo === row.node_key}
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                                      >
                                        {generatingVideo === row.node_key ? '⏳ Video...' : '🎬 Video'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => generateAudio(row.node_key)}
                                      disabled={generatingAudio === row.node_key}
                                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400"
                                      title={row.audio_url ? 'Audio already generated - click to regenerate' : 'Generate audio with ElevenLabs'}
                                    >
                                      {generatingAudio === row.node_key ? '⏳ Audio...' : row.audio_url ? '🔊 ✓' : '🔊 Audio'}
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
                                {row.status === 'ready' && (
                                  <span>
                                    ✅ Ready
                                    {row.video_url && ' 🎬'}
                                  </span>
                                )}
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

      {/* Custom Prompt Modal */}
      {customPromptNode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setCustomPromptNode(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                ✏️ Custom Prompt for Node {customPromptNode}
              </h2>
              <button
                onClick={() => setCustomPromptNode(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Describe the exact scene you want:
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Example: A dark hollow tree interior, humid air, a large dog with eyes like teacups guarding a chest of copper coins, dramatic lighting, fantasy illustration style"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 h-32"
                />
                <p className="mt-2 text-xs text-gray-600">
                  💡 Tip: Be specific! Include lighting, mood, colors, and style.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setCustomPromptNode(null)}
                  className="bg-gray-400 text-white px-6 py-2 rounded-md hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateWithCustomPrompt(customPromptNode)}
                  disabled={!customPrompt.trim() || generating === customPromptNode}
                  className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {generating === customPromptNode ? '⏳ Generating...' : '🎨 Generate Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <h2 className="text-2xl font-bold text-gray-900">
                📖 Node {expandedText}
              </h2>
              <button
                onClick={() => setExpandedText(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="prose max-w-none">
              <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
                {imageRows.find(row => row.node_key === expandedText)?.text}
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
