declare module 'react-d3-tree' {
  import { Component } from 'react';

  export interface TreeNode {
    name: string;
    attributes?: Record<string, any>;
    children?: TreeNode[];
  }

  export interface TreeProps {
    data: TreeNode | TreeNode[];
    orientation?: 'horizontal' | 'vertical';
    pathFunc?: 'diagonal' | 'elbow' | 'straight' | 'step';
    separation?: {
      siblings?: number;
      nonSiblings?: number;
    };
    translate?: {
      x: number;
      y: number;
    };
    nodeSize?: {
      x: number;
      y: number;
    };
    rootNodeClassName?: string;
    branchNodeClassName?: string;
    leafNodeClassName?: string;
    styles?: any;
    renderCustomNodeElement?: (props: {
      nodeDatum: TreeNode;
      toggleNode: () => void;
    }) => JSX.Element;
  }

  export default class Tree extends Component<TreeProps> {}
}
