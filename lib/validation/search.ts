import { z } from "@/lib/validation/zod";

export const searchSchema = z.object({ q: z.string().trim().min(1).max(80) });

export type SearchResults = {
  clients: { id: string; name: string; city: string }[];
  preQuotes: { id: string; number: string; title: string; clientName: string }[];
  quotes: { id: string; number: string; title: string; clientName: string; totalCents: number }[];
  invoices: {
    id: string;
    number: string | null;
    title: string;
    clientName: string;
    netCents: number;
  }[];
};
