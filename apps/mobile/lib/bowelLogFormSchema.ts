import * as yup from "yup";
import { buildOccurredAtIso, todayYmd, type BowelFormState } from "./bowelMovementShared";

export const bowelLogFormSchema: yup.ObjectSchema<BowelFormState> = yup.object({
  date: yup.string().required("Please select a date."),
  dateTouched: yup.boolean().defined(),
  time: yup
    .string()
    .required("Please select a time.")
    .test("time-not-future-today", "Can't be in the future", function (time) {
      const { date } = this.parent as Pick<BowelFormState, "date">;
      if (!date || !time || date !== todayYmd()) return true;
      const occurred = buildOccurredAtIso(date, time);
      if (!occurred) {
        return this.createError({ message: "Enter a valid date and time" });
      }
      return occurred.getTime() <= Date.now();
    }),
  bristolType: yup
    .number()
    .nullable()
    .required("Please select a Bristol chart type.")
    .min(1)
    .max(7),
  blood: yup.string().defined(),
  strain: yup.string().defined(),
  urgency: yup.string().defined(),
  notes: yup.string().defined(),
});
