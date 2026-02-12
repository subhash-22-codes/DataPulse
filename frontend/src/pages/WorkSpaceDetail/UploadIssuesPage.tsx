import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { uploadIssuesService } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type CellValue = string | number | boolean | null;

interface IssueRow {
  row_index: number;
  [key: string]: CellValue;
}
const issuesCache = new Map<
  string,
  { rows: IssueRow[]; total: number }
>();

const UploadIssuesPage = () => {
  const { workspaceId, uploadId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get("type"); // missing | duplicates
  const column = searchParams.get("column");

  const [rows, setRows] = useState<IssueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

 const cacheKey = `${workspaceId}_${uploadId}_${type}_${column}_${offset}_${limit}`;

const fetchData = useCallback(async () => {
  if (!workspaceId || !uploadId) return;

  // 1️⃣ Serve from cache if exists
  if (issuesCache.has(cacheKey)) {
    const cached = issuesCache.get(cacheKey)!;
    setRows(cached.rows);
    setTotal(cached.total);
    return;
  }

  setLoading(true);

  try {
    let res;

    if (type === "missing" && column) {
      res = await uploadIssuesService.getMissingRows(
        workspaceId,
        uploadId,
        column,
        limit,
        offset
      );

      const payload = {
        rows: res.data.rows,
        total: res.data.total_missing_rows,
      };

      issuesCache.set(cacheKey, payload);
      setRows(payload.rows);
      setTotal(payload.total);
    }

    if (type === "duplicates") {
      res = await uploadIssuesService.getDuplicateRows(
        workspaceId,
        uploadId,
        limit,
        offset
      );

      const payload = {
        rows: res.data.rows,
        total: res.data.total_duplicate_rows,
      };

      issuesCache.set(cacheKey, payload);
      setRows(payload.rows);
      setTotal(payload.total);
    }
  } catch (err) {
    console.error("Failed to fetch issues:", err);
  } finally {
    setLoading(false);
  }
}, [workspaceId, uploadId, type, column, limit, offset, cacheKey]);


useEffect(() => {
  fetchData();
}, [fetchData]);

useEffect(() => {

  issuesCache.clear();
  setOffset(0);
}, [workspaceId, uploadId, type, column]);



  const nextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const prevPage = () => {
    if (offset - limit >= 0) {
      setOffset(offset - limit);
    }
  };

  if (!type) {
    return <div className="p-6">Invalid issue type</div>;
  }

  return (
  <div className="min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <div>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}`)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
                      Back to Workspace
            </button>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 space-y-1 mt-4">
            {type === "missing"
              ? `Missing Values in "${column}"`
              : "Duplicate Rows Detected"}
          </h1>

          <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
            {type === "missing"
              ? "These rows contain empty or null values in the selected column. Review them carefully to understand data gaps or ingestion issues."
              : "These rows appear more than once in this dataset. Duplicate records may affect analytics accuracy or downstream reporting."}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Total Issues
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {total}
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading dataset snapshot...
          </div>
        ) : total === 0 ? (
          <div className="p-12 text-center">
            <div className="text-lg font-semibold text-slate-700">
              No issues found
            </div>
            <p className="text-sm text-slate-500 mt-2">
              This dataset snapshot does not contain any {type === "missing" ? "missing values" : "duplicate rows"}.
            </p>
          </div>
        ) : (
          <>
            {/* Pagination Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-sm text-slate-600">
              <div>
                Showing{" "}
                <span className="font-semibold text-slate-900 tabular-nums">
                  {offset + 1}
                </span>{" "}
                –{" "}
                <span className="font-semibold text-slate-900 tabular-nums">
                  {Math.min(offset + limit, total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900 tabular-nums">
                  {total}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevPage}
                  disabled={offset === 0}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={nextPage}
                  disabled={offset + limit >= total}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    {rows[0] &&
                      Object.keys(rows[0]).map((key) => (
                        <th
                          key={key}
                          className={`px-6 py-3 text-left font-semibold border-b ${
                            type === "missing" && key === column
                              ? "text-rose-600"
                              : "text-slate-600"
                          }`}
                        >
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-t hover:bg-slate-50 transition"
                    >
                      {Object.entries(row).map(([key, val], i) => (
                        <td
                          key={i}
                          className={`px-6 py-3 whitespace-nowrap ${
                            type === "missing" &&
                            key === column &&
                            val === null
                              ? "text-rose-600 font-semibold"
                              : "text-slate-800"
                          }`}
                        >
                          {val === null ? "null" : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);

};

export default UploadIssuesPage;
