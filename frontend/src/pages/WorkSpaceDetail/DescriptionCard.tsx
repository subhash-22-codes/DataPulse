import React, { useState } from "react";
import { api } from "../../services/api";
import { Edit3, Loader2, Check, Info } from "lucide-react";
import { Workspace } from "../../types";
import ReactMarkdown from "react-markdown";
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";
import { FormattedDate } from "../../components/FormattedDate";
import NatrajPaperIllustration from "../../components/website-ui/Illustrations/NatrajPaperIllustration";


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
      toast.success("Description updated!", {
        style: { fontSize: '13px', background: '#334155', color: '#fff' }
      });
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden relative font-sans group">
      
      {/* --- HEADER --- */}
      <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Consistent Icon Style */}
          <div className="flex-shrink-0 w-8 h-8 bg-slate-50 text-slate-600 rounded-md border border-slate-200/60 flex items-center justify-center shadow-sm">
             <Info className="h-4 w-4" />
          </div>

          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-slate-900 leading-none">About Workspace</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Project context & goals</p>
          </div>
        </div>

        {isOwner && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Edit Description"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* --- CONTENT --- */}
      <div className="p-5 flex-grow flex flex-col bg-slate-50/30">
        {isEditing ? (
          <div className="flex-grow flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex-grow">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`
                  w-full min-h-[160px] sm:min-h-[180px]
                  resize-none rounded-md border bg-white
                  px-3 py-2.5 text-sm leading-relaxed
                  text-slate-700 placeholder:text-slate-400
                  shadow-sm transition outline-none custom-scrollbar
                  ${isOverLimit
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 hover:border-slate-300 focus:border-slate-400'
                  }
                `}
                placeholder="What is this workspace used for?"
              />


              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                 {isOverLimit && <span className="text-[10px] font-medium text-red-600 animate-pulse">Limit exceeded</span>}
                 <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border backdrop-blur-sm ${
                    isOverLimit 
                      ? 'bg-red-50 text-red-600 border-red-100' 
                      : 'bg-slate-50/80 text-slate-500 border-slate-200'
                  }`}>
                    {description.length} / {MAX_DESC_LENGTH}
                  </span>
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-slate-100">
              {/* SECONDARY: Neutral and low-priority */}
              <button 
                onClick={handleCancel} 
                disabled={isSaving}
                className="
                  w-full sm:w-auto 
                  px-5 py-2 
                  text-[11px] font-bold text-slate-400 font-manrope tracking-widest
                  hover:text-slate-900 hover:bg-slate-50 hover:bg-black/5
                  rounded-sm transition-all
                  disabled:opacity-20
                "
              >
                Cancel
              </button>

              {/* PRIMARY: Industrial Black for System Actions */}
              <button 
                onClick={handleSave} 
                disabled={isSaving || isOverLimit} 
                className="
                  w-full sm:w-auto 
                  min-w-[140px]
                  bg-slate-900 hover:bg-black 
                  text-white 
                  px-6 py-2.5 
                  rounded-sm 
                  text-[11px] font-bold font-manrope tracking-widest
                  transition-all active:scale-[0.98]
                  disabled:opacity-20 disabled:cursor-not-allowed
                  shadow-sm flex items-center justify-center gap-2
                "
              >
                {isSaving ? (
                  <Loader2 className="animate-spin h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )} 
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col h-full">
            {workspace.description ? (
              <div className="flex-grow">
                <div className="prose prose-sm prose-slate max-w-none break-words w-full">
                  <ReactMarkdown components={{
                      p: ({ children }) => <p className="text-slate-600 mb-2 last:mb-0 leading-relaxed text-sm">{children}</p>,
                      strong: ({ children }) => <span className="font-semibold text-slate-800">{children}</span>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-slate-600 text-sm marker:text-slate-300">{children}</ul>,
                      a: ({ children, href }) => <a href={href} className="text-blue-600 hover:text-blue-700 font-medium hover:underline decoration-blue-200 underline-offset-2 transition-colors">{children}</a>,
                      h1: ({children}) => <h1 className="text-base font-bold text-slate-900 mb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-sm font-bold text-slate-900 mb-1">{children}</h2>,
                      blockquote: ({children}) => <blockquote className="border-l-2 border-slate-200 pl-3 italic text-slate-500">{children}</blockquote>
                    }}>
                    {workspace.description}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              /* Custom Empty State */
              <div className="flex-grow flex flex-col items-center justify-center px-4 py-6 text-center h-full">
  
              {/* Illustration */}
              <div className="mb-4 opacity-70 transition-opacity duration-300 hover:opacity-90">
                <NatrajPaperIllustration
                  className="w-16 h-16 sm:w-20 sm:h-20 text-slate-300"
                  aria-hidden
                />
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-slate-900">
                No Description
              </h3>

              {/* Description */}
              <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-slate-500">
                {isOwner
                  ? "Add a short description to provide context for your workspace."
                  : "This workspace does not have a description yet."}
              </p>

              {/* Action */}
              {isOwner && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="
                    mt-4
                    inline-flex items-center justify-center
                    rounded-sm
                    bg-blue-600 hover:bg-blue-700
                    px-4 py-1.5
                    text-[10px] sm:text-[11px] font-bold text-white font-manrope tracking-widest
                    shadow-sm
                    transition-all active:scale-95
                  "
                >
                  Add Description
                </button>
              )}
            </div>

            )}

            {/* Footer Meta */}
            {(workspace.description || workspace.description_last_updated_at) && (
              <div className="mt-auto pt-4 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                   {workspace.description_last_updated_at && (
                     <>
                       <span>Last updated</span>
                       <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                       <FormattedDate dateString={workspace.description_last_updated_at} />
                     </>
                   )}
                </div>
                
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full"
                    >
                      <div className="bg-emerald-500 rounded-full p-0.5"><Check className="w-2 h-2 text-white" /></div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Saved</span>
                    </motion.div>
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