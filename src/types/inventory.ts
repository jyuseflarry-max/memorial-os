// ── Enums ─────────────────────────────────────────────────────────────────

export type InventoryCondition = 'New' | 'Good' | 'Fair' | 'Poor' | 'Retired';
export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'none';
export type RecoveryValuation  = 'original' | 'depreciated' | 'fixed_pct';

// ── Category ──────────────────────────────────────────────────────────────

export interface InventoryCategory {
  id:                  string;
  tenant_id:           string | null; // null = global seed
  name:                string;
  useful_life_years:   number;
  depreciation_method: DepreciationMethod;
}

// ── Item (parent catalog — one row per item TYPE) ─────────────────────────

export interface InventoryItem {
  id:                string;
  tenant_id:         string;
  name:              string;
  description:       string | null;
  category_id:       string;
  category_name?:    string;          // joined
  purchase_price:    number | null;
  useful_life_years: number;
  purchased_at:      string | null;   // DATE string 'YYYY-MM-DD'
  created_at:        string;
}

// ── Instance (physical unit) ───────────────────────────────────────────────

export interface InventoryInstance {
  id:                   string;
  tenant_id:            string;
  item_id:              string;
  item_name?:           string;       // joined
  category_name?:       string;       // joined
  instance_number:      string | null;
  size:                 string | null;
  condition:            InventoryCondition;
  team_id:              string | null;
  assigned_player_id:   string | null;
  assigned_player_name?: string;      // joined
  assigned_at:          string | null;
  purchased_at:         string | null; // overrides item purchased_at if set
  receipt_confirmed_at: string | null;
  receipt_confirmed_by: string | null;
  notes:                string | null;
  created_at:           string;
  // computed client-side
  effective_purchased_at?: string | null;
  book_value?:           number | null;
}

// ── Kit template ──────────────────────────────────────────────────────────

export interface KitTemplateItem {
  item_id: string;
  size?:   string;
}

export interface KitTemplate {
  id:         string;
  tenant_id:  string;
  name:       string;
  team_id:    string | null;
  items:      KitTemplateItem[];
  created_at: string;
}

// ── Settings ──────────────────────────────────────────────────────────────

export interface InventorySettings {
  tenant_id:              string;
  recovery_valuation:     RecoveryValuation;
  recovery_pct:           number;
  alumni_buyback_enabled: boolean;
  alumni_buyback_pct:     number;
  updated_at:             string;
}

// ── API payloads ──────────────────────────────────────────────────────────

export interface AssignPayload {
  instance_ids:       string[];
  player_id:          string;
  team_id?:           string;
}

export interface ReceiptConfirmPayload {
  confirmed_by_user_id?: string; // optional — server may use auth.uid()
}

// ── Audit view row ────────────────────────────────────────────────────────

export interface AuditRow {
  instance_id:          string;
  item_name:            string;
  category_name:        string;
  instance_number:      string | null;
  size:                 string | null;
  condition:            InventoryCondition;
  assigned_player_name: string | null;
  team_name:            string | null;
  assigned_at:          string | null;
  receipt_confirmed_at: string | null;
  effective_purchased_at: string | null;
  purchase_price:       number | null;
  useful_life_years:    number;
  depreciation_method:  DepreciationMethod;
  book_value:           number | null;
}

// ── Player locker (all items assigned to one player) ──────────────────────

export interface PlayerLockerItem {
  instance_id:          string;
  item_name:            string;
  category_name:        string;
  instance_number:      string | null;
  size:                 string | null;
  condition:            InventoryCondition;
  assigned_at:          string | null;
  receipt_confirmed_at: string | null;
  purchase_price:       number | null;
  book_value:           number | null;
}

// ── Pure depreciation engine ──────────────────────────────────────────────

/**
 * Compute current book value of an item.
 * Returns null if required inputs are missing.
 *
 * @param purchasePrice   Original cost in dollars
 * @param usefulLifeYears Useful life (years)
 * @param method          Depreciation method
 * @param purchasedAt     Date of purchase (drives the clock)
 * @param asOf            Date to evaluate as-of (default: today)
 */
export function computeBookValue(
  purchasePrice:   number | null,
  usefulLifeYears: number,
  method:          DepreciationMethod,
  purchasedAt:     string | null,
  asOf:            Date = new Date(),
): number | null {
  if (purchasePrice === null || purchasedAt === null) return null;
  if (method === 'none') return purchasePrice;

  const msPerYear = 365.25 * 24 * 3600 * 1000;
  const yearsElapsed = Math.max(0, (asOf.getTime() - new Date(purchasedAt).getTime()) / msPerYear);

  if (method === 'straight_line') {
    const annualDep = purchasePrice / usefulLifeYears;
    return Math.max(0, purchasePrice - annualDep * yearsElapsed);
  }

  if (method === 'declining_balance') {
    // Double-declining balance
    const rate = 2 / usefulLifeYears;
    return Math.max(0, purchasePrice * Math.pow(1 - rate, yearsElapsed));
  }

  return null;
}

/**
 * Effective purchased_at: instance override takes precedence over item-level date.
 */
export function effectivePurchasedAt(
  instancePurchasedAt: string | null,
  itemPurchasedAt:     string | null,
): string | null {
  return instancePurchasedAt ?? itemPurchasedAt;
}
