import { useState } from "react";
import { EditIcon } from "@/modules/shared/components/icons";
import { MessageInlineEditor } from "@/modules/chat/components/MessageInlineEditor";

interface EditableChatMessageRenderState {
  isEditing: boolean;
  contentNode: React.ReactNode;
  editActionNode: React.ReactNode;
}

interface EditableChatMessageProps {
  messageId: string;
  content: string;
  showEditAction?: boolean;
  actionsDisabled?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  children: (state: EditableChatMessageRenderState) => React.ReactNode;
}

export function EditableChatMessage({
  messageId,
  content,
  showEditAction = false,
  actionsDisabled = false,
  onEdit,
  children,
}: EditableChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  const saveDisabled =
    actionsDisabled ||
    !draft.trim() ||
    draft.trim() === content.trim();

  const handleCancelEdit = () => {
    setDraft(content);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (saveDisabled || !onEdit) return;
    onEdit(messageId, draft.trim());
    setIsEditing(false);
  };

  const contentNode = isEditing ? (
    <MessageInlineEditor
      value={draft}
      disabled={actionsDisabled}
      saveDisabled={saveDisabled}
      onChange={setDraft}
      onCancel={handleCancelEdit}
      onSave={handleSaveEdit}
    />
  ) : (
    content
  );

  const editActionNode =
    showEditAction && onEdit && !isEditing ? (
      <button
        type="button"
        onClick={() => {
          setDraft(content);
          setIsEditing(true);
        }}
        disabled={actionsDisabled}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-text-secondary transition-colors hover:border-border/60 hover:bg-surface-elevated hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Edit message"
      >
        <EditIcon className="w-3.5 h-3.5" />
      </button>
    ) : null;

  return <>{children({ isEditing, contentNode, editActionNode })}</>;
}
