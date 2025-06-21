import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useState } from "react";

const meta = {
  title: "Components/DeleteConfirmModal",
  component: DeleteConfirmModal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DeleteConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const DeleteConfirmModalWithHooks = (args: React.ComponentProps<typeof DeleteConfirmModal>) => {
  const [isOpen, setIsOpen] = useState(args.isOpen);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        削除モーダルを開く
      </button>
      <DeleteConfirmModal
        {...args}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          args.onClose?.();
        }}
        onConfirm={() => {
          setIsOpen(false);
          args.onConfirm?.();
          alert("削除が確認されました");
        }}
      />
    </>
  );
};

export const Default: Story = {
  render: (args) => <DeleteConfirmModalWithHooks {...args} />,
  args: {
    isOpen: false,
    onClose: () => console.log("Close clicked"),
    onConfirm: () => console.log("Confirm clicked"),
  },
};

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close clicked"),
    onConfirm: () => console.log("Confirm clicked"),
  },
};

export const CustomTitle: Story = {
  args: {
    isOpen: true,
    title: "この操作を実行しますか？",
    onClose: () => console.log("Close clicked"),
    onConfirm: () => console.log("Confirm clicked"),
  },
};

export const CustomMessage: Story = {
  args: {
    isOpen: true,
    message: "この操作は取り消すことができません。本当に続行しますか？",
    onClose: () => console.log("Close clicked"),
    onConfirm: () => console.log("Confirm clicked"),
  },
};

export const CustomTitleAndMessage: Story = {
  args: {
    isOpen: true,
    title: "アカウントを削除",
    message: "アカウントを削除すると、すべてのデータが失われます。この操作は取り消すことができません。",
    onClose: () => console.log("Close clicked"),
    onConfirm: () => console.log("Confirm clicked"),
  },
};