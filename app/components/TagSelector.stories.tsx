import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { TagSelector, TagSelectorProps } from "./TagSelector";

const meta = {
  title: "Components/TagSelector",
  component: TagSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TagSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const TagSelectorWithState = (args: TagSelectorProps) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(
    args.selectedTags || []
  );

  return (
    <TagSelector
      {...args}
      selectedTags={selectedTags}
      onTagsChange={(tags) => {
        setSelectedTags(tags);
        args.onTagsChange?.(tags);
      }}
    />
  );
};

export const Default: Story = {
  render: (args) => <TagSelectorWithState {...args} />,
  args: {
    selectedTags: [],
    suggestedTags: ["感謝", "成長", "気づき", "リラックス"],
    autoTags: ["運動", "読書"],
    onTagsChange: (tags) => console.log("Tags changed:", tags),
  },
};

export const WithSelectedTags: Story = {
  render: (args) => <TagSelectorWithState {...args} />,
  args: {
    selectedTags: ["感謝", "成長"],
    suggestedTags: ["感謝", "成長", "気づき", "リラックス", "瞑想"],
    autoTags: ["運動", "読書"],
    onTagsChange: (tags) => console.log("Tags changed:", tags),
  },
};

export const ManyTags: Story = {
  render: (args) => <TagSelectorWithState {...args} />,
  args: {
    selectedTags: ["感謝"],
    suggestedTags: [
      "感謝",
      "成長",
      "気づき",
      "リラックス",
      "瞑想",
      "運動",
      "読書",
      "学習",
      "仕事",
      "家族",
      "友達",
      "趣味",
    ],
    autoTags: ["日記", "振り返り", "目標"],
    onTagsChange: (tags) => console.log("Tags changed:", tags),
  },
};

export const NoSuggestedTags: Story = {
  render: (args) => <TagSelectorWithState {...args} />,
  args: {
    selectedTags: [],
    suggestedTags: [],
    autoTags: ["新規", "初めて"],
    onTagsChange: (tags) => console.log("Tags changed:", tags),
  },
};

export const NoAutoTags: Story = {
  render: (args) => <TagSelectorWithState {...args} />,
  args: {
    selectedTags: ["既存タグ"],
    suggestedTags: ["既存タグ", "よく使うタグ", "人気のタグ"],
    autoTags: [],
    onTagsChange: (tags) => console.log("Tags changed:", tags),
  },
};

export const Empty: Story = {
  render: (args) => <TagSelectorWithState {...args} />,
  args: {
    selectedTags: [],
    suggestedTags: [],
    autoTags: [],
    onTagsChange: (tags) => console.log("Tags changed:", tags),
  },
};

export const WithCustomClass: Story = {
  render: (args) => <TagSelectorWithState {...args} />,
  args: {
    selectedTags: [],
    suggestedTags: ["感謝", "成長"],
    autoTags: ["運動"],
    className: "border-2 border-purple-300 p-4 rounded-lg",
    onTagsChange: (tags) => console.log("Tags changed:", tags),
  },
};
