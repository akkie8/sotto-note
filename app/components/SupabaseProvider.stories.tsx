import type { Meta, StoryObj } from "@storybook/react-vite";
import { SupabaseProvider } from "./SupabaseProvider";

const meta = {
  title: "Components/SupabaseProvider",
  component: SupabaseProvider,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SupabaseProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Supabase Provider</h1>
        <p>
          This is a provider component that manages Supabase authentication state.
          It wraps child components and provides them with authentication context.
        </p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "SupabaseProvider is a context provider that manages authentication state. It requires Supabase configuration to function properly.",
      },
    },
  },
};