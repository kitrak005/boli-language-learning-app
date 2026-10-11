import React from 'react';
import { LanguageTradition, SkillNode } from '../types';
import { SanctuaryPathway } from './SanctuaryPathway';

interface LearnViewProps {
  currentTradition: LanguageTradition;
  nodes: SkillNode[];
  onSelectNode: (node: SkillNode) => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  currentTradition,
  nodes,
  onSelectNode,
}) => {
  return (
    <div className="w-full animate-in fade-in duration-300">
      <SanctuaryPathway
        currentTradition={currentTradition}
        nodes={nodes}
        onSelectNode={onSelectNode}
        showTopNav={false}
      />
    </div>
  );
};

export default LearnView;