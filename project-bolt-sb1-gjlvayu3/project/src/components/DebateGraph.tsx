import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGameStore } from '../store';
import { RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface DebateGraphProps {
  fullscreen?: boolean;
}

const DebateGraph: React.FC<DebateGraphProps> = ({ fullscreen = false }) => {
  const { getGraphData, debate } = useGameStore();
  const graphRef = useRef<any>(null);
  const [graphData, setGraphData] = useState(getGraphData());
  const [hoveredLink, setHoveredLink] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Update graph data whenever debate changes
  useEffect(() => {
    if (!autoRefresh) return;
    
    const updateInterval = setInterval(() => {
      setGraphData(getGraphData());
    }, 1000); // Update every second
    
    return () => clearInterval(updateInterval);
  }, [autoRefresh, getGraphData, debate]);
  
  useEffect(() => {
    if (graphRef.current) {
      // Adjust force simulation parameters
      graphRef.current.d3Force('charge').strength(fullscreen ? -600 : -400);
      graphRef.current.d3Force('link').distance(fullscreen ? 200 : 150);
      
      // Center the graph
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(500);
        }
      }, 500);
    }
  }, [graphData, fullscreen]);
  
  const nodeColor = (node: any) => {
    if (node.type === 'claim') return '#2196F3'; // Blue for claims
    return '#9E9E9E'; // Gray for other nodes
  };
  
  const linkColor = (link: any) => {
    if (link.stance === 'WITH') return '#4CAF50'; // Green for supporting links
    if (link.stance === 'AGAINST') return '#F44336'; // Red for opposing links
    if (link.stance === 'return') return '#9E9E9E'; // Gray for return links
    return '#9E9E9E'; // Default gray
  };
  
  // Position nodes in a structured layout
  const positionNodes = (graphData: any) => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return graphData;
    
    // Find the main claim node
    const mainClaimNode = graphData.nodes.find((node: any) => node.type === 'claim' && !node.parentId);
    if (!mainClaimNode) return graphData;
    
    // Set main claim at top center
    mainClaimNode.fx = 0;
    mainClaimNode.fy = -200;
    
    // Create vertical lines for each claim
    const claimNodes = graphData.nodes.filter((node: any) => node.type === 'claim');
    claimNodes.forEach((node: any, index: number) => {
      if (node.id !== mainClaimNode.id) {
        // Position subclaims in a grid
        const col = index % 3;
        const row = Math.floor(index / 3);
        node.fx = (col - 1) * 300;
        node.fy = 100 + row * 300;
      }
    });
    
    return graphData;
  };

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.2, 400);
      setZoomLevel(Math.min(150, zoomLevel + 10));
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 0.8, 400);
      setZoomLevel(Math.max(50, zoomLevel - 10));
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  return (
    <div className={fullscreen ? "graph-container-fullscreen" : "graph-container"}>
      {fullscreen && (
        <div className="graph-controls absolute top-4 right-4 z-10 bg-white p-2 rounded-lg shadow-md flex gap-2">
          <button 
            className="btn btn-sm btn-secondary"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="zoom-level">{zoomLevel}%</span>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleAutoRefresh}
            title={autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}
          >
            <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
          </button>
        </div>
      )}
      
      <ForceGraph2D
        ref={graphRef}
        graphData={positionNodes(graphData)}
        nodeLabel={(node) => node.label}
        nodeColor={nodeColor}
        linkColor={linkColor}
        linkDirectionalArrowLength={8}
        linkDirectionalArrowRelPos={1}
        linkWidth={(link) => link === hoveredLink ? 4 : 2}
        nodeRelSize={fullscreen ? 10 : 8}
        cooldownTime={1000}
        onEngineStop={() => {
          // Ensure all nodes have their positions set
          if (graphRef.current) {
            graphRef.current.zoomToFit(500);
          }
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          // Only draw circles for claims
          if (node.type === 'claim') {
            const size = fullscreen ? 12 : 10;
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI);
            ctx.fillStyle = nodeColor(node);
            ctx.fill();
            
            // Add a subtle glow effect
            ctx.shadowColor = nodeColor(node);
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Draw vertical line below the claim
            ctx.beginPath();
            ctx.moveTo(node.x || 0, (node.y || 0) + size);
            ctx.lineTo(node.x || 0, (node.y || 0) + 200);
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }}
        linkCanvasObject={(link, ctx, globalScale) => {
          // Custom drawing for links to represent arguments
          const start = link.source;
          const end = link.target;
          
          if (!start || !end || typeof start === 'string' || typeof end === 'string') return;
          
          const sourceX = start.x || 0;
          const sourceY = start.y || 0;
          const targetX = end.x || 0;
          const targetY = end.y || 0;
          
          // Draw the link as an arrow
          ctx.beginPath();
          ctx.moveTo(sourceX, sourceY);
          
          // If this is an argument link (not a return link)
          if (link.stance === 'WITH' || link.stance === 'AGAINST') {
            // Calculate vertical offset based on link index
            const linkIndex = link.index || 0;
            const verticalOffset = linkIndex * 30; // Space arguments vertically
            
            // For WITH arguments, position on the left side
            // For AGAINST arguments, position on the right side
            const horizontalOffset = link.stance === 'WITH' ? -80 : 80;
            
            // Draw a path with vertical segments for better organization
            // First vertical segment from source
            ctx.lineTo(sourceX, sourceY + 40 + verticalOffset);
            
            // Horizontal segment to the side
            ctx.lineTo(sourceX + horizontalOffset, sourceY + 40 + verticalOffset);
            
            // Second vertical segment to target
            ctx.lineTo(sourceX + horizontalOffset, targetY);
            
            // Final horizontal segment to target
            ctx.lineTo(targetX, targetY);
          } else {
            // Draw straight line for return links
            ctx.lineTo(targetX, targetY);
          }
          
          ctx.strokeStyle = linkColor(link);
          ctx.lineWidth = link === hoveredLink ? 4 : 2;
          ctx.stroke();
          
          // Draw arrowhead
          const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
          const arrowLength = 10;
          const arrowWidth = 6;
          
          ctx.beginPath();
          ctx.moveTo(targetX, targetY);
          ctx.lineTo(
            targetX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
            targetY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
          );
          ctx.lineTo(
            targetX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
            targetY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
          );
          ctx.closePath();
          ctx.fillStyle = linkColor(link);
          ctx.fill();
          
          // If this is an argument link, draw a label
          if ((link.stance === 'WITH' || link.stance === 'AGAINST') && link.label) {
            // Calculate vertical offset based on link index
            const linkIndex = link.index || 0;
            const verticalOffset = linkIndex * 30;
            
            // For WITH arguments, position on the left side
            // For AGAINST arguments, position on the right side
            const horizontalOffset = link.stance === 'WITH' ? -80 : 80;
            
            // Calculate position for the text (on the horizontal segment)
            const textX = sourceX + (horizontalOffset / 2);
            const textY = sourceY + 40 + verticalOffset;
            
            // Draw text background
            const fontSize = fullscreen ? 12 : 10;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = Math.min(ctx.measureText(link.label).width, 150);
            const padding = 4;
            
            // Background color based on stance
            const bgColor = link.stance === 'WITH' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(
              textX - textWidth / 2 - padding,
              textY - fontSize - padding,
              textWidth + padding * 2,
              fontSize + padding * 2
            );
            
            // Draw text
            ctx.fillStyle = link.stance === 'WITH' ? '#2E7D32' : '#C62828';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              link.label.length > 25 ? link.label.substring(0, 25) + '...' : link.label, 
              textX, 
              textY
            );
            
            // If this link is hovered, show the full argument text
            if (link === hoveredLink) {
              // Calculate position for the tooltip
              const tooltipX = textX;
              const tooltipY = textY - 30;
              
              // Draw tooltip background
              const tooltipWidth = Math.min(ctx.measureText(link.label).width, 300);
              const tooltipPadding = 8;
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(
                tooltipX - tooltipWidth / 2 - tooltipPadding,
                tooltipY - fontSize - tooltipPadding,
                tooltipWidth + tooltipPadding * 2,
                fontSize + tooltipPadding * 2
              );
              
              // Draw tooltip text
              ctx.fillStyle = 'white';
              ctx.fillText(link.label, tooltipX, tooltipY);
            }
          }
        }}
        onLinkHover={(link) => {
          setHoveredLink(link);
          if (link) {
            // Get mouse position for tooltip
            const mousePos = graphRef.current.screen2GraphCoords(
              graphRef.current.lastKnownMousePos.x,
              graphRef.current.lastKnownMousePos.y
            );
            setTooltipPosition({ x: mousePos.x, y: mousePos.y });
          }
        }}
        onNodeClick={(node) => {
          // Highlight node on click
          if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 1000);
            graphRef.current.zoom(2, 1000);
          }
        }}
      />
      
      {/* Legend for graph */}
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color claim-color-box"></div>
          <span>Claim (Circle)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color with-color-box"></div>
          <span>Supporting Argument (Arrow)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color against-color-box"></div>
          <span>Opposing Argument (Arrow)</span>
        </div>
      </div>
    </div>
  );
};

export default DebateGraph;