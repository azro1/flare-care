import { sanitizeNotesMobile } from "./symptomWizardShared";
import { supabase, TABLES } from "./supabase";

export type AppointmentQuestionRow = {
  id: number;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type AppointmentQuestionFormState = {
  body: string;
};

export function emptyAppointmentQuestionForm(): AppointmentQuestionFormState {
  return { body: "" };
}

export function appointmentQuestionFormFromRow(row: AppointmentQuestionRow): AppointmentQuestionFormState {
  return { body: row.body || "" };
}

export function validateAppointmentQuestionForm(form: AppointmentQuestionFormState): string | null {
  const body = sanitizeNotesMobile(form.body);
  if (!body) return "Write what you want to ask.";
  return null;
}

export function appointmentQuestionPayloadFromForm(form: AppointmentQuestionFormState) {
  return {
    body: sanitizeNotesMobile(form.body),
    updated_at: new Date().toISOString(),
  };
}

type ListCacheSnapshot = {
  rows: AppointmentQuestionRow[];
};

const listCacheByUserId: Record<string, ListCacheSnapshot> = {};

export function getAppointmentQuestionsCache(userId: string): ListCacheSnapshot | undefined {
  return listCacheByUserId[userId];
}

export function setAppointmentQuestionsCache(userId: string, rows: AppointmentQuestionRow[]) {
  listCacheByUserId[userId] = { rows };
}

export function invalidateAppointmentQuestionsCache(userId: string) {
  delete listCacheByUserId[userId];
}

export async function fetchAppointmentQuestionsForUser(userId: string): Promise<AppointmentQuestionRow[]> {
  const { data, error } = await supabase
    .from(TABLES.APPOINTMENT_QUESTIONS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as AppointmentQuestionRow[];
  setAppointmentQuestionsCache(userId, rows);
  return rows;
}

export async function deleteAppointmentQuestionsForUser(userId: string, ids: string[]) {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isFinite(n));
  if (numericIds.length === 0) return;
  const { error } = await supabase
    .from(TABLES.APPOINTMENT_QUESTIONS)
    .delete()
    .eq("user_id", userId)
    .in("id", numericIds);
  if (error) throw error;
  invalidateAppointmentQuestionsCache(userId);
}

export const APPOINTMENT_QUESTIONS_HINT =
  "Keep a note of anything you want to ask at your next appointment, whenever it comes to mind.";
