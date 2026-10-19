-- 0006 — allow payments on invoices created without an optional due date.
-- Previously the first payment moved 'draft' to 'partially_paid' (or 'paid')
-- and unexpectedly violated the due-date check. Sending an invoice still
-- requires a due date; recording a real payment does not.
alter table public.documents
  drop constraint documents_due_date_required;

alter table public.documents
  add constraint documents_due_date_required
  check (
    document_type <> 'invoice'
    or due_date is not null
    or status in ('draft', 'partially_paid', 'paid')
  ) not valid;
