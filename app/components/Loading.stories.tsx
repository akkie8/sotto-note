import type { Meta, StoryObj } from "@storybook/react-vite";

import { Loading } from "./Loading";

const meta = {
  title: "Components/Loading",
  component: Loading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    fullScreen: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Medium: Story = {
  args: {
    size: "md",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
  },
};

export const WithCustomText: Story = {
  args: {
    text: "処理中です...",
  },
};

export const WithCustomClass: Story = {
  args: {
    className: "text-purple-600",
  },
};

export const FullScreen: Story = {
  args: {
    fullScreen: true,
  },
  parameters: {
    layout: "fullscreen",
  },
};
