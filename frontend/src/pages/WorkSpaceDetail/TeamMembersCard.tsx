import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Edit3, Loader2, User as UserIcon, X, Plus, Users, Mail  } from "lucide-react";
import { Workspace } from "../../types";
import { EmptyState } from "../../components/EmptyState"; // <-- NEW Import
import toast from 'react-hot-toast';
import { AxiosError } from "axios";


interface TeamMembersCardProps {
  workspace: Workspace;
  isOwner: boolean;
  onUpdate: (data: Partial<Workspace>) => void;
}

export const TeamMembersCard: React.FC<TeamMembersCardProps> = ({ workspace, isOwner, onUpdate }) => {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamEmails, setTeamEmails] = useState<string[]>(workspace.team_members?.map(m => m.email) || []);
  const [newEmail, setNewEmail] = useState("");
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { team_member_emails: teamEmails };
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate(res.data);
      setTeamEmails(res.data.team_members?.map(m => m.email) || []);
      setIsEditing(false);
      toast.success("Team members updated!");
    }catch (err: unknown) {
    if (err instanceof AxiosError) {
      toast.error(err.response?.data?.detail || "An error occurred.");
    } else {
      toast.error("An unexpected error occurred.");
      console.error(err);
    }
  }
 finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTeamEmails(workspace.team_members?.map(m => m.email) || []);
    setIsEditing(false);
  };

  const handleAddEmail = () => {
    if (newEmail && !teamEmails.includes(newEmail) && teamEmails.length < 2) {
      setTeamEmails([...teamEmails, newEmail]);
      setNewEmail("");
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setTeamEmails(teamEmails.filter(email => email !== emailToRemove));
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              <p className="text-sm text-gray-600">{workspace.team_members?.length || 0} of 2 members</p>
            </div>
          </div>
          {isOwner && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)} 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-offset-2"
            >
              <Edit3 className="h-4 w-4" />
              Manage
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Invite Team Member ({teamEmails.length}/2)</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border-gray-300 rounded-lg" placeholder="colleague@example.com" onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()} />
                </div>
                <button onClick={handleAddEmail} type="button" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50" disabled={teamEmails.length >= 2 || !newEmail.trim()}><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Current Team</label>
              <div className="space-y-2 min-h-[80px]">
                {teamEmails.length > 0 ? (
                  teamEmails.map((email) => (
                    <div key={email} className="group flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-800 truncate">{email}</p>
                      <button onClick={() => handleRemoveEmail(email)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded-full"><X className="h-4 w-4" /></button>
                    </div>
                  ))
                ) : <p className="text-sm text-gray-500 text-center pt-4">No team members added yet.</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold rounded-lg border hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {(workspace.team_members && workspace.team_members.length > 0) ? (
              workspace.team_members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center"><UserIcon className="h-4 w-4 text-indigo-600"/></div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm truncate">{member.email}</p>
                    <p className="text-xs text-gray-500">{member.name || 'No name provided'}</p>
                  </div>
                </div>
              ))
            ) : (
              // --- THIS IS THE CHANGE ---
              // We now use our beautiful, reusable EmptyState component
              <EmptyState 
                Icon={Users}
                title="Build Your Team"
                message={isOwner 
                  ? "Invite team members to collaborate on this workspace and receive alerts."
                  : "The workspace owner hasn't added any team members yet."
                }
                actionText={isOwner ? "Invite Members" : undefined}
                onAction={isOwner ? () => setIsEditing(true) : undefined}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};