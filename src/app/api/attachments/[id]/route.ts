import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TransactionAttachment } from "@/types/database";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get attachment to verify ownership and get file path
  const { data: attachment, error: fetchError } = await supabase
    .from("transaction_attachments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as unknown as { data: TransactionAttachment | null; error: Error | null };

  if (fetchError || !attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("receipts")
    .remove([attachment.file_path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    // Continue with database delete even if storage delete fails
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from("transaction_attachments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
