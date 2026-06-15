import { invalidateAppointmentBriefCache } from "./appointmentBriefShared";
import { invalidateAppointmentsListCache } from "./appointmentShared";

/** Clear list + summary caches after appointment add/edit/delete (web rebuilds brief on each load). */
export function invalidateAllAppointmentCaches(userId: string) {
  invalidateAppointmentsListCache(userId);
  invalidateAppointmentBriefCache(userId);
}
