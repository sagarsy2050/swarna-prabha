-- Prevent double-booking: at most one ACTIVE (pending or confirmed) appointment
-- per jeweller + date + time slot. Cancelled / rejected / completed rows are
-- excluded so a freed slot can be re-booked and history is preserved.
-- Prisma's schema DSL can't express a partial index, so it lives here and the
-- appointment service also catches the resulting 23505 as a friendly 409.
CREATE UNIQUE INDEX "Appointment_active_slot_key"
  ON "Appointment" ("jewellerId", "date", "timeSlot")
  WHERE status IN ('PENDING', 'CONFIRMED');
