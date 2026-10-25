"use client";

/**
 * FILE: components/portfolio/chartSetup.js
 * PURPOSE:
 *   Shared Chart.js component registration, brand styling constants,
 *   and number formatters for the Investor Portfolio charts.
 *
 * REGISTRATION:
 *   Registers strictly the required components:
 *     - ArcElement (Doughnut)
 *     - BarElement (Horizontal & Vertical Bars)
 *     - CategoryScale (X/Y category axes)
 *     - LinearScale (X/Y value axes)
 *     - Tooltip
 *     - Legend
 */

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export { ChartJS };

/**
 * Standard currency formatter matching the platform's visual design.
 * Example: 50000, "AED" -> "AED 50,000"
 */
export function formatCurrency(amount, currency = "AED") {
  const num = Number(amount || 0);
  const curr = currency || "AED";
  return `${curr} ${num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Formats a value as a 1-decimal percentage string.
 * Example: 45.234 -> "45.2%"
 */
export function formatPercent(val) {
  const num = Number(val || 0);
  return `${num.toFixed(1)}%`;
}

/**
 * Brand-aligned color palette derived from platform emerald, teal, and slate tones.
 * Accessible with high contrast against the light page background.
 */
export const PORTFOLIO_PALETTE = [
  "#059669", // Emerald (Primary Brand)
  "#0d9488", // Teal
  "#10b981", // Mint Emerald
  "#0284c7", // Sky Blue
  "#047857", // Forest Green
  "#d97706", // Warm Amber
  "#6366f1", // Indigo
  "#64748b", // Slate Gray
  "#84cc16", // Lime
  "#a855f7", // Purple
];
