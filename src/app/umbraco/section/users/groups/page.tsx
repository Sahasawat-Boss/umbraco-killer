import { db } from "@/lib/db";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { Box } from "@/components/ui";
import { ROLE_INFO } from "@/components/backoffice/UserViews";

const PERMS = ["Content", "Media", "Publish", "Settings", "Users"];
const MATRIX: Record<string, boolean[]> = {
  admin: [true, true, true, true, true],
  editor: [true, true, true, false, false],
  writer: [true, true, false, false, false],
};

export default async function GroupsPage() {
  const counts = await db.user.groupBy({ by: ["role"], _count: true });
  return (
    <SimpleWorkspace title="User Groups" icon="Shield">
      <div className="mx-auto max-w-4xl">
        <Box>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted uppercase">
                <th className="pb-2">Group</th>
                {PERMS.map((p) => <th key={p} className="pb-2 text-center">{p}</th>)}
                <th className="pb-2 text-right">Users</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROLE_INFO).map(([k, v]) => (
                <tr key={k} className="border-t border-line">
                  <td className="py-3">
                    <div className="font-bold">{v.label}</div>
                    <div className="text-xs text-muted">{v.text}</div>
                  </td>
                  {MATRIX[k]!.map((ok, i) => (
                    <td key={i} className="text-center">{ok ? <span className="font-bold text-brand-700">✓</span> : <span className="text-muted">—</span>}</td>
                  ))}
                  <td className="text-right text-muted">{counts.find((c) => c.role === k)?._count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </div>
    </SimpleWorkspace>
  );
}
