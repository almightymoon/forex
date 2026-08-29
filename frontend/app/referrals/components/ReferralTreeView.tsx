'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, ShieldCheck, Users } from 'lucide-react';

export type ReferralTreeNode = {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    referralCode?: string;
    joinedAt?: string;
    verified?: boolean;
  };
  firstName?: string;
  lastName?: string;
  email?: string;
  verified?: boolean;
  level?: number;
  children?: ReferralTreeNode[];
  childrenCount?: number;
  totalDescendants?: number;
};

type LayoutNode = {
  id: string;
  name: string;
  email: string;
  level: number;
  verified: boolean;
  isRoot?: boolean;
  childrenCount: number;
  x: number;
  y: number;
  children: LayoutNode[];
};

const NODE_W = 200;
const NODE_H = 132;
const LEVEL_GAP = 210;
const SIBLING_GAP = 56;

function getNodeName(node: ReferralTreeNode): string {
  return (
    node.user?.name ||
    `${node.firstName || ''} ${node.lastName || ''}`.trim() ||
    'Unknown'
  );
}

function getNodeEmail(node: ReferralTreeNode): string {
  return node.user?.email || node.email || '';
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function measureWidth(node: ReferralTreeNode): number {
  const children = node.children || [];
  if (children.length === 0) return NODE_W;
  const childWidths = children.map(measureWidth);
  return (
    childWidths.reduce((sum, w) => sum + w, 0) +
    SIBLING_GAP * Math.max(0, children.length - 1)
  );
}

function buildLayout(
  node: ReferralTreeNode,
  depth: number,
  left: number,
  opts?: { isRoot?: boolean }
): LayoutNode {
  const children = node.children || [];
  const childWidths = children.map(measureWidth);
  const subtreeWidth = children.length
    ? childWidths.reduce((sum, w) => sum + w, 0) + SIBLING_GAP * Math.max(0, children.length - 1)
    : NODE_W;

  let cursor = left;
  const childLayouts = children.map((child, i) => {
    const childLeft = cursor;
    const laid = buildLayout(child, depth + 1, childLeft);
    cursor += childWidths[i] + SIBLING_GAP;
    return laid;
  });

  return {
    id: node.user?.id || `${getNodeName(node)}-${depth}-${left}`,
    name: getNodeName(node),
    email: getNodeEmail(node),
    level: node.level ?? depth,
    verified: node.verified === true || node.user?.verified === true,
    isRoot: opts?.isRoot,
    childrenCount: node.childrenCount ?? childLayouts.length,
    x: left + subtreeWidth / 2,
    y: depth * LEVEL_GAP,
    children: childLayouts,
  };
}

function flattenLayout(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(flattenLayout)];
}

type TreeSegment = { x1: number; y1: number; x2: number; y2: number };

