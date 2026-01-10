"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Paperclip, X, FileImage, FileText, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TransactionAttachment } from "@/types/database";

interface AttachmentWithUrl extends TransactionAttachment {
  url: string | null;
}

interface ReceiptAttachmentProps {
  transactionId: string;
  onAttachmentsChange?: (count: number) => void;
}

export function ReceiptAttachment({ transactionId, onAttachmentsChange }: ReceiptAttachmentProps) {
  const [attachments, setAttachments] = useState<AttachmentWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing attachments
  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const res = await fetch(`/api/attachments?transaction_id=${transactionId}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setAttachments(json.data || []);
        onAttachmentsChange?.(json.data?.length || 0);
      } catch (err) {
        console.error("Failed to fetch attachments:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttachments();
  }, [transactionId, onAttachmentsChange]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("transaction_id", transactionId);

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Refetch to get the signed URL
      const refetchRes = await fetch(`/api/attachments?transaction_id=${transactionId}`);
      const refetchJson = await refetchRes.json();
      if (!refetchJson.error) {
        setAttachments(refetchJson.data || []);
        onAttachmentsChange?.(refetchJson.data?.length || 0);
      }

      toast.success("收據已上傳");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("確定要刪除此附件嗎？")) return;

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      onAttachmentsChange?.(attachments.length - 1);
      toast.success("附件已刪除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <FileImage className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        載入中...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
            >
              {att.mime_type.startsWith("image/") && att.url ? (
                <img
                  src={att.url}
                  alt={att.file_name}
                  className="h-10 w-10 object-cover rounded"
                />
              ) : (
                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                  {getFileIcon(att.mime_type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(att.file_size)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {att.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(att.url!, "_blank")}
                    title="開啟附件"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(att.id)}
                  title="刪除附件"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              上傳中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              上傳收據 (JPG, PNG, PDF, 最大 5MB)
            </>
          )}
        </Button>
      </div>

      {/* Empty state */}
      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          尚無附件
        </p>
      )}
    </div>
  );
}

// Compact indicator for transaction list
export function AttachmentIndicator({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground" title={`${count} 個附件`}>
      <Paperclip className="h-3 w-3" />
      <span className="text-xs">{count}</span>
    </span>
  );
}
