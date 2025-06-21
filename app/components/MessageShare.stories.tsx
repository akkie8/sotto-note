import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageShare } from "./MessageShare";
import { useState } from "react";

const meta = {
  title: "Components/MessageShare",
  component: MessageShare,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MessageShare>;

export default meta;
type Story = StoryObj<typeof meta>;

const MessageShareWithState = (args: React.ComponentProps<typeof MessageShare>) => {
  const [isOpen, setIsOpen] = useState(args.isOpen);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-wellness-primary text-white rounded hover:bg-wellness-secondary"
      >
        シェアモーダルを開く
      </button>
      <MessageShare
        {...args}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          args.onClose?.();
        }}
      />
    </>
  );
};

export const Default: Story = {
  render: (args) => <MessageShareWithState {...args} />,
  args: {
    message: "今日は素晴らしい一日でした。新しいことに挑戦し、多くを学びました。",
    isOpen: false,
    onClose: () => console.log("Modal closed"),
  },
};

export const WithUserName: Story = {
  render: (args) => <MessageShareWithState {...args} />,
  args: {
    message: "感謝の気持ちでいっぱいです。周りの人々に支えられていることを実感しました。",
    userName: "山田太郎",
    isOpen: false,
    onClose: () => console.log("Modal closed"),
  },
};

export const LongMessage: Story = {
  render: (args) => <MessageShareWithState {...args} />,
  args: {
    message: "今日は本当に充実した一日でした。朝は早起きして瞑想をし、その後ヨガで体を動かしました。朝食は新鮮な野菜とフルーツのスムージーを作り、エネルギーに満ちた状態で仕事を始めることができました。\n\n午後は友人とランチを楽しみ、久しぶりに心から笑いました。夕方には読みかけの本を読み終え、新しい知識を得ることができました。",
    userName: "鈴木花子",
    isOpen: false,
    onClose: () => console.log("Modal closed"),
  },
};

export const OpenModal: Story = {
  args: {
    message: "このメッセージをシェアしてください。",
    isOpen: true,
    onClose: () => console.log("Modal closed"),
  },
};

export const WithHashtags: Story = {
  render: (args) => <MessageShareWithState {...args} />,
  args: {
    message: "今日の #感謝 と #成長 の記録。明日も頑張ります！ #ポジティブ思考",
    userName: "ポジティブユーザー",
    isOpen: false,
    onClose: () => console.log("Modal closed"),
  },
};