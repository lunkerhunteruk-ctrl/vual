'use client';

import { useState } from 'react';
import { ItemSelector, GenerationCanvas } from '@/components/admin/studio';

export default function AIStudioPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (selectedItems.length === 0) return;

    setIsGenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Left - Item Selector */}
      <div className="lg:col-span-1">
        <ItemSelector
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
        />
      </div>

      {/* Right - Generation Canvas */}
      <div className="lg:col-span-2">
        <GenerationCanvas
          selectedItems={selectedItems}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
        />
      </div>
    </div>
  );
}
