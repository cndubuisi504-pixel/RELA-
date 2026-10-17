"use client";

import { useState } from "react";
import { CreateSheet } from "@/components/documents/CreateSheet";
import { PlusIcon } from "@/components/ui/icons";

export function CreateButton({
  disabled,
  label = "Create document",
  full,
}: {
  disabled?: boolean;
  label?: string;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn btn-primary ${full ? "btn-block" : ""}`}
      >
        <PlusIcon size={17} />
        {label}
      </button>
      <CreateSheet open={open} onClose={() => setOpen(false)} disabled={disabled} />
    </>
  );
}
