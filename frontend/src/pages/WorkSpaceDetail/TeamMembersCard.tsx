import React, { useState } from "react";
import { api } from "../../services/api";
import { Edit3, Loader2, X, Plus, Mail, Trash2 } from "lucide-react";
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
      toast.success("Team updated successfully!");
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full group transition-shadow hover:shadow-md overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">

           <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="/images/Users2.png"
              alt="Team"
              className="w-full h-full object-contain select-none"
            />
          </div>
            {/* Text Content */}
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Team Access</h2>
              <p className="text-[10px] text-gray-500 font-medium">
                {teamEmails.length} / 2 Members
              </p>
            </div>

          </div>
     


        {isOwner && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-200 transition-all"
            title="Manage Team"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* --- CONTENT --- */}
      <div className="p-5 flex-grow flex flex-col bg-white">
        {isEditing ? (
          <div className="flex-grow flex flex-col gap-5 animate-in fade-in duration-200">
            
            {/* Input Area */}
            <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Invite Member
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                            type="email" 
                            value={newEmail} 
                            onChange={(e) => setNewEmail(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-200 focus:border-gray-900 outline-none transition-all placeholder:text-gray-400" 
                            placeholder="colleague@company.com" 
                            onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()} 
                            disabled={teamEmails.length >= 2}
                        />
                    </div>
                    <button 
                        onClick={handleAddEmail} 
                        type="button" 
                        disabled={teamEmails.length >= 2 || !newEmail.trim()}
                        className="bg-gray-900 text-white px-3 py-2 rounded-md hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
                {teamEmails.length >= 2 && (
                    <p className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded inline-block">
                        Maximum team size reached.
                    </p>
                )}
            </div>

            {/* List Area */}
            <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Pending List
                </label>
                <div className="space-y-2">
                    {teamEmails.length > 0 ? (
                        <AnimatePresence>
                            {teamEmails.map((email) => (
                                <motion.div 
                                    key={email}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="group flex items-center justify-between bg-gray-50 border border-gray-100 p-2.5 rounded-md hover:border-gray-300 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* 🎨 Updated: DiceBear Avatar */}
                                        <img 
                                          src={getAvatarUrl(email)} 
                                          alt="Avatar" 
                                          className="w-7 h-7 rounded-full bg-white border border-gray-200"
                                        />
                                        <span className="text-sm font-medium text-gray-700 truncate max-w-[150px] sm:max-w-[200px]">
                                            {email}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveEmail(email)} 
                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-md">
                            <p className="text-xs text-gray-400">List is empty</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-auto pt-2">
                <button 
                    onClick={handleCancel} 
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                    <X className="w-3 h-3" /> Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-4 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="animate-spin h-3 w-3" /> : <Loader2 className="h-3 w-3 opacity-0" />} 
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col h-full">
            {(workspace.team_members && workspace.team_members.length > 0) ? (
              <div className="flex flex-col gap-1">
                 {workspace.team_members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100 group/item">
                        
                        {/* 🎨 Updated: DiceBear Avatar in View Mode */}
                        <div className="relative">
                            <img 
                              src={getAvatarUrl(member.email)} 
                              alt={member.email} 
                              className="w-9 h-9 rounded-full bg-white border border-gray-200 object-cover shadow-sm group-hover/item:scale-105 transition-transform"
                            />
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {member.name || member.email.split('@')[0]}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            </div>
                        </div>
                    </div>
                 ))}
              </div>
            ) : (
              /* Custom Empty State */
              <div className="flex-grow flex flex-col items-center justify-center py-6 text-center opacity-90">
                <div className="mb-4 opacity-100 flex items-center justify-center">
                  <img
                    src="/images/Teamwork.png"
                    alt="Team Workspace"
                    className="w-24 h-24 object-contain select-none"
                  />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Solo Workspace</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                   {isOwner ? "Invite your team to collaborate on projects." : "No other members have been added yet."}
                </p>
                {isOwner && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
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