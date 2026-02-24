import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

// ─── THEME TOKENS ──────────────────────────────────────────────────────────────
const T = {
  orange: "#E57B2C",
  orangeLight: "rgba(229, 123, 44, 0.08)",
  brown: "#2D241F",
  gray: "#5B514A",
  beige: "#D9C7AC",
  beigeLight: "#F5F3ED",
  white: "#FFFFFF",
  border: "#EAECF0",
  textPrimary: "#101828",
  textSecondary: "#667085",
  textMuted: "#98A2B3",
  green: "#12B76A",
  greenBg: "#ECFDF3",
  greenText: "#027A48",
  red: "#F04438",
  redBg: "#FEF3F2",
  redText: "#B42318",
  purple: "#7C3AED",
  purpleBg: "#F5F3FF",
  font: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

// ─── TYPED COMPONENT PROPS ─────────────────────────────────────────────────────
export interface TableColumn<TRow = any> {
  key: string;
  label: string;
  type?:
    | "text"
    | "bold"
    | "number"
    | "avatar"
    | "name-with-avatar"
    | "chips"
    | "status";
  width?: number | string;
  align?: "left" | "right" | "center";
  avatarKey?: string;
  nameKey?: string;
  render?: (value: any, row: TRow) => ReactNode;
}

export interface FFTableProps<TRow = any> {
  columns: TableColumn<TRow>[];
  data: TRow[];
  selectable?: boolean;
  selectedIds?: any[];
  onSelectionChange?: (selectedIds: any[]) => void;
  onDelete?: (row: TRow) => void;
  onEdit?: (row: TRow) => void;
  pageSize?: number;
  rowKey?: string;
  emptyText?: string;
  style?: CSSProperties;
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

// Checkbox
export const Checkbox = ({
  checked,
  indeterminate = false,
  onChange,
  disabled,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) => {
  const style = {
    wrapper: {
      width: 18,
      height: 18,
      borderRadius: 5,
      border: checked || indeterminate ? "none" : `1.5px solid ${T.beige}`,
      background: checked || indeterminate ? T.orange : T.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      flexShrink: 0,
      transition: "background 0.15s, border 0.15s",
      boxShadow: "0px 1px 2px rgba(16,24,40,0.05)",
    },
  };
  return (
    <div
      style={style.wrapper}
      onClick={!disabled ? onChange : undefined}
      role="checkbox"
      aria-checked={checked}
    >
      {(checked || indeterminate) && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          {indeterminate ? (
            <path
              d="M2 5h6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M1.5 5l2.5 2.5 4.5-4.5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
    </div>
  );
};

// Avatar
export const Avatar = ({
  src,
  name,
  size = 36,
}: {
  src?: string;
  name?: string;
  size?: number;
}) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: src ? "transparent" : T.orange,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 600,
        color: T.white,
        fontFamily: T.font,
        border: `2px solid ${T.beigeLight}`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
};

// Team Chip
export const TeamChip = ({
  label,
  color = T.purple,
}: {
  label: string;
  color?: string;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "2px 8px",
      borderRadius: 6,
      border: `1px solid ${T.border}`,
      background: T.white,
      fontSize: 12,
      fontWeight: 500,
      color: T.textPrimary,
      fontFamily: T.font,
      whiteSpace: "nowrap",
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
    {label}
  </span>
);

// Status Badge
export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<
    string,
    { bg: string; text: string; dot: string; label: string }
  > = {
    active: { bg: T.greenBg, text: T.greenText, dot: T.green, label: "Active" },
    inactive: { bg: T.redBg, text: T.redText, dot: T.red, label: "Inactive" },
    pending: {
      bg: "#FFFAEB",
      text: "#B54708",
      dot: "#F79009",
      label: "Pending",
    },
  };
  const s = map[(status || "").toLowerCase()] || map.active;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px",
        borderRadius: 20,
        background: s.bg,
        fontSize: 12,
        fontWeight: 500,
        color: s.text,
        fontFamily: T.font,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }}
      />
      {s.label}
    </span>
  );
};

// Action Buttons
const ActionButtons = ({
  row,
  onDelete,
  onEdit,
}: {
  row: any;
  onDelete?: (val: any) => void;
  onEdit?: (val: any) => void;
}) => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    {onDelete && (
      <button
        onClick={() => onDelete(row)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          color: T.textSecondary,
          fontFamily: T.font,
          padding: "2px 4px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.red)}
        onMouseLeave={(e) =>
          ((e.target as HTMLElement).style.color = T.textSecondary)
        }
      >
        Delete
      </button>
    )}
    {onEdit && (
      <button
        onClick={() => onEdit(row)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          color: T.purple,
          fontFamily: T.font,
          padding: "2px 4px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) =>
          ((e.target as HTMLElement).style.color = "#5B21B6")
        }
        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.purple)}
      >
        Edit
      </button>
    )}
  </div>
);

// ─── CELL RENDERER ─────────────────────────────────────────────────────────────
const renderCell = (col: TableColumn, row: any) => {
  const val = row[col.key];

  switch (col.type) {
    case "avatar":
      return <Avatar src={val} name={row[col.nameKey || "name"]} size={36} />;

    case "name-with-avatar":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar src={row[col.avatarKey || "photo"]} name={val} size={32} />
          <span style={{ fontWeight: 600, color: T.textPrimary, fontSize: 14 }}>
            {val}
          </span>
        </div>
      );

    case "chips": {
      const chips = Array.isArray(val) ? val : val ? [val] : [];
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {chips.map((c: any, i: number) => (
            <TeamChip
              key={i}
              label={typeof c === "object" ? c.label : c}
              color={typeof c === "object" ? c.color : T.purple}
            />
          ))}
        </div>
      );
    }

    case "status":
      return <StatusBadge status={val} />;

    case "number":
      return (
        <span
          style={{
            fontWeight: 500,
            color: T.textPrimary,
            fontSize: 14,
            fontFamily: T.font,
          }}
        >
          {typeof val === "number" ? val.toLocaleString() : val}
        </span>
      );

    case "bold":
      return (
        <span
          style={{
            fontWeight: 700,
            color: T.textPrimary,
            fontSize: 14,
            fontFamily: T.font,
          }}
        >
          {val}
        </span>
      );

    default:
      return (
        <span
          style={{ color: T.textSecondary, fontSize: 14, fontFamily: T.font }}
        >
          {val ?? "—"}
        </span>
      );
  }
};

// ─── PAGINATION ────────────────────────────────────────────────────────────────
export const Pagination = ({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    )
      pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
  }

  const btnBase = {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontFamily: T.font,
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.15s",
  };

  const navBtn = (label: string, disabled: boolean, onClick: () => void) => (
    <button
      style={{
        ...btnBase,
        width: "auto",
        padding: "0 4px",
        gap: 6,
        background: "none",
        color: disabled ? T.textMuted : T.textPrimary,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
      }}
      onClick={!disabled ? onClick : undefined}
    >
      {label === "Previous" ? (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {label}
        </>
      ) : (
        <>
          {label}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      )}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 4px 4px",
        borderTop: `1px solid ${T.border}`,
      }}
    >
      {navBtn("Previous", current === 1, () => onChange(current - 1))}
      <div style={{ display: "flex", gap: 4 }}>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={i}
              style={{
                ...btnBase,
                color: T.textMuted,
                cursor: "default",
                background: "none",
              }}
            >
              …
            </span>
          ) : (
            <button
              key={i}
              style={{
                ...btnBase,
                background: p === current ? T.orangeLight : "none",
                color: p === current ? T.orange : T.textSecondary,
                border:
                  p === current ? `1px solid rgba(229,123,44,0.2)` : "none",
                fontWeight: p === current ? 700 : 500,
              }}
              onClick={() => typeof p === "number" && onChange(p)}
            >
              {p}
            </button>
          ),
        )}
      </div>
      {navBtn("Next", current === total, () => onChange(current + 1))}
    </div>
  );
};

// ─── MAIN TABLE COMPONENT ──────────────────────────────────────────────────────
export const FFTable = <TRow extends Record<string, any> = any>({
  columns = [],
  data = [],
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onDelete,
  onEdit,
  pageSize = 8,
  rowKey = "id",
  emptyText = "No records found.",
  style = {},
}: FFTableProps<TRow>) => {
  const [selected, setSelected] = useState<Set<any>>(new Set(selectedIds));
  const [page, setPage] = useState(1);
  const [hoveredRow, setHoveredRow] = useState<any>(null);

  // Sync internal selected state when selectedIds prop changes
  // Use JSON serialization to avoid infinite loops from array reference changes
  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [JSON.stringify(selectedIds)]);

  const totalPages = pageSize > 0 ? Math.ceil(data.length / pageSize) : 1;
  const pageData =
    pageSize > 0 ? data.slice((page - 1) * pageSize, page * pageSize) : data;

  const allSelected =
    pageData.length > 0 && pageData.every((r) => selected.has(r[rowKey]));
  const someSelected =
    pageData.some((r) => selected.has(r[rowKey])) && !allSelected;

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) pageData.forEach((r) => next.delete(r[rowKey]));
    else pageData.forEach((r) => next.add(r[rowKey]));
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleRow = (id: any) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  const showActions = onDelete || onEdit;
  const colCount =
    columns.length + (selectable ? 1 : 0) + (showActions ? 1 : 0);

  const thStyle: CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: T.textSecondary,
    fontFamily: T.font,
    whiteSpace: "nowrap",
    background: "#F9FAFB",
    borderBottom: `1px solid ${T.border}`,
    letterSpacing: "0.02em",
  };

  const tdStyle = (isSelected: boolean, isHovered: boolean): CSSProperties => ({
    padding: "14px 16px",
    fontSize: 14,
    fontFamily: T.font,
    borderBottom: `1px solid ${T.border}`,
    background: isSelected ? T.orangeLight : isHovered ? "#FAFAFA" : T.white,
    transition: "background 0.12s",
    verticalAlign: "middle",
  });

  return (
    <div
      style={{
        background: T.white,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        fontFamily: T.font,
        boxShadow:
          "0px 1px 3px rgba(16,24,40,0.06), 0px 1px 2px rgba(16,24,40,0.04)",
        ...style,
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "auto",
          }}
        >
          {/* HEAD */}
          <thead>
            <tr>
              {selectable && (
                <th style={{ ...thStyle, width: 48, paddingRight: 8 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...thStyle,
                    width: col.width,
                    textAlign: col.align || "left",
                  }}
                >
                  {col.label}
                </th>
              ))}
              {showActions && (
                <th style={{ ...thStyle, width: 120, textAlign: "right" }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: T.textMuted,
                    fontSize: 14,
                    fontFamily: T.font,
                  }}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => {
                const id = row[rowKey] ?? idx;
                const isSelected = selected.has(id);
                const isHovered = hoveredRow === id;
                return (
                  <tr
                    key={id}
                    onMouseEnter={() => setHoveredRow(id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {selectable && (
                      <td
                        style={{
                          ...tdStyle(isSelected, isHovered),
                          width: 48,
                          paddingRight: 8,
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          ...tdStyle(isSelected, isHovered),
                          textAlign: col.align || "left",
                        }}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : renderCell(col, row)}
                      </td>
                    ))}
                    {showActions && (
                      <td
                        style={{
                          ...tdStyle(isSelected, isHovered),
                          textAlign: "right",
                          verticalAlign: "middle",
                        }}
                      >
                        <ActionButtons
                          row={row}
                          onDelete={onDelete}
                          onEdit={onEdit}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {pageSize > 0 && totalPages > 1 && (
        <div style={{ padding: "0 16px 16px" }}>
          <Pagination
            current={page}
            total={totalPages}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

export default FFTable;

// usecase example

// import FFTable, { TableColumn } from "@/components/ui/FFTable";

// const columns: TableColumn[] = [
//   { key: "name", label: "Name", type: "bold" },
//   { key: "role", label: "Role", type: "text" },
//   { key: "status", label: "Status", type: "status" },
// ];

// <FFTable
//   columns={columns}
//   data={users}
//   selectable
//   onSelectionChange={handleSelection}
// />
