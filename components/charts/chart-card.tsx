"use client";

import { ChartNoAxesColumnIcon, Table2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ChartTable = {
  columns: string[];
  rows: (string | number)[][];
};

/**
 * Carte d'un graphique. Chaque graphique a son équivalent en tableau, accessible d'un
 * clic : les valeurs ne dépendent jamais du survol ni de la seule couleur.
 */
export function ChartCard({
  title,
  description,
  table,
  empty = false,
  emptyMessage = "Aucune donnée sur cette période.",
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  table?: ChartTable;
  /** Vrai s'il n'y a rien à tracer : le message remplace le graphique. */
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {table && !empty ? (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-pressed={showTable}
              aria-label={showTable ? "Afficher le graphique" : "Afficher les données en tableau"}
              title={showTable ? "Afficher le graphique" : "Afficher les données en tableau"}
              onClick={() => setShowTable((current) => !current)}
            >
              {showTable ? <ChartNoAxesColumnIcon /> : <Table2Icon />}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {empty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : showTable && table ? (
          <div className="max-h-80 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {table.columns.map((column, index) => (
                    <TableHead key={column} className={index > 0 ? "text-right" : undefined}>
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className={cellIndex > 0 ? "text-right tabular-nums" : undefined}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
