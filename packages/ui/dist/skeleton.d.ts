import type { ReactNode } from "react";
export declare function Skeleton({ className, }: {
    className?: string;
}): any;
/** Table-shaped loading placeholder matching final column count. */
export declare function TableSkeleton({ columns, rows, }: {
    columns?: number;
    rows?: number;
}): any;
export declare function ListRowSkeleton({ rows }: {
    rows?: number;
}): any;
export declare function TreeSkeleton({ rows }: {
    rows?: number;
}): any;
export declare function TablePagination({ pageSize, showing, hasPrev, hasNext, onPrev, onNext, onPageSizeChange, pageSizeOptions, labelShowing, labelPrev, labelNext, labelPageSize, loading, }: {
    pageSize: number;
    showing: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
    labelShowing: ReactNode;
    labelPrev: string;
    labelNext: string;
    labelPageSize?: string;
    loading?: boolean;
}): any;