function collectOrgLines(node: LayoutNode): TreeSegment[] {
  const segments: TreeSegment[] = [];
  const children = node.children;
  if (!children.length) return segments;

  const parentAnchorY = node.y + NODE_H - 6;
  const childAnchorY = children[0].y + 6;
  const busY = parentAnchorY + Math.max(28, (childAnchorY - parentAnchorY) * 0.42);

  segments.push({ x1: node.x, y1: parentAnchorY, x2: node.x, y2: busY });

  if (children.length === 1) {
    if (Math.abs(children[0].x - node.x) > 2) {
      segments.push({ x1: node.x, y1: busY, x2: children[0].x, y2: busY });
    }
    segments.push({ x1: children[0].x, y1: busY, x2: children[0].x, y2: childAnchorY });
  } else {
    const xs = children.map((c) => c.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    if (node.x < minX || node.x > maxX) {
      segments.push({ x1: node.x, y1: busY, x2: node.x < minX ? minX : maxX, y2: busY });
    }
    segments.push({ x1: minX, y1: busY, x2: maxX, y2: busY });
    for (const child of children) {
      segments.push({ x1: child.x, y1: busY, x2: child.x, y2: childAnchorY });
    }
  }

  for (const child of children) {
    segments.push(...collectOrgLines(child));
  }
  return segments;
}

type Props = {
  rootName: string;
  rootCode: string;
  nodes: ReferralTreeNode[];
  stats?: {
    direct?: number;
    total?: number;
    verified?: number;
  };
};

export default function ReferralTreeView({ rootName, rootCode, nodes, stats }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const { layout, width, height, flat, links } = useMemo(() => {
    const syntheticRoot: ReferralTreeNode = {
      user: { name: rootName, email: '', referralCode: rootCode },
      level: 0,
      verified: true,
      children: nodes,
    };
    const treeWidth = measureWidth(syntheticRoot);
    const layout = buildLayout(syntheticRoot, 0, 40, { isRoot: true });
    const flatNodes = flattenLayout(layout);
    const treeLinks = collectOrgLines(layout);
    const treeHeight =
      flatNodes.length > 0
        ? Math.max(...flatNodes.map((n) => n.y)) + NODE_H + 40
        : NODE_H + 40;

    return {
      layout,
      width: Math.max(treeWidth + 80, 640),
      height: Math.max(treeHeight, 420),
      flat: flatNodes,
      links: treeLinks,
    };
  }, [nodes, rootCode, rootName]);

  const zoomIn = () => setScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)));

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const centerTree = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const offsetX = (el.clientWidth - width * scale) / 2;
    setPan({ x: Math.max(0, offsetX), y: 16 });
  }, [scale, width]);

  useEffect(() => {
    centerTree();
  }, [centerTree, nodes.length]);

  return (
    <div className="ref-tree-canvas">
      <div className="ref-tree-canvas__toolbar">
        <div className="ref-tree-canvas__stats">
          <span className="ref-tree-canvas__stat-pill">
            <Users size={12} />
            {stats?.direct ?? nodes.length} direct
          </span>
          <span className="ref-tree-canvas__stat-pill">
            {stats?.total ?? flat.length - 1} total
          </span>
          <span className="ref-tree-canvas__stat-pill">
            <ShieldCheck size={12} />
            {stats?.verified ?? flat.filter((n) => n.verified && !n.isRoot).length} verified
          </span>
        </div>
        <div className="ref-tree-canvas__zoom">
          <button type="button" className="ref-tree-canvas__zoom-btn" onClick={zoomOut} aria-label="Zoom out">
            <Minus size={14} />
          </button>
          <span className="ref-tree-canvas__zoom-label">{Math.round(scale * 100)}%</span>
          <button type="button" className="ref-tree-canvas__zoom-btn" onClick={zoomIn} aria-label="Zoom in">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`ref-tree-canvas__viewport${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="ref-tree-canvas__stage"
          style={{
            width,
            height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <svg className="ref-tree-canvas__svg" width={width} height={height}>
            {links.map((seg, i) => (
              <line
                key={i}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke="rgba(37, 99, 235, 0.42)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ))}
            {links.map((seg, i) => (
              <circle
                key={`dot-${i}`}
                cx={seg.x2}
                cy={seg.y2}
                r={3}
                fill="rgba(37, 99, 235, 0.55)"
              />
            ))}
          </svg>

          <div className="ref-tree-canvas__nodes">
            {flat.map((node) => (
              <div
                key={node.id}
                className={`ref-node${node.isRoot ? ' ref-node--root' : ''}${node.children.length === 0 && !node.isRoot ? ' ref-node--leaf' : ''}`}
                style={{ left: node.x, top: node.y }}
              >
                <div className="ref-node__card">
                  <div className="ref-node__avatar">{getInitials(node.name)}</div>
                  <p className="ref-node__name">{node.name}</p>
                  <div className="ref-node__meta">
                    {node.isRoot ? (
                      <span className="ref-node__badge ref-node__badge--root">YOU</span>
                    ) : (
                      <span className="ref-node__badge ref-node__badge--level">L{node.level}</span>
                    )}
                    {!node.isRoot && node.verified && (
                      <span className="ref-node__badge ref-node__badge--verified">
                        <ShieldCheck size={9} /> Verified
                      </span>
                    )}
                  </div>
                  {node.email ? (
                    <p className="ref-node__email" title={node.email}>
                      {node.email}
                    </p>
                  ) : node.isRoot && rootCode ? (
                    <p className="ref-node__email">{rootCode}</p>
                  ) : null}
                  {!node.isRoot && node.childrenCount > 0 && (
                    <p className="ref-node__children-count">
                      {node.childrenCount} direct referral{node.childrenCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
