'use client';

import React, { useMemo, useState } from 'react';
import { CornerDownRight, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import type { ReferralTreeNode } from './ReferralTreeView';

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

function nodeMatchesFilter(node: ReferralTreeNode, filter: 'all' | 'verified' | 'unverified'): boolean {
  const verified = node.verified === true || node.user?.verified === true;
  if (filter === 'verified') return verified;
  if (filter === 'unverified') return !verified;
  return true;
}

function nodeMatchesQuery(node: ReferralTreeNode, query: string): boolean {
  if (!query) return true;
  const name = getNodeName(node).toLowerCase();
  const email = getNodeEmail(node).toLowerCase();
  return name.includes(query) || email.includes(query);
}

/** Keep nodes that match filter/search, or have matching descendants */
function pruneTree(
  nodes: ReferralTreeNode[],
  filter: 'all' | 'verified' | 'unverified',
  query: string
): ReferralTreeNode[] {
  const q = query.trim().toLowerCase();
  const out: ReferralTreeNode[] = [];

  for (const node of nodes || []) {
    const prunedChildren = pruneTree(node.children || [], filter, q);
    const selfMatches = nodeMatchesFilter(node, filter) && nodeMatchesQuery(node, q);
    const hasVisibleChildren = prunedChildren.length > 0;

    if (selfMatches || hasVisibleChildren) {
      out.push({
        ...node,
        children: prunedChildren.length ? prunedChildren : node.children?.length ? [] : undefined,
      });
    }
  }

  return out;
}

function countVisible(nodes: ReferralTreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1;
    if (node.children?.length) n += countVisible(node.children);
  }
  return n;
}

type Props = {
  nodes: ReferralTreeNode[];
  filter: 'all' | 'verified' | 'unverified';
};

function ReferralListRow({
  node,
  parentName,
  depth,
}: {
  node: ReferralTreeNode;
  parentName?: string;
  depth: number;
}) {
  const name = getNodeName(node);
  const email = getNodeEmail(node);
  const verified = node.verified === true || node.user?.verified === true;
  const joinedAt = node.user?.joinedAt;
  const id = node.user?.id || `${name}-${depth}`;
  const directCount = node.children?.length ?? node.childrenCount ?? 0;
  const teamCount = node.totalDescendants ?? 0;

  return (
    <div className={`ref-list__branch${depth > 0 ? ' ref-list__branch--nested' : ''}`}>
      {parentName && (
        <div className="ref-list__under">
          <CornerDownRight size={11} />
          Under {parentName}
        </div>
      )}
      <div className="ref-list__item">
        <div className="ref-list__avatar">{getInitials(name)}</div>
        <div className="ref-list__body">
          <div className="ref-list__top">
            <span className="ref-list__name">{name}</span>
            <span className="ref-node__badge ref-node__badge--level">L{node.level ?? depth + 1}</span>
            {verified ? (
              <span className="ref-node__badge ref-node__badge--verified">
                <ShieldCheck size={9} /> Verified
              </span>
            ) : (
              <span
                className="ref-node__badge"
                style={{ background: 'rgba(217,119,6,0.12)', color: 'var(--ref-amber)' }}
              >
                <ShieldOff size={9} /> Pending
              </span>
            )}
          </div>
          {email && <p className="ref-list__email">{email}</p>}
          <div className="ref-list__foot">
            {joinedAt && <span>Joined {new Date(joinedAt).toLocaleDateString()}</span>}
            <span>
              {directCount} direct · {teamCount} team
            </span>
          </div>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="ref-list__branch-children">
          {node.children.map((child, idx) => (
            <ReferralListRow
              key={child.user?.id || `${getNodeName(child)}-${depth + 1}-${idx}`}
              node={child}
              parentName={name}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReferralListView({ nodes, filter }: Props) {
  const [query, setQuery] = useState('');

  const tree = useMemo(
    () => pruneTree(nodes, filter, query),
    [nodes, filter, query]
  );

  const total = useMemo(() => countVisible(tree), [tree]);

  if (!tree.length) {
    return (
      <div className="ref-empty">
        <p className="ref-empty__title">No referrals found</p>
        <p className="ref-empty__text">
          {query
            ? 'Try a different search term.'
            : filter !== 'all'
              ? `No ${filter} referrals yet. Switch to "All" or share your link.`
              : 'Share your referral link to start building your network.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="ref-list__search">
        <Search size={16} className="text-gray-400" />
        <input
          type="search"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search referrals"
        />
      </div>
      <p className="text-sm mb-3" style={{ color: 'var(--ref-muted)' }}>
        Showing {total} referral{total !== 1 ? 's' : ''} in hierarchy
        {filter !== 'all' && ` (${filter})`}
      </p>
      <div className="ref-list__tree">
        {tree.map((node, idx) => (
          <ReferralListRow
            key={node.user?.id || `root-${idx}`}
            node={node}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}
