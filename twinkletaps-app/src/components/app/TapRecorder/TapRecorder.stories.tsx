import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { TapRecorder } from "./TapRecorder";

const STEP_MS = 250;
const MAX_STEPS = 12;
const RECORDING_MS = STEP_MS * MAX_STEPS;
const PLAY_WAIT_MS = RECORDING_MS + 500;

function dispatchMouse(el: HTMLElement, type: "mousedown" | "mouseup") {
  el.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, view: window }),
  );
}

const meta: Meta<typeof TapRecorder> = {
  title: "Components/TapRecorder",
  component: TapRecorder,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onTapComplete: { action: "tapComplete" },
  },
};

export default meta;
type Story = StoryObj<typeof TapRecorder>;

export const Default: Story = {
  args: {
    onTapComplete: fn(),
  },
  parameters: {
    testTimeout: 20000,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Record tap sequence" }),
    ).toBeInTheDocument();
    const sequenceEl = canvas.getByLabelText("Tap sequence");
    await expect(sequenceEl).toBeInTheDocument();
    expect(sequenceEl.textContent).toBe("------------");
  },
};

export const Disabled: Story = {
  args: {
    onTapComplete: fn(),
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", {
      name: "Record tap sequence",
    });
    await expect(button).toBeDisabled();
  },
};

export const WithSequenceDisplay: Story = {
  args: {
    onTapComplete: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", {
      name: "Record tap sequence",
    });
    dispatchMouse(button, "mousedown");
    await new Promise((r) => setTimeout(r, PLAY_WAIT_MS));
    dispatchMouse(button, "mouseup");
    await waitFor(
      () => {
        expect(args.onTapComplete).toHaveBeenCalledTimes(1);
        const [sequence] = (args.onTapComplete as ReturnType<typeof fn>).mock
          .calls[0];
        expect(sequence).toMatch(/^[01]{1,12}$/);
        expect(sequence.length).toBe(MAX_STEPS);
      },
      { timeout: PLAY_WAIT_MS + 1000 },
    );
  },
  parameters: {
    // Full recording takes ~3s + cooldown assertion
    chromatic: { delay: PLAY_WAIT_MS + 1500 },
  },
};
