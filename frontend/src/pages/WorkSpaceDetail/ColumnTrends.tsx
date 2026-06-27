import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ColumnHealthChart from "./ColumnHealthChart";

export default function ColumnTrendsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const column = searchParams.get("column_name") || "";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      
      <div className="max-w-6xl mx-auto space-y-6">
        <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />


        <div>
          <button
            onClick={() => navigate(`/workspace/${id}`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Workspace</span>
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-sm shadow-[0_4px_12px_rgba(15,23,42,0.08)] p-5 relative z-10">
          <ColumnHealthChart
            workspaceId={id}
            columnName={column}
          />
        </div>
      </div>
    </div>
  );
}
