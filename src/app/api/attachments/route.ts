import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TransactionAttachment } from "@/types/database";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const transactionId = formData.get("transaction_id") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Please upload JPEG, PNG, WebP, or PDF." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size exceeds 5MB limit" },
      { status: 400 }
    );
  }

  // Verify transaction ownership
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .single();

  if (txError || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  // Generate unique file path
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `${user.id}/${transactionId}/${timestamp}.${ext}`;

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  // Save attachment record
  const { data: attachment, error: insertError } = await supabase
    .from("transaction_attachments")
    .insert({
      transaction_id: transactionId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from("receipts").remove([filePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data: attachment });
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transaction_id");

  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
  }

  const { data: attachments, error } = await supabase
    .from("transaction_attachments")
    .select("*")
    .eq("transaction_id", transactionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as unknown as { data: TransactionAttachment[] | null; error: Error | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate signed URLs for each attachment
  const attachmentsWithUrls = await Promise.all(
    (attachments || []).map(async (att) => {
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(att.file_path, 3600); // 1 hour expiry

      return {
        ...att,
        url: data?.signedUrl || null,
      };
    })
  );

  return NextResponse.json({ data: attachmentsWithUrls });
}
