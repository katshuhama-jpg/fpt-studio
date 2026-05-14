// In-memory store for the Chat optimization feature.
// Holds settings for: References, Conversation opener, Quick-reply buttons,
// Rich response, and Follow-up suggestions.

export type ReferenceFormat = "inline" | "footer" | "card";
export type FollowupSource = "llm" | "manual";

export interface QuickReplyButton {
  id: string;
  label: string;
  payload: string;
}

export interface CardBindingField {
  id: string;
  field: string;
  source: string;
  type: "text" | "image" | "button" | "url";
}

export interface ChatOptimizationSettings {
  // 1. References
  references: {
    enabled: boolean;
    format: ReferenceFormat;
    perTaskOverride: boolean;
    maxReferences: number;
  };
  // 2. Conversation opener
  opener: {
    greeting: string;
    avatarUrl: string;
    questions: string[];
  };
  // 3. Quick-reply buttons
  quickReplies: {
    enabled: boolean;
    buttons: QuickReplyButton[];
  };
  // 4. Rich response
  rich: {
    enabled: boolean;
    imageFromDocument: boolean;
    cardBindings: CardBindingField[];
  };
  // 5. Follow-up suggestions
  followup: {
    enabled: boolean;
    count: number;
    source: FollowupSource;
    manualList: string[];
  };
}

const defaults = (): ChatOptimizationSettings => ({
  references: { enabled: true, format: "inline", perTaskOverride: false, maxReferences: 3 },
  opener: {
    greeting: "Hi! I'm your Banking ABC assistant. How can I help you today?",
    avatarUrl: "",
    questions: [
      "What products do you offer?",
      "How do I lock my card?",
      "Book a consultation",
    ],
  },
  quickReplies: {
    enabled: true,
    buttons: [
      { id: "qr1", label: "Lock my card", payload: "/lock-card" },
      { id: "qr2", label: "Loan rates", payload: "What are your current loan rates?" },
      { id: "qr3", label: "Book consult", payload: "/book-consult" },
    ],
  },
  rich: {
    enabled: true,
    imageFromDocument: true,
    cardBindings: [
      { id: "b1", field: "title", source: "$.product.name", type: "text" },
      { id: "b2", field: "image", source: "$.product.thumbnail", type: "image" },
      { id: "b3", field: "primary", source: "Apply now", type: "button" },
    ],
  },
  followup: {
    enabled: true,
    count: 3,
    source: "llm",
    manualList: ["Want to know more?", "Should I escalate?", "Schedule a callback?"],
  },
});

const store = new Map<string, ChatOptimizationSettings>();

export const chatOptimizationStore = {
  get(agentId: string): ChatOptimizationSettings {
    if (!store.has(agentId)) store.set(agentId, defaults());
    return store.get(agentId)!;
  },
  set(agentId: string, settings: ChatOptimizationSettings) {
    store.set(agentId, settings);
  },
  patch(agentId: string, patch: Partial<ChatOptimizationSettings>) {
    const cur = this.get(agentId);
    store.set(agentId, { ...cur, ...patch });
  },
};
