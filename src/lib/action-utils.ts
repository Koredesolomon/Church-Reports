import "server-only";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";

export type FormState =
  | { error?: string; message?: string; secret?: { label: string; value: string } }
  | undefined;

export function refresh() {
  revalidatePath("/", "layout");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export function generatePassword(length = 12) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export function pgCode(e: unknown): { code?: string; constraint?: string } {
  const err = e as { code?: string; constraint_name?: string };
  return { code: err.code, constraint: err.constraint_name };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
