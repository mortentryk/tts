'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  title: string;
  slug: string;
  default_media_type: string;
  video_enabled: boolean;
  node_count: number;
}

interface StoryNode {
  node_key: string;
  text_md: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  media_type?: string;
  image_prompt?: string;
}

export default function MediaManager() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [selectedStoryData, setSelectedStoryData] = useState<Story | null>(null);
  const [nodes, setNodes] = useState<StoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<string>('');

  // Load stories
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch('/api/admin/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    }
  };

  const loadStoryNodes = async () => {
    if (!selectedStory) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/story-nodes?storySlug=${selectedStory}`);
      if (response.ok) {
        const data = await response.json();
        setNodes(data.nodes || []);
        setSelectedStoryData(data.story);
      }
    } catch (error) {
      console.error('Failed to load story nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStory) {
      loadStoryNodes();
    }
  }, [selectedStory]);

  const updateStoryMediaConfig = async (updates: Partial<Story>) => {
    if (!selectedStoryData) return;
    
    try {
      const response = await fetch('/api/admin/stories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          ...updates,
        }),
      });

      if (response.ok) {
        setSelectedStoryData(prev => prev ? { ...prev, ...updates } : null);
        loadStories(); // Refresh stories list
      }
    } catch (error) {
      console.error('Failed to update story config:', error);
    }
  };

  const updateNodeMediaType = async (nodeKey: string, mediaType: string) => {
    try {
      const response = await fetch('/api/admin/story-nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeKey,
          media_type: mediaType,
        }),
      });

      if (response.ok) {
        setNodes(prev => prev.map(node => 
          node.node_key === nodeKey 
            ? { ...node, media_type: mediaType }
            : node
        ));
      }
    } catch (error) {
      console.error('Failed to update node media type:', error);
    }
  };

  const generateMedia = async (nodeKey: string, mediaType: string) => {
    setGenerating(nodeKey);
    
    try {
      const response = await fetch('/api/admin/generate-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          nodeId: nodeKey,
          mediaType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the node with new media URLs
        setNodes(prev => prev.map(node => 
          node.node_key === nodeKey 
            ? { 
                ...node, 
                image_url: data.image?.url || node.image_url,
                video_url: data.video?.url || node.video_url,
              }
            : node
        ));
      } else {
        alert(`❌ Failed to generate media: ${data.error}`);
      }
    } catch (error) {
      console.error('Generate media error:', error);
      alert('❌ Failed to generate media');
    } finally {
      setGenerating(null);
    }
  };

  const generateBulkMedia = async (mediaType: string) => {
    if (!confirm(`Generate ${mediaType} for all nodes in this story?`)) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/generate-bulk-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySlug: selectedStory,
          mediaType,
          replaceExisting: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Generated ${data.summary.successful} media items successfully`);
        loadStoryNodes(); // Refresh nodes
      } else {
        alert(`❌ Failed to generate bulk media: ${data.error}`);
      }
    } catch (error) {
      console.error('Bulk media generation error:', error);
      alert('❌ Failed to generate bulk media');
    } finally {
      setLoading(false);
    }
  };

  const generateAudio = async (nodeKey: string) => {
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
        alert(`✅ Audio generated!\nCost: $${data.audio.cost.toFixed(4)}\nCached: ${data.audio.cached ? 'Yes' : 'No'}`);
        
        // Update the node with new audio URL
        setNodes(prev => prev.map(node => 
          node.node_key === nodeKey 
            ? { ...node, audio_url: data.audio.url }
            : node
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

  const startEditPrompt = (nodeKey: string, currentPrompt?: string) => {
    setEditingPrompt(nodeKey);
    setPromptText(currentPrompt || '');
  };

  const savePrompt = async (nodeKey: string) => {
    try {
      const response = await fetch(`/api/stories/${selectedStory}/nodes/${nodeKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_prompt: promptText,
        }),
      });

      if (response.ok) {
        setNodes(prev => prev.map(node => 
          node.node_key === nodeKey 
            ? { ...node, image_prompt: promptText }
            : node
        ));
        setEditingPrompt(null);
        setPromptText('');
        alert('✅ Prompt saved successfully!');
      } else {
        alert('❌ Failed to save prompt');
      }
    } catch (error) {
      console.error('Save prompt error:', error);
      alert('❌ Failed to save prompt');
    }
  };

  const cancelEditPrompt = () => {
    setEditingPrompt(null);
    setPromptText('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎬 Media Manager
          </h1>
          <p className="text-gray-600">
            Configure and generate images and videos for your stories
          </p>
        </div>

        {/* Story Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📚 Select Story</h2>
          <select
            value={selectedStory}
            onChange={(e) => setSelectedStory(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a story...</option>
            {stories.map((story) => (
              <option key={story.id} value={story.slug}>
                {story.title} ({story.node_count} nodes)
              </option>
            ))}
          </select>
        </div>

        {selectedStoryData && (
          <>
            {/* Story Configuration */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">⚙️ Story Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Media Type
                  </label>
                  <select
                    value={selectedStoryData.default_media_type || 'image'}
                    onChange={(e) => updateStoryMediaConfig({ default_media_type: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="image">Image Only</option>
                    <option value="video">Video Only</option>
                    <option value="both">Both Image & Video</option>
                    <option value="none">No Media</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Generation
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStoryData.video_enabled || false}
                        onChange={(e) => updateStoryMediaConfig({ video_enabled: e.target.checked })}
                        className="mr-2"
                      />
                      Enable Video Generation
                    </label>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => generateBulkMedia('image')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  🖼️ Generate All Images
                </button>
                <button
                  onClick={() => generateBulkMedia('video')}
                  disabled={loading || !selectedStoryData.video_enabled}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  🎬 Generate All Videos
                </button>
                <button
                  onClick={() => generateBulkMedia('both')}
                  disabled={loading || !selectedStoryData.video_enabled}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  🎨 Generate Both
                </button>
              </div>
            </div>

            {/* Node Management */}
            <div className="bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold p-6 border-b">📝 Story Nodes</h2>
              
              {loading ? (
                <div className="p-6 text-center">Loading nodes...</div>
              ) : (
                <div className="divide-y">
                  {nodes.map((node) => (
                    <div key={node.node_key} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {node.node_key}
                            </span>
                            <select
                              value={node.media_type || selectedStoryData.default_media_type || 'image'}
                              onChange={(e) => updateNodeMediaType(node.node_key, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                              <option value="both">Both</option>
                              <option value="none">None</option>
                            </select>
                          </div>
                          
                          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                            {node.text_md.substring(0, 150)}...
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm mb-2">
                            {node.image_url && (
                              <span className="text-green-600">✅ Image</span>
                            )}
                            {node.video_url && (
                              <span className="text-purple-600">✅ Video</span>
                            )}
                            {node.audio_url && (
                              <span className="text-orange-600">✅ Audio</span>
                            )}
                            {!node.image_url && !node.video_url && !node.audio_url && (
                              <span className="text-gray-500">No media</span>
                            )}
                          </div>

                          {node.image_prompt && (
                            <div className="text-xs text-gray-500 italic mt-1">
                              Prompt: {node.image_prompt.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => generateMedia(node.node_key, 'image')}
                              disabled={generating === node.node_key}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {generating === node.node_key ? '⏳' : '🖼️'} Image
                            </button>
                            <button
                              onClick={() => generateMedia(node.node_key, 'video')}
                              disabled={generating === node.node_key || !selectedStoryData.video_enabled}
                              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                              {generating === node.node_key ? '⏳' : '🎬'} Video
                            </button>
                            <button
                              onClick={() => generateAudio(node.node_key)}
                              disabled={generatingAudio === node.node_key}
                              className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                            >
                              {generatingAudio === node.node_key ? '⏳' : '🔊'} Audio
                            </button>
                          </div>
                          <button
                            onClick={() => startEditPrompt(node.node_key, node.image_prompt)}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          >
                            ✏️ Change Prompt
                          </button>
                        </div>
                      </div>

                      {/* Prompt Editor */}
                      {editingPrompt === node.node_key && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image Generation Prompt
                          </label>
                          <textarea
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            placeholder="Enter a custom prompt for image generation..."
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={4}
                          />
                          <div className="flex space-x-2 mt-3">
                            <button
                              onClick={() => savePrompt(node.node_key)}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              ✅ Save Prompt
                            </button>
                            <button
                              onClick={cancelEditPrompt}
                              className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
