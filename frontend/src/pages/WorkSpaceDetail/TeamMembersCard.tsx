import React, { useState } from "react";
import { api } from "../../services/api";
import { Edit3, Loader2,  Plus, Mail, Trash2, Users, UserPlus, ShieldAlert } from "lucide-react";
import { Workspace } from "../../types";
import toast from 'react-hot-toast';
import { AxiosError } from "axios";
import { motion, AnimatePresence } from "framer-motion";

interface TeamMembersCardProps {
  workspace: Workspace;
  isOwner: boolean;
  onUpdate: (data: Partial<Workspace>) => void;
}

export const TeamMembersCard: React.FC<TeamMembersCardProps> = ({ workspace, isOwner, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamEmails, setTeamEmails] = useState<string[]>(workspace.team_members?.map(m => m.email) || []);
  const [newEmail, setNewEmail] = useState("");
  
  // 🎨 AVATAR GENERATOR
  // We use the email as a seed so the avatar is unique per user but consistent on reload.
  // Style: 'micah' (Clean, professional, SaaS-friendly)
  const getAvatarUrl = (seed: string) => 
    `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=f0f0f0,e0e0e0,ffffff`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { team_member_emails: teamEmails };
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, payload);
      
      onUpdate(res.data);
      setTeamEmails(res.data.team_members?.map(m => m.email) || []);
      setIsEditing(false);
      toast.success("Team updated successfully!", {
        style: { fontSize: '13px', background: '#334155', color: '#fff' }
      });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.detail || "An error occurred.");
      } else {
        toast.error("An unexpected error occurred.");
        console.error(err);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTeamEmails(workspace.team_members?.map(m => m.email) || []);
    setIsEditing(false);
    setNewEmail("");
  };

  const handleAddEmail = () => {
    if (!newEmail) return;
    if (!newEmail.includes('@')) {
        toast.error("Please enter a valid email.");
        return;
    }
    if (teamEmails.includes(newEmail)) {
        toast.error("Member already added.");
        return;
    }
    if (teamEmails.length >= 2) {
        toast.error("Team limit reached (Max 2).");
        return;
    }

    setTeamEmails([...teamEmails, newEmail]);
    setNewEmail("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setTeamEmails(teamEmails.filter(email => email !== emailToRemove));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full group transition-all duration-300 hover:shadow-md overflow-hidden font-sans">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white gap-4">
          <div className="flex items-center gap-3">
             {/* Consistent Icon Container */}
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100/50 flex items-center justify-center shadow-sm">
                <Users className="h-4 w-4" />
            </div>
            
            {/* Text Content */}
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 leading-none">Team Access</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${teamEmails.length >= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                  <p className="text-[11px] text-slate-500 font-medium tabular-nums">
                    {teamEmails.length} / 2 Members
                  </p>
              </div>
            </div>
          </div>

        {isOwner && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Manage Team"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* --- CONTENT --- */}
      <div className="p-5 flex-grow flex flex-col bg-slate-50/30">
        {isEditing ? (
          <div className="flex-grow flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Input Area */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Invite Member
                    </label>
                    {teamEmails.length >= 2 && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            <ShieldAlert className="w-3 h-3" /> Max Limit Reached
                        </span>
                    )}
                </div>
                
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="colleague@gmail.com"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                          disabled={teamEmails.length >= 2}
                          autoFocus
                          className={`
                            w-full
                            rounded-md
                            border
                            bg-white
                            px-3 py-2
                            pl-9
                            text-sm
                            text-slate-700
                            placeholder:text-slate-400
                            shadow-sm
                            transition
                            outline-none

                            border-slate-200
                            hover:border-slate-300
                            focus:border-slate-400

                            disabled:bg-slate-50
                            disabled:text-slate-400
                            disabled:cursor-not-allowed
                          `}
                        />

                    </div>
                    <button 
                        onClick={handleAddEmail} 
                        type="button" 
                        disabled={teamEmails.length >= 2 || !newEmail.trim()}
                        className="bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:transform active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-grow flex flex-col space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Pending List
                </label>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm min-h-[100px] p-1">
                    {teamEmails.length > 0 ? (
                        <div className="space-y-1">
                        <AnimatePresence>
                            {teamEmails.map((email) => (
                                <motion.div 
                                    key={email}
                                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                    className="group flex items-center justify-between bg-white hover:bg-slate-50 p-2 rounded-md border border-transparent hover:border-slate-100 transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img 
                                            src={getAvatarUrl(email)} 
                                            alt="Avatar" 
                                            className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200"
                                        />
                                        <span className="text-xs font-medium text-slate-700 truncate">
                                            {email}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveEmail(email)} 
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[100px] text-center">
                            <UserPlus className="h-5 w-5 text-slate-200 mb-1" />
                            <p className="text-[10px] text-slate-400">No members added yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
                <button 
                    onClick={handleCancel} 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-4 py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {isSaving ? <Loader2 className="animate-spin h-3 w-3" /> : <Loader2 className="h-3 w-3 opacity-0 hidden" />} 
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col h-full">
            {(workspace.team_members && workspace.team_members.length > 0) ? (
              <div className="flex flex-col gap-2">
                 {workspace.team_members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/60 rounded-lg hover:border-indigo-200 hover:shadow-sm hover:bg-indigo-50/30 transition-all group/item">
                        
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <img 
                              src={getAvatarUrl(member.email)} 
                              alt={member.email} 
                              className="w-10 h-10 rounded-full bg-white border border-slate-200 object-cover shadow-sm group-hover/item:scale-105 transition-transform"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                                {member.name || member.email.split('@')[0]}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <p className="text-[11px] text-slate-500 truncate font-medium">{member.email}</p>
                            </div>
                        </div>
                    </div>
                 ))}
              </div>
            ) : (
              /* Custom Empty State */
              <div className="flex-grow flex flex-col items-center justify-center px-4 py-6 text-center h-full">
  
                {/* Illustration */}
                <div className="mb-4 flex items-center justify-center">
                  <img
                    src="/images/Teamwork.png"
                    alt="Team workspace illustration"
                    className="
                      w-16 h-16 sm:w-20 sm:h-20
                      object-contain
                      select-none
                      opacity-80
                      transition-all duration-300
                      group-hover:opacity-100
                    "
                    draggable={false}
                  />
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-slate-900">
                  Solo Workspace
                </h3>

                {/* Description */}
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">
                  {isOwner
                    ? "Invite teammates to collaborate and manage projects together."
                    : "No additional members have been added to this workspace."}
                </p>

                {/* Action */}
                {isOwner && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="
                      mt-4
                      inline-flex items-center justify-center
                      rounded-md
                      border border-slate-200
                      bg-white
                      px-3 py-1.5
                      text-xs font-medium text-slate-700
                      hover:bg-slate-50
                      hover:text-slate-900
                      transition-colors
                      focus:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-slate-400/40
                    "
                  >
                    Add Member
                  </button>
                )}
              </div>

            )}
          </div>
        )}
      </div>
    </div>
  );
};