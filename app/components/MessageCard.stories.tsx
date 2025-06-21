import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageCard } from "./MessageCard";

const meta = {
  title: "Components/MessageCard",
  component: MessageCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    showBranding: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof MessageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "今日は素晴らしい一日でした。朝から晴れていて、気持ちよく散歩ができました。",
  },
};

export const WithUserName: Story = {
  args: {
    message: "今日は新しいことに挑戦してみました。最初は不安でしたが、やってみたら意外と楽しかったです。",
    userName: "山田太郎",
  },
};

export const LongMessage: Story = {
  args: {
    message: "今日は本当に充実した一日でした。朝は早起きして瞑想をし、その後ヨガで体を動かしました。朝食は新鮮な野菜とフルーツのスムージーを作り、エネルギーに満ちた状態で仕事を始めることができました。\n\n午後は友人とランチを楽しみ、久しぶりに心から笑いました。夕方には読みかけの本を読み終え、新しい知識を得ることができました。\n\n今日学んだことは、小さな幸せを見つけることの大切さです。日常の中にある些細な喜びに気づくことで、人生がより豊かになることを実感しました。",
    userName: "鈴木花子",
  },
};

export const WithoutBranding: Story = {
  args: {
    message: "シンプルなメッセージカードです。",
    showBranding: false,
  },
};

export const WithEmoji: Story = {
  args: {
    message: "今日の気分は最高です！😊✨ #ポジティブ #感謝",
    userName: "Happy User",
  },
};