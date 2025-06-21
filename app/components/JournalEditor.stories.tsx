import type { Meta, StoryObj } from "@storybook/react-vite";

import { JournalEditor } from "./JournalEditor";
import type { JournalEntry } from "./JournalEditor";

const meta = {
  title: "Components/JournalEditor",
  component: JournalEditor,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "select",
      options: ["new", "edit", "view"],
    },
  },
} satisfies Meta<typeof JournalEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleEntry: JournalEntry = {
  id: "1",
  content:
    "今日は素晴らしい一日でした。朝は瞑想から始まり、その後ジョギングで汗を流しました。#運動 #健康",
  mood: "happy",
  tags: "運動,健康,瞑想",
  timestamp: Date.now(),
};

export const NewEntry: Story = {
  args: {
    mode: "new",
    onSave: async (content, mood, tags) => {
      console.log("Saving:", { content, mood, tags });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onCancel: () => console.log("Cancelled"),
    userJournals: [
      { tags: "感謝,成長,気づき" },
      { tags: "運動,健康" },
      { tags: "仕事,成長" },
    ],
    baseTags: ["感謝", "成長", "気づき", "運動", "健康"],
    userName: "山田太郎",
  },
};

export const EditEntry: Story = {
  args: {
    mode: "edit",
    entry: sampleEntry,
    onSave: async (content, mood, tags) => {
      console.log("Updating:", { content, mood, tags });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onCancel: () => console.log("Edit cancelled"),
    userJournals: [],
    baseTags: ["感謝", "成長", "気づき", "運動", "健康"],
  },
};

export const ViewEntry: Story = {
  args: {
    mode: "view",
    entry: sampleEntry,
    onSave: async () => {},
    onCancel: () => {},
    onEdit: () => console.log("Edit clicked"),
    onAskAI: () => console.log("Ask AI clicked"),
    userJournals: [],
    baseTags: [],
  },
};

export const WithAIReply: Story = {
  args: {
    mode: "view",
    entry: sampleEntry,
    onSave: async () => {},
    onCancel: () => {},
    onEdit: () => console.log("Edit clicked"),
    onAskAI: () => console.log("Ask AI clicked"),
    aiReply:
      "素晴らしい一日を過ごされたようですね！朝の瞑想とジョギングの組み合わせは、心身の健康にとても良い習慣です。このような健康的なルーティンを続けることで、より充実した毎日を送ることができるでしょう。明日も素敵な一日になりますように！",
    userJournals: [],
    baseTags: [],
  },
};

export const AILoading: Story = {
  args: {
    mode: "view",
    entry: sampleEntry,
    onSave: async () => {},
    onCancel: () => {},
    onEdit: () => console.log("Edit clicked"),
    onAskAI: () => console.log("Ask AI clicked"),
    aiLoading: true,
    userJournals: [],
    baseTags: [],
  },
};

export const Saving: Story = {
  args: {
    mode: "edit",
    entry: sampleEntry,
    onSave: async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    },
    onCancel: () => console.log("Cancel clicked"),
    saving: true,
    userJournals: [],
    baseTags: [],
  },
};

export const WithError: Story = {
  args: {
    mode: "edit",
    entry: sampleEntry,
    onSave: async () => {
      throw new Error("保存に失敗しました");
    },
    onCancel: () => console.log("Cancel clicked"),
    error: "保存中にエラーが発生しました。もう一度お試しください。",
    userJournals: [],
    baseTags: [],
  },
};

export const WithAIUsageInfo: Story = {
  args: {
    mode: "view",
    entry: sampleEntry,
    onSave: async () => {},
    onCancel: () => {},
    onEdit: () => console.log("Edit clicked"),
    onAskAI: () => console.log("Ask AI clicked"),
    aiUsageInfo: {
      remainingCount: 3,
      monthlyLimit: 10,
      isAdmin: false,
    },
    userJournals: [],
    baseTags: [],
  },
};

export const AdminUser: Story = {
  args: {
    mode: "view",
    entry: sampleEntry,
    onSave: async () => {},
    onCancel: () => {},
    onEdit: () => console.log("Edit clicked"),
    onAskAI: () => console.log("Ask AI clicked"),
    aiUsageInfo: {
      remainingCount: null,
      monthlyLimit: null,
      isAdmin: true,
    },
    userJournals: [],
    baseTags: [],
  },
};
