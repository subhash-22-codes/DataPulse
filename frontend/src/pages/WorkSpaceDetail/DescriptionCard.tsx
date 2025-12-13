import React, { useState } from "react";
import { api } from "../../services/api";
import { Edit3, Loader2, Check, X } from "lucide-react";
import { Workspace } from "../../types";
import ReactMarkdown from "react-markdown";
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";
import { FormattedDate } from "../../components/FormattedDate";
import NatrajPaperIllustration from "../../components/website-ui/Illustrations/NatrajPaperIllustration";
import AboutWorkspaceIllustration from "../../components/website-ui/Illustrations/AboutWorkspaceIllustration";


interface DescriptionCardProps {
  workspace: Workspace;
  isOwner: boolean;
  onUpdate: (data: Partial<Workspace>) => void;
}

const MAX_DESC_LENGTH = 200;

export const DescriptionCard: React.FC<DescriptionCardProps> = ({ workspace, isOwner, onUpdate }) => {
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
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, { description });
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full group transition-shadow hover:shadow-md overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          
          {/* Logo / Icon Area */}
          <AboutWorkspaceIllustration className="w-10 h-10" />

          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">About Workspace</h2>
          </div>
        </div>

        {isOwner && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-200 transition-all"
            title="Edit Description"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* --- CONTENT --- */}
      <div className="p-5 flex-grow flex flex-col bg-white">
        {isEditing ? (
          <div className="flex-grow flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="relative flex-grow">
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className={`w-full h-full min-h-[160px] p-3 text-sm leading-relaxed rounded-md border bg-white focus:ring-2 focus:ring-offset-1 resize-none outline-none transition-all
                  ${isOverLimit 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                    : 'border-gray-300 focus:border-gray-900 focus:ring-gray-100'
                  }`}
                placeholder="Write a brief description..."
                autoFocus
              />
              <span className={`absolute bottom-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded border ${
                isOverLimit 
                  ? 'bg-red-50 text-red-600 border-red-100' 
                  : 'bg-gray-50 text-gray-500 border-gray-100'
              }`}>
                {description.length}/{MAX_DESC_LENGTH}
              </span>
            </div>
            
            <div className="flex items-center justify-end gap-2">
               <button 
                 onClick={handleCancel} 
                 className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
               >
                 <X className="w-3 h-3" /> Cancel
               </button>
               <button 
                 onClick={handleSave} 
                 disabled={isSaving || isOverLimit} 
                 className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-4 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isSaving ? <Loader2 className="animate-spin h-3 w-3" /> : <Check className="h-3 w-3" />}
                 Save
               </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col">
            {workspace.description ? (
              <div className="flex-grow">
                {/* FIX APPLIED HERE: 
                  Added 'break-words' and 'w-full' to force long strings to wrap.
                */}
                <div className="prose prose-sm prose-gray max-w-none break-words w-full">
                  <ReactMarkdown components={{
                      p: ({ children }) => <p className="text-gray-600 mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <span className="font-semibold text-gray-900">{children}</span>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-gray-600">{children}</ul>,
                      a: ({ children, href }) => <a href={href} className="text-blue-600 hover:underline decoration-blue-200 underline-offset-2">{children}</a>
                    }}>
                    {workspace.description}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              /* Custom Empty State with Illustration */
              <div className="flex-grow flex flex-col items-center justify-center py-8 text-center">
                 <div className="mb-4 opacity-100"> 
                    <NatrajPaperIllustration className="w-24 h-24 text-gray-400" />
                 </div>
                 <h3 className="text-sm font-semibold text-gray-900">No Description</h3>
                 <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                   {isOwner ? "Add a short bio to help others understand this workspace." : "This workspace doesn't have a description yet."}
                 </p>
                 {isOwner && (
                   <button 
                     onClick={() => setIsEditing(true)}
                     className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                   >
                     Write Description
                   </button>
                 )}
              </div>
            )}

            {/* Footer Meta */}
            {workspace.description && workspace.description_last_updated_at && (
              <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                   <FormattedDate dateString={workspace.description_last_updated_at} />
                </div>
                
                <AnimatePresence>
                  {showSuccess && (
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] font-medium text-green-600 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};