import { create } from "zustand";

interface ParticipantState {
  participants: string[];
  setParticipants: (participants: string[]) => void;
  addParticipants: (namesInput: string) => string[];
  removeParticipant: (name: string) => string[];
}

export const useParticipantStore = create<ParticipantState>((set) => ({
  participants: [],
  setParticipants: (newParticipants) => set({ participants: newParticipants }),
  addParticipants: (namesInput) => {
    const rawNames = namesInput
      .split(",")
      .map(name => {
        const trimmed = name.trim();
        if (trimmed.toLowerCase() === "chaitu") return "Chaitanya";
        return trimmed ? (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)) : "";
      })
      .filter(Boolean);

    // Reject invalid names (e.g., matching @, credit, debit, etc.)
    const validatedNames = rawNames.filter(n => {
      const upiRegex = /@/;
      if (upiRegex.test(n)) return false;
      const forbiddenPatterns = [/credit/i, /debit/i, /visa/i, /mastercard/i, /card/i, /cash/i, /bank/i];
      if (forbiddenPatterns.some(p => p.test(n))) return false;
      return true;
    });

    let updated: string[] = [];
    if (validatedNames.length === 0) {
      set((state) => {
        updated = state.participants;
        return state;
      });
      return updated;
    }

    set((state) => {
      const uniqueCombined = [...new Set([...state.participants, ...validatedNames])];
      updated = uniqueCombined;
      return { participants: uniqueCombined };
    });

    return updated;
  },
  removeParticipant: (name) => {
    let updated: string[] = [];
    set((state) => {
      const nextList = state.participants.filter(m => m !== name);
      updated = nextList;
      return { participants: nextList };
    });
    return updated;
  }
}));
