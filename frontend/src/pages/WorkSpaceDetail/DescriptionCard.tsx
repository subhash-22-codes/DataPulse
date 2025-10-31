import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Edit3, Loader2, FileText, Check, BookOpen, History, X } from "lucide-react";
import { Workspace } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import ReactMarkdown from "react-markdown";
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";
import { FormattedDate } from "../../components/FormattedDate";


interface DescriptionCardProps {
  workspace: Workspace;
  isOwner: boolean;
  onUpdate: (data: Partial<Workspace>) => void;
}

const MAX_DESC_LENGTH = 500;

export const DescriptionCard: React.FC<DescriptionCardProps> = ({ workspace, isOwner, onUpdate }) => {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState(workspace.description || "");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    if (description.length > MAX_DESC_LENGTH) {
      return toast.error(`Description cannot exceed ${MAX_DESC_LENGTH} characters.`);
    }
    setIsSaving(true);
    try {
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, { description }, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate(res.data);
      setIsEditing(false);
      toast.success("Description updated!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save description.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDescription(workspace.description || "");
    setIsEditing(false);
  };
  
  const isOverLimit = description.length > MAX_DESC_LENGTH;

 
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col h-full">
      <div className="bg-gradient-to-r from-blue-50 to-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
              <p className="text-sm text-gray-600">{isEditing ? "Edit workspace overview" : "Workspace overview"}</p>
            </div>
          </div>
          {isOwner && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)} 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-offset-2"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col">
        {isEditing ? (
          <div className="flex-grow flex flex-col space-y-4">
            <div className="relative flex-grow">
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className={`w-full h-full min-h-[200px] p-4 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-150 resize-none text-gray-700 text-sm leading-relaxed placeholder:text-gray-400 ${
                  isOverLimit 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-transparent focus:ring-blue-500'
                }`}
                placeholder="Describe your workspace... Markdown is supported for formatting."
              />
              <div className={`absolute bottom-3 right-3 text-xs font-medium px-2.5 py-1 rounded shadow-sm border ${
                isOverLimit 
                  ? 'bg-red-50 text-red-600 border-red-200' 
                  : 'bg-white text-gray-500 border-gray-200'
              }`}>
                {description.length} / {MAX_DESC_LENGTH}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-700 font-medium">Markdown supported: **bold**, *italic*, and - bullet lists</p>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <button 
                onClick={handleCancel} 
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors duration-150 focus:outline-none focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving || isOverLimit} 
                className="flex items-center justify-center gap-2 bg-blue-600 px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-w-[110px] focus:outline-none focus:ring-offset-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col">
            {workspace.description ? (
              <div className="flex-grow">
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 min-h-[180px]">
                  <div className="prose prose-sm prose-gray max-w-none leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="text-gray-700 mb-3 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-gray-700">{children}</ul>,
                        li: ({ children }) => <li className="text-gray-700">{children}</li>,
                      }}
                    >
                      {workspace.description}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center py-8">
                <EmptyState
                  Icon={FileText}
                  title="No Description Yet"
                  message={isOwner ? "Add a description to help your team understand the purpose of this workspace." : "The owner hasn't added a description yet."}
                  actionText={isOwner ? "Add Description" : undefined}
                  onAction={isOwner ? () => setIsEditing(true) : undefined}
                />
              </div>
            )}

            {workspace.description_last_updated_at && (
              <div className="pt-4 border-t border-gray-200 mt-6">
                <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                    <History className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">
                      Updated by <span className="font-medium text-gray-900">{workspace.owner.name || workspace.owner.email}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      <FormattedDate dateString={workspace.description_last_updated_at} />
                    </span>
                    <AnimatePresence>
                      {showSuccess && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full flex-shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
