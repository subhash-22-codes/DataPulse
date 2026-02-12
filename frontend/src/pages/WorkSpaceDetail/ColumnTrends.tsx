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

        <div>
          <button
            onClick={() => navigate(`/workspace/${id}`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <ColumnHealthChart
            workspaceId={id}
            columnName={column}
          />
        </div>
      </div>
    </div>
  );
}
