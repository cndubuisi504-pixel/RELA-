alter table public.documents
  add constraint documents_direct_receipt_fully_paid
  check (
    document_type <> 'receipt'
    or source_document_id is not null
    or balance_remaining_kobo = 0
  ) not valid;
