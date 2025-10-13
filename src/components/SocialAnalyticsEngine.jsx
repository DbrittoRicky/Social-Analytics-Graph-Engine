/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { Users, TrendingUp, Network, BarChart3, Info } from 'lucide-react';

const SocialAnalyticsEngine = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sample data for demonstration
  const sampleData = `Alice,Bob
Alice,Charlie
Bob,David
Charlie,David
David,Eve
Eve,Frank
Frank,Alice
Charlie,Eve
Bob,Frank`;

  // Parse input to create graph
  const parseInput = (text) => {
    const lines = text.trim().split('\n');
    const nodeSet = new Set();
    const edgeList = [];

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const source = parts[0].trim();
        const target = parts[1].trim();
        if (source && target) {
          nodeSet.add(source);
          nodeSet.add(target);
          edgeList.push({ source, target });
        }
      }
    });

    const nodeList = Array.from(nodeSet).map((id, idx) => ({
      id,
      x: 400 + Math.random() * 200 - 100,
      y: 300 + Math.random() * 200 - 100,
      vx: 0,
      vy: 0
    }));

    return { nodes: nodeList, edges: edgeList };
  };

  // Calculate degree centrality
  const calculateDegree = (nodes, edges) => {
    const degree = {};
    nodes.forEach(n => degree[n.id] = 0);
    edges.forEach(e => {
      degree[e.source]++;
      degree[e.target]++;
    });
    return degree;
  };

  // Calculate betweenness centrality (simplified)
  const calculateBetweenness = (nodes, edges) => {
    const betweenness = {};
    nodes.forEach(n => betweenness[n.id] = 0);
    
    // Build adjacency list
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    });

    // Simple BFS-based betweenness
    nodes.forEach(source => {
      const queue = [source.id];
      const visited = new Set([source.id]);
      const paths = {};
      nodes.forEach(n => paths[n.id] = 0);
      paths[source.id] = 1;

      while (queue.length > 0) {
        const curr = queue.shift();
        adj[curr].forEach(next => {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
            paths[next] = paths[curr];
          } else {
            paths[next] += paths[curr];
          }
        });
      }

      Object.keys(paths).forEach(node => {
        if (node !== source.id) {
          betweenness[node] += paths[node];
        }
      });
    });

    return betweenness;
  };

  // Detect communities (simple label propagation)
  const detectCommunities = (nodes, edges) => {
    const communities = {};
    nodes.forEach((n, idx) => communities[n.id] = idx);

    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    });

    for (let iter = 0; iter < 5; iter++) {
      const newCommunities = { ...communities };
      nodes.forEach(node => {
        const neighbors = adj[node.id];
        const labelCount = {};
        neighbors.forEach(neighbor => {
          const label = communities[neighbor];
          labelCount[label] = (labelCount[label] || 0) + 1;
        });
        
        let maxLabel = communities[node.id];
        let maxCount = 0;
        Object.entries(labelCount).forEach(([label, count]) => {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = parseInt(label);
          }
        });
        newCommunities[node.id] = maxLabel;
      });
      Object.assign(communities, newCommunities);
    }

    return communities;
  };

  // Run analytics
  const runAnalytics = () => {
    if (nodes.length === 0) return;

    const degree = calculateDegree(nodes, edges);
    const betweenness = calculateBetweenness(nodes, edges);
    const communities = detectCommunities(nodes, edges);

    const sortedByDegree = Object.entries(degree)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const sortedByBetweenness = Object.entries(betweenness)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const communityGroups = {};
    Object.entries(communities).forEach(([node, comm]) => {
      if (!communityGroups[comm]) communityGroups[comm] = [];
      communityGroups[comm].push(node);
    });

    setAnalytics({
      nodeCount: nodes.length,
      edgeCount: edges.length,
      density: edges.length > 0 ? (2 * edges.length) / (nodes.length * (nodes.length - 1)) : 0,
      topByDegree: sortedByDegree,
      topByBetweenness: sortedByBetweenness,
      communities: Object.values(communityGroups),
      degree,
      betweenness,
      communityMap: communities
    });
  };

  // Force-directed layout simulation
  useEffect(() => {
    if (nodes.length === 0 || !canvasRef.current || activeTab !== 'graph') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        setIsAnimating(false);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    setIsAnimating(true);

    let frameCount = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Apply forces (slow down after 300 frames)
      const damping = frameCount > 300 ? 0.95 : 0.85;
      
      nodes.forEach(node => {
        let fx = 0, fy = 0;

        // Repulsion between all nodes
        nodes.forEach(other => {
          if (node.id !== other.id) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 2000 / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        // Attraction along edges
        edges.forEach(edge => {
          let other = null;
          if (edge.source === node.id) other = nodeMap[edge.target];
          if (edge.target === node.id) other = nodeMap[edge.source];
          
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = dist * 0.015;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        // Center gravity
        fx += (width / 2 - node.x) * 0.002;
        fy += (height / 2 - node.y) * 0.002;

        node.vx = (node.vx + fx) * damping;
        node.vy = (node.vy + fy) * damping;
        node.x += node.vx;
        node.y += node.vy;

        // Boundaries
        node.x = Math.max(40, Math.min(width - 40, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      });

      // Draw edges
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      edges.forEach(edge => {
        const source = nodeMap[edge.source];
        const target = nodeMap[edge.target];
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const size = analytics ? 
          Math.max(10, Math.min(25, analytics.degree[node.id] * 4)) : 12;
        
        const community = analytics?.communityMap[node.id] || 0;
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        ctx.fillStyle = colors[community % colors.length];
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Background for text
        const textWidth = ctx.measureText(node.id).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(node.x - textWidth/2 - 4, node.y - size - 20, textWidth + 8, 18);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillText(node.id, node.x, node.y - size - 11);
      });

      frameCount++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        setIsAnimating(false);
      }
    };
  }, [nodes, edges, analytics, activeTab]);

  const handleLoadSample = () => {
    setInputText(sampleData);
  };

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      alert('Please enter some connection data first!');
      return;
    }
    
    const { nodes: newNodes, edges: newEdges } = parseInput(inputText);
    
    if (newNodes.length === 0) {
      alert('No valid connections found. Please check your input format.');
      return;
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
    
    // Calculate analytics after a brief delay
    setTimeout(() => {
      runAnalytics();
      setActiveTab('graph');
    }, 100);
  };

  // Recalculate analytics when switching to analytics tab
  useEffect(() => {
    if (activeTab === 'analytics' && nodes.length > 0 && !analytics) {
      runAnalytics();
    }
  }, [activeTab, nodes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Network className="w-10 h-10" />
            Social Analytics Graph Engine
          </h1>
          <p className="text-blue-200">Analyze social networks with advanced graph algorithms</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('input')}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === 'input'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              Input Data
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              disabled={nodes.length === 0}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === 'graph'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : nodes.length === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Network className="w-5 h-5" />
              Network Graph
              {nodes.length > 0 && <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">{nodes.length}</span>}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              disabled={nodes.length === 0}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === 'analytics'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : nodes.length === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'input' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">How to use:</p>
                    <p>Enter connections in the format: <code className="bg-white px-2 py-0.5 rounded">Person1,Person2</code></p>
                    <p className="mt-1">Each line represents a connection between two people.</p>
                  </div>
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Alice,Bob&#10;Bob,Judy&#10;Judy,Nebron&#10;Nebron,Jamal"
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleLoadSample}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                  >
                    Load Sample Data
                  </button>
                  <button
                    onClick={handleAnalyze}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-5 h-5" />
                    Analyze Network
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'graph' && (
              <div>
                {nodes.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Legend</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                          <span>Community 1</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-red-500"></div>
                          <span>Community 2</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-500"></div>
                          <span>Community 3</span>
                        </div>
                        <div className="text-gray-500">• Node size = degree centrality</div>
                        {isAnimating && <div className="text-green-600 font-semibold">● Animating</div>}
                      </div>
                    </div>
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                      <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        className="w-full bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No graph data yet. Go to Input Data tab to add connections.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                {analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                        <div className="text-3xl font-bold text-blue-900">{analytics.nodeCount}</div>
                        <div className="text-sm text-blue-700 mt-1">Total Nodes</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                        <div className="text-3xl font-bold text-purple-900">{analytics.edgeCount}</div>
                        <div className="text-sm text-purple-700 mt-1">Total Connections</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                        <div className="text-3xl font-bold text-green-900">
                          {(analytics.density * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-green-700 mt-1">Network Density</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          Top 5 by Degree Centrality
                        </h3>
                        <div className="space-y-3">
                          {analytics.topByDegree.map(([node, degree], idx) => (
                            <div key={node} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                  {idx + 1}
                                </div>
                                <span className="font-semibold text-gray-900">{node}</span>
                              </div>
                              <span className="text-blue-600 font-bold">{degree}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          Top 5 by Betweenness
                        </h3>
                        <div className="space-y-3">
                          {analytics.topByBetweenness.map(([node, score], idx) => (
                            <div key={node} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                  {idx + 1}
                                </div>
                                <span className="font-semibold text-gray-900">{node}</span>
                              </div>
                              <span className="text-purple-600 font-bold">{score.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Detected Communities ({analytics.communities.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {analytics.communities.map((community, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-4 border border-gray-300">
                            <div className="font-semibold text-gray-900 mb-2">
                              Community {idx + 1} ({community.length} members)
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {community.map(member => (
                                <span
                                  key={member}
                                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                >
                                  {member}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No analytics available yet. Analyze a network first.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialAnalyticsEngine;