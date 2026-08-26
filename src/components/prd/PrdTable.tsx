import type { ReactNode } from 'react';
import { Table } from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';

type PrdTableCellConfig = {
  children: ReactNode;
  colSpan?: number;
  rowSpan?: number;
};

type PrdTableCell = ReactNode | PrdTableCellConfig;
type PrdRow = Record<string, PrdTableCell> & { key: string };

function isCellConfig(cell: PrdTableCell): cell is PrdTableCellConfig {
  return (
    cell !== null
    && typeof cell === 'object'
    && !Array.isArray(cell)
    && Object.prototype.hasOwnProperty.call(cell, 'children')
    && (
      Object.prototype.hasOwnProperty.call(cell, 'rowSpan')
      || Object.prototype.hasOwnProperty.call(cell, 'colSpan')
    )
  );
}

function renderCell(cell: PrdTableCell) {
  if (!isCellConfig(cell)) return cell;

  return {
    children: cell.children,
    props: {
      colSpan: cell.colSpan,
      rowSpan: cell.rowSpan,
    },
  };
}

function renderHeaderCell(cell: PrdTableCell): ReactNode {
  return isCellConfig(cell) ? cell.children : cell;
}

export default function PrdTable({
  rows,
  className,
}: {
  rows: PrdTableCell[][];
  className?: string;
}) {
  const [headers = [], ...bodyRows] = rows;
  const columns: ColumnProps<PrdRow>[] = headers.map((title, index) => ({
    title: renderHeaderCell(title),
    dataIndex: `column-${index}`,
    render: (value) => renderCell(value),
  }));
  const data = bodyRows.map((row, rowIndex) => row.reduce<PrdRow>((record, cell, cellIndex) => ({
    ...record,
    [`column-${cellIndex}`]: cell,
  }), { key: `prd-row-${rowIndex}` }));

  return (
    <Table<PrdRow>
      className={className}
      rowKey="key"
      columns={columns}
      data={data}
      borderCell
      pagination={false}
      size="small"
    />
  );
}
