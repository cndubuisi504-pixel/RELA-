import { GET as getHandler } from "@/app/v1/receipts/[receipt_id]/download/route";

export const dynamic = "force-dynamic";

export const GET = getHandler;
