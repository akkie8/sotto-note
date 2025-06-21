import type { Meta, StoryObj } from "@storybook/react-vite";

import { ThreeDotsMenu } from "./ThreeDotsMenu";

const meta = {
  title: "Components/ThreeDotsMenu",
  component: ThreeDotsMenu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ThreeDotsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onEdit: () => alert("編集がクリックされました"),
    onDelete: () => alert("削除がクリックされました"),
  },
};

export const WithConsoleLog: Story = {
  args: {
    onEdit: () => console.log("Edit action triggered"),
    onDelete: () => console.log("Delete action triggered"),
  },
};

export const InDarkBackground: Story = {
  args: {
    onEdit: () => console.log("Edit clicked"),
    onDelete: () => console.log("Delete clicked"),
  },
  decorators: [
    (Story) => (
      <div className="rounded bg-gray-800 p-8">
        <Story />
      </div>
    ),
  ],
};

export const MultipleMenus: Story = {
  args: {
    onEdit: () => console.log("Edit clicked"),
    onDelete: () => console.log("Delete clicked"),
  },
  render: () => (
    <div className="flex gap-8">
      <div className="rounded border p-4">
        <h3 className="mb-2">Menu 1</h3>
        <ThreeDotsMenu
          onEdit={() => alert("Menu 1: 編集")}
          onDelete={() => alert("Menu 1: 削除")}
        />
      </div>
      <div className="rounded border p-4">
        <h3 className="mb-2">Menu 2</h3>
        <ThreeDotsMenu
          onEdit={() => alert("Menu 2: 編集")}
          onDelete={() => alert("Menu 2: 削除")}
        />
      </div>
      <div className="rounded border p-4">
        <h3 className="mb-2">Menu 3</h3>
        <ThreeDotsMenu
          onEdit={() => alert("Menu 3: 編集")}
          onDelete={() => alert("Menu 3: 削除")}
        />
      </div>
    </div>
  ),
};
