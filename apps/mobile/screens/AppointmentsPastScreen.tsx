import React from "react";
import { AppointmentsListPane } from "./AppointmentsListPane";
import { useAppointmentsList } from "../lib/useAppointmentsList";

type SessionUser = { id: string };

export function AppointmentsPastScreen({ user }: { user: SessionUser }) {
  const list = useAppointmentsList(user.id);

  return (
    <AppointmentsListPane
      user={user}
      tab="past"
      showFab={false}
      selectionRouteName="AppointmentsPast"
      headerTitle="Past appointments"
      emptyTitle="No past appointments"
      tipText="Your past clinician visits are stored here for your records."
      list={list}
    />
  );
}
