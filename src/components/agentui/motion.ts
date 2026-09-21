// Motion tokens adapted from https://www.agentui.pro/components/agents/prompt-input.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const SPRING_PRESS = { type: "spring", stiffness: 500, damping: 30, mass: 0.6 } as const;
export const SPRING_SWAP = { type: "spring", stiffness: 460, damping: 30, mass: 0.55 } as const;
export const MESSAGE_POP_UP = { type: "spring", stiffness: 480, damping: 32, mass: 0.62 } as const;
