import React, {
  useState, useContext, createContext, useMemo,
  useEffect, useCallback, FormEvent,
} from "react";
import {
  LayoutDashboard, Users, Package, FileText, Activity, LogOut,
  Plus, Search, Edit2, Eye, AlertTriangle, X, ChevronLeft,
  ChevronRight, ArrowUp, ArrowDown, Menu, User, RefreshCw,
  DollarSign, Building2, Phone, Mail, MapPin, Calendar,
  Trash2, MessageSquare, Check, Layers, Hash, Clock, FileCheck,
} from "lucide-react";
import { api, setAuthToken, removeAuthToken } from "./services/api";


// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Role = "Admin" | "Sales" | "Warehouse" | "Accounts";
type CustomerType = "Retail" | "Wholesale" | "Distributor";
type CustomerStatus = "Lead" | "Active" | "Inactive";
type MovementType = "IN" | "OUT";
type ChallanStatus = "Draft" | "Confirmed" | "Cancelled";
type View =
  | "dashboard"
  | "customers"
  | "customer-detail"
  | "products"
  | "challans"
  | "challan-detail"
  | "create-challan"
  | "stock-movements";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
}

interface CustomerNote {
  text: string;
  by: string;
  at: string;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gst: string;
  type: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string;
  notes: CustomerNote[];
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  warehouseLocation: string;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  qtyChanged: number;
  type: MovementType;
  reason: string;
  createdBy: string;
  timestamp: string;
}

interface ChallanItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  qty: number;
  subtotal: number;
}

interface Challan {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerBusiness: string;
  items: ChallanItem[];
  totalQty: number;
  totalAmount: number;
  status: ChallanStatus;
  createdBy: string;
  createdDate: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// ═══════════════════════════════════════════════════════════════
// SEED / CONSTANTS
// ═══════════════════════════════════════════════════════════════

const AUTH_USERS = [
  { id: "U001", name: "Arjun Mehta", email: "admin@distroerp.com", password: "admin123", role: "Admin" as Role },
  { id: "U002", name: "Priya Singh", email: "sales@distroerp.com", password: "sales123", role: "Sales" as Role },
  { id: "U003", name: "Rajan Kumar", email: "warehouse@distroerp.com", password: "warehouse123", role: "Warehouse" as Role },
  { id: "U004", name: "Deepak Verma", email: "accounts@distroerp.com", password: "accounts123", role: "Accounts" as Role },
  { id: "U001", name: "Arjun Mehta", email: "admin@erp.com", password: "admin123", role: "Admin" as Role },
  { id: "U002", name: "Priya Singh", email: "sales@erp.com", password: "sales123", role: "Sales" as Role },
  { id: "U003", name: "Rajan Kumar", email: "warehouse@erp.com", password: "wh123", role: "Warehouse" as Role },
  { id: "U004", name: "Deepak Verma", email: "accounts@erp.com", password: "acc123", role: "Accounts" as Role },
];

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "C001", name: "Vikram Patel", mobile: "9876543210",
    email: "vikram@pateltraders.com", businessName: "Patel Traders Pvt Ltd",
    gst: "27AABCP1234F1Z5", type: "Wholesale",
    address: "45 Market Street, Dadar, Mumbai, Maharashtra 400028",
    status: "Active", followUpDate: "2026-08-15",
    notes: [
      { text: "Initial meeting done. Interested in bulk FMCG order.", by: "Priya Singh", at: "10 Jun 2026, 10:30" },
      { text: "Sent product catalog and pricing sheet via email.", by: "Priya Singh", at: "20 Jun 2026, 14:00" },
    ],
    createdAt: "2026-06-01",
  },
  {
    id: "C002", name: "Sunita Agarwal", mobile: "9823456701",
    email: "sunita@agarwalwholesale.com", businessName: "Agarwal Wholesale Hub",
    gst: "07AAAAG1234A1Z2", type: "Distributor",
    address: "12 Nehru Place, New Delhi, Delhi 110019",
    status: "Active", followUpDate: "2026-08-20",
    notes: [
      { text: "Established distributor, 3-year relationship. Always pays on time.", by: "Arjun Mehta", at: "15 May 2026, 09:00" },
    ],
    createdAt: "2024-01-15",
  },
  {
    id: "C003", name: "Ramesh Gupta", mobile: "9765432109",
    email: "ramesh@guptamart.in", businessName: "Gupta General Mart",
    gst: "", type: "Retail",
    address: "78 Gandhi Road, Jaipur, Rajasthan 302001",
    status: "Lead", followUpDate: "2026-08-12",
    notes: [
      { text: "Found via trade fair. Interested in personal care products.", by: "Priya Singh", at: "28 Jul 2026, 11:00" },
    ],
    createdAt: "2026-07-28",
  },
  {
    id: "C004", name: "Kavitha Reddy", mobile: "9654321098",
    email: "kavitha@reddysupplies.com", businessName: "Reddy Supplies Co",
    gst: "36AABCR5678G1Z1", type: "Wholesale",
    address: "23 Banjara Hills, Hyderabad, Telangana 500034",
    status: "Active", followUpDate: "2026-09-01",
    notes: [],
    createdAt: "2025-03-10",
  },
  {
    id: "C005", name: "Amit Joshi", mobile: "9543210987",
    email: "amit@joshidistrib.com", businessName: "Joshi Distribution Network",
    gst: "24AAACJ9012H1Z8", type: "Distributor",
    address: "56 CG Road, Ahmedabad, Gujarat 380009",
    status: "Inactive", followUpDate: "2026-10-01",
    notes: [
      { text: "Paused orders due to warehouse renovation. Will resume Q4 2026.", by: "Priya Singh", at: "30 Jun 2026, 16:00" },
    ],
    createdAt: "2024-09-22",
  },
  {
    id: "C006", name: "Meena Krishnan", mobile: "9432109876",
    email: "meena@krishnamart.com", businessName: "Krishna Supermart",
    gst: "33AAACK3456I1Z4", type: "Retail",
    address: "34 Anna Salai, Chennai, Tamil Nadu 600002",
    status: "Active", followUpDate: "2026-08-25",
    notes: [],
    createdAt: "2025-06-14",
  },
  {
    id: "C007", name: "Suresh Naidu", mobile: "9321098765",
    email: "suresh@naidutrading.com", businessName: "Naidu Trading Co",
    gst: "29AABCN8901J1Z3", type: "Wholesale",
    address: "89 Commercial Street, Bengaluru, Karnataka 560001",
    status: "Lead", followUpDate: "2026-08-18",
    notes: [
      { text: "Called twice. Interested in cereal and grain products. Quote sent.", by: "Priya Singh", at: "5 Aug 2026, 10:15" },
    ],
    createdAt: "2026-08-01",
  },
];

const SEED_PRODUCTS: Product[] = [
  { id: "P001", name: "Basmati Rice Premium 25kg", sku: "RICE-BAS-25K", category: "Grains & Cereals", unitPrice: 1850, currentStock: 245, minStockAlert: 50, warehouseLocation: "A-01-R1" },
  { id: "P002", name: "Refined Sunflower Oil 15L", sku: "OIL-SUN-15L", category: "Edible Oils", unitPrice: 1620, currentStock: 18, minStockAlert: 30, warehouseLocation: "B-02-R3" },
  { id: "P003", name: "Whole Wheat Atta 10kg", sku: "ATTA-WW-10K", category: "Grains & Cereals", unitPrice: 395, currentStock: 320, minStockAlert: 80, warehouseLocation: "A-03-R2" },
  { id: "P004", name: "Refined Sugar 50kg", sku: "SUGAR-REF-50", category: "Sugar & Sweeteners", unitPrice: 2100, currentStock: 12, minStockAlert: 25, warehouseLocation: "C-01-R1" },
  { id: "P005", name: "Iodized Salt 1kg (Case/50)", sku: "SALT-IOD-1K50", category: "Salt & Spices", unitPrice: 875, currentStock: 180, minStockAlert: 40, warehouseLocation: "C-02-R4" },
  { id: "P006", name: "Parle-G Biscuits Case/48", sku: "BISC-PG-C48", category: "Biscuits & Snacks", unitPrice: 1440, currentStock: 95, minStockAlert: 20, warehouseLocation: "D-01-R1" },
  { id: "P007", name: "Maggi Noodles Case/48", sku: "NOOD-MG-C48", category: "Instant Food", unitPrice: 2160, currentStock: 67, minStockAlert: 15, warehouseLocation: "D-02-R2" },
  { id: "P008", name: "Dettol Soap Case/36", sku: "SOAP-DT-C36", category: "Personal Care", unitPrice: 1980, currentStock: 8, minStockAlert: 20, warehouseLocation: "E-01-R2" },
  { id: "P009", name: "Colgate Total 200g Case/24", sku: "TPASTE-CG-C24", category: "Personal Care", unitPrice: 3360, currentStock: 43, minStockAlert: 10, warehouseLocation: "E-02-R3" },
  { id: "P010", name: "Amul Butter 500g Case/20", sku: "BUTR-AMUL-C20", category: "Dairy", unitPrice: 5400, currentStock: 31, minStockAlert: 8, warehouseLocation: "F-01-R1" },
];

const SEED_MOVEMENTS: StockMovement[] = [
  { id: "SM001", productId: "P001", productName: "Basmati Rice Premium 25kg", productSku: "RICE-BAS-25K", qtyChanged: 100, type: "IN", reason: "Purchase Order #PO-2026-041", createdBy: "Rajan Kumar", timestamp: "10 Jul 2026, 09:15" },
  { id: "SM002", productId: "P002", productName: "Refined Sunflower Oil 15L", productSku: "OIL-SUN-15L", qtyChanged: 50, type: "IN", reason: "Purchase Order #PO-2026-038", createdBy: "Rajan Kumar", timestamp: "8 Jul 2026, 11:00" },
  { id: "SM003", productId: "P002", productName: "Refined Sunflower Oil 15L", productSku: "OIL-SUN-15L", qtyChanged: 32, type: "OUT", reason: "Sales Challan #CH-2026-0118", createdBy: "Priya Singh", timestamp: "15 Jul 2026, 14:30" },
  { id: "SM004", productId: "P008", productName: "Dettol Soap Case/36", productSku: "SOAP-DT-C36", qtyChanged: 40, type: "IN", reason: "Purchase Order #PO-2026-042", createdBy: "Rajan Kumar", timestamp: "20 Jul 2026, 10:00" },
  { id: "SM005", productId: "P008", productName: "Dettol Soap Case/36", productSku: "SOAP-DT-C36", qtyChanged: 32, type: "OUT", reason: "Sales Challan #CH-2026-0119", createdBy: "Priya Singh", timestamp: "22 Jul 2026, 16:00" },
  { id: "SM006", productId: "P003", productName: "Whole Wheat Atta 10kg", productSku: "ATTA-WW-10K", qtyChanged: 150, type: "IN", reason: "Purchase Order #PO-2026-040", createdBy: "Rajan Kumar", timestamp: "5 Jul 2026, 08:30" },
  { id: "SM007", productId: "P004", productName: "Refined Sugar 50kg", productSku: "SUGAR-REF-50", qtyChanged: 30, type: "IN", reason: "Purchase Order #PO-2026-043", createdBy: "Rajan Kumar", timestamp: "1 Aug 2026, 09:00" },
  { id: "SM008", productId: "P004", productName: "Refined Sugar 50kg", productSku: "SUGAR-REF-50", qtyChanged: 18, type: "OUT", reason: "Sales Challan #CH-2026-0117", createdBy: "Priya Singh", timestamp: "2 Aug 2026, 13:00" },
];

const SEED_CHALLANS: Challan[] = [
  {
    id: "CH001", number: "CH-2026-0118",
    customerId: "C001", customerName: "Vikram Patel", customerBusiness: "Patel Traders Pvt Ltd",
    items: [
      { productId: "P001", productName: "Basmati Rice Premium 25kg", sku: "RICE-BAS-25K", unitPrice: 1850, qty: 10, subtotal: 18500 },
      { productId: "P002", productName: "Refined Sunflower Oil 15L", sku: "OIL-SUN-15L", unitPrice: 1620, qty: 32, subtotal: 51840 },
    ],
    totalQty: 42, totalAmount: 70340, status: "Confirmed",
    createdBy: "Priya Singh", createdDate: "2026-07-15",
  },
  {
    id: "CH002", number: "CH-2026-0119",
    customerId: "C002", customerName: "Sunita Agarwal", customerBusiness: "Agarwal Wholesale Hub",
    items: [
      { productId: "P008", productName: "Dettol Soap Case/36", sku: "SOAP-DT-C36", unitPrice: 1980, qty: 20, subtotal: 39600 },
      { productId: "P009", productName: "Colgate Total 200g Case/24", sku: "TPASTE-CG-C24", unitPrice: 3360, qty: 12, subtotal: 40320 },
    ],
    totalQty: 32, totalAmount: 79920, status: "Confirmed",
    createdBy: "Priya Singh", createdDate: "2026-07-22",
  },
  {
    id: "CH003", number: "CH-2026-0120",
    customerId: "C004", customerName: "Kavitha Reddy", customerBusiness: "Reddy Supplies Co",
    items: [
      { productId: "P006", productName: "Parle-G Biscuits Case/48", sku: "BISC-PG-C48", unitPrice: 1440, qty: 15, subtotal: 21600 },
      { productId: "P007", productName: "Maggi Noodles Case/48", sku: "NOOD-MG-C48", unitPrice: 2160, qty: 10, subtotal: 21600 },
    ],
    totalQty: 25, totalAmount: 43200, status: "Draft",
    createdBy: "Priya Singh", createdDate: "2026-08-01",
  },
  {
    id: "CH004", number: "CH-2026-0117",
    customerId: "C002", customerName: "Sunita Agarwal", customerBusiness: "Agarwal Wholesale Hub",
    items: [
      { productId: "P004", productName: "Refined Sugar 50kg", sku: "SUGAR-REF-50", unitPrice: 2100, qty: 18, subtotal: 37800 },
      { productId: "P003", productName: "Whole Wheat Atta 10kg", sku: "ATTA-WW-10K", unitPrice: 395, qty: 50, subtotal: 19750 },
    ],
    totalQty: 68, totalAmount: 57550, status: "Confirmed",
    createdBy: "Arjun Mehta", createdDate: "2026-07-10",
  },
];

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function genId(prefix: string): string {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function nowTimestamp(): string {
  return new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function nextChallanNumber(challans: Challan[]): string {
  const year = new Date().getFullYear();
  const max = challans.reduce((m, c) => {
    const match = c.number.match(/CH-\d{4}-(\d+)/);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 116);
  return `CH-${year}-${String(max + 1).padStart(4, "0")}`;
}

// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false, message: "" }),
  logout: () => {},
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem("erp_user");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.login({ email, password });
      setAuthToken(res.token);
      const authUser: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        token: res.token
      };
      setUser(authUser);
      localStorage.setItem("erp_user", JSON.stringify(authUser));
      return { success: true, message: "Login successful" };
    } catch (err: any) {
      // Fallback to local auth if backend offline
      const found = AUTH_USERS.find(u => u.email === email && u.password === password);
      if (found) {
        const authUser: AuthUser = {
          id: found.id, name: found.name, email: found.email, role: found.role,
          token: `jwt.${btoa(found.id)}.${btoa(Date.now().toString())}`,
        };
        setUser(authUser);
        localStorage.setItem("erp_user", JSON.stringify(authUser));
        return { success: true, message: "Login successful (Demo mode)" };
      }
      return { success: false, message: err?.message || "Invalid email or password" };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    removeAuthToken();
    localStorage.removeItem("erp_user");
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════
// APP CONTEXT
// ═══════════════════════════════════════════════════════════════

interface AppContextType {
  customers: Customer[];
  products: Product[];
  challans: Challan[];
  stockMovements: StockMovement[];
  addCustomer: (c: Omit<Customer, "id" | "notes" | "createdAt">) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  addCustomerNote: (id: string, text: string, by: string) => Promise<void>;
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  updateStock: (productId: string, qty: number, type: MovementType, reason: string, by: string) => Promise<void>;
  addChallan: (c: Omit<Challan, "id" | "number">, confirm: boolean) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  updateChallanStatus: (id: string, status: ChallanStatus, by: string) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  currentView: View;
  setView: (v: View) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  toasts: Toast[];
  showToast: (message: string, type: Toast["type"]) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

function AppProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [challans, setChallans] = useState<Challan[]>(SEED_CHALLANS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(SEED_MOVEMENTS);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const setView = useCallback((v: View) => setCurrentView(v), []);

  const showToast = useCallback((message: string, type: Toast["type"]) => {
    const id = genId("T");
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [custRes, prodRes, smRes, chRes] = await Promise.all([
        api.getCustomers(),
        api.getProducts(),
        api.getStockMovements(),
        api.getChallans()
      ]);
      if (custRes?.data) setCustomers(custRes.data);
      if (prodRes?.data) setProducts(prodRes.data);
      if (smRes?.data) setStockMovements(smRes.data);
      if (chRes?.data) setChallans(chRes.data);
    } catch (e) {
      console.warn("Backend API disconnected or unreachable. Using demo dataset.");
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addCustomer = useCallback(async (c: Omit<Customer, "id" | "notes" | "createdAt">) => {
    try {
      const created = await api.createCustomer(c);
      setCustomers(prev => [created, ...prev]);
      showToast(`Customer '${created.name}' added successfully`, "success");
    } catch (e: any) {
      const local = { ...c, id: genId("C"), notes: [], createdAt: new Date().toISOString().slice(0, 10) };
      setCustomers(prev => [local, ...prev]);
      showToast(e?.message || "Saved customer locally", "info");
    }
  }, [showToast]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    try {
      const updated = await api.updateCustomer(id, updates);
      setCustomers(prev => prev.map(c => c.id === id ? updated : c));
      showToast("Customer details updated", "success");
    } catch (e: any) {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      showToast("Updated locally", "info");
    }
  }, [showToast]);

  const addCustomerNote = useCallback(async (id: string, text: string, by: string) => {
    try {
      const res = await api.addCustomerNote(id, text);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes: res.notes } : c));
      showToast("Follow-up note saved", "success");
    } catch (e: any) {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes: [{ text, by, at: nowTimestamp() }, ...c.notes] } : c));
      showToast("Note added locally", "info");
    }
  }, [showToast]);

  const addProduct = useCallback(async (p: Omit<Product, "id">) => {
    try {
      const created = await api.createProduct(p);
      setProducts(prev => [created, ...prev]);
      showToast(`Product '${created.name}' added to inventory`, "success");
      await refreshData();
    } catch (e: any) {
      setProducts(prev => [{ ...p, id: genId("P") }, ...prev]);
      showToast(e?.message || "Product added locally", "info");
    }
  }, [showToast, refreshData]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const updated = await api.updateProduct(id, updates);
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
      showToast("Product updated", "success");
    } catch (e: any) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      showToast("Updated locally", "info");
    }
  }, [showToast]);

  const updateStock = useCallback(async (productId: string, qty: number, type: MovementType, reason: string, by: string) => {
    try {
      await api.adjustStock(productId, { qtyChanged: qty, type, reason });
      await refreshData();
      showToast(`Stock updated ${type} by ${qty}`, "success");
    } catch (e: any) {
      const product = products.find(p => p.id === productId);
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        const newStock = type === "IN" ? p.currentStock + qty : Math.max(0, p.currentStock - qty);
        return { ...p, currentStock: newStock };
      }));
      if (product) {
        setStockMovements(prev => [{
          id: genId("SM"), productId, productName: product.name, productSku: product.sku,
          qtyChanged: qty, type, reason, createdBy: by, timestamp: nowTimestamp(),
        }, ...prev]);
      }
      showToast(e?.message || "Stock adjusted locally", type === "IN" ? "success" : "warning");
    }
  }, [products, refreshData, showToast]);

  const addChallan = useCallback(async (c: Omit<Challan, "id" | "number">, confirm: boolean) => {
    try {
      const itemsPayload = c.items.map(i => ({ productId: i.productId, qty: i.qty }));
      const created = await api.createChallan({
        customerId: c.customerId,
        items: itemsPayload,
        status: confirm ? "Confirmed" : "Draft"
      });
      await refreshData();
      return { success: true, message: confirm ? `Challan #${created.number} confirmed — stock updated` : `Challan #${created.number} saved as draft` };
    } catch (err: any) {
      if (confirm) {
        const errors: string[] = [];
        c.items.forEach(item => {
          const prod = products.find(p => p.id === item.productId);
          if (!prod) {
            errors.push(`Product "${item.productName}" not found`);
          } else if (prod.currentStock < item.qty) {
            errors.push(`Insufficient stock for "${item.productName}" — available: ${prod.currentStock}, required: ${item.qty}`);
          }
        });
        if (errors.length > 0 || err?.message) {
          return { success: false, message: err?.message || "Stock validation failed", errors: errors.length > 0 ? errors : [err?.message] };
        }
      }

      const number = nextChallanNumber(challans);
      const status: ChallanStatus = confirm ? "Confirmed" : "Draft";
      setChallans(prev => [{ ...c, id: genId("CH"), number, status }, ...prev]);

      if (confirm) {
        c.items.forEach(item => {
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, currentStock: p.currentStock - item.qty } : p));
          setStockMovements(prev => [{
            id: genId("SM"), productId: item.productId, productName: item.productName,
            productSku: item.sku, qtyChanged: item.qty, type: "OUT" as MovementType,
            reason: `Sales Challan #${number}`, createdBy: c.createdBy, timestamp: nowTimestamp(),
          }, ...prev]);
        });
      }

      return { success: true, message: confirm ? `Challan ${number} confirmed — stock updated` : `Challan ${number} saved as draft` };
    }
  }, [products, challans, refreshData]);

  const updateChallanStatus = useCallback(async (id: string, status: ChallanStatus, by: string) => {
    try {
      if (status === "Confirmed") {
        await api.confirmChallan(id);
      } else if (status === "Cancelled") {
        await api.cancelChallan(id);
      }
      await refreshData();
      return { success: true, message: `Challan status updated to ${status}` };
    } catch (err: any) {
      const challan = challans.find(c => c.id === id);
      if (!challan) return { success: false, message: "Challan not found" };

      if (status === "Confirmed" && challan.status === "Draft") {
        const errors: string[] = [];
        challan.items.forEach(item => {
          const prod = products.find(p => p.id === item.productId);
          if (!prod || prod.currentStock < item.qty) {
            errors.push(`Insufficient stock for "${item.productName}" — available: ${prod?.currentStock ?? 0}, required: ${item.qty}`);
          }
        });
        if (errors.length > 0 || err?.message) {
          return { success: false, message: err?.message || "Stock validation failed", errors: errors.length > 0 ? errors : [err?.message] };
        }

        challan.items.forEach(item => {
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, currentStock: p.currentStock - item.qty } : p));
          setStockMovements(prev => [{
            id: genId("SM"), productId: item.productId, productName: item.productName,
            productSku: item.sku, qtyChanged: item.qty, type: "OUT" as MovementType,
            reason: `Sales Challan #${challan.number}`, createdBy: by, timestamp: nowTimestamp(),
          }, ...prev]);
        });
      }

      if (status === "Cancelled" && challan.status === "Confirmed") {
        challan.items.forEach(item => {
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, currentStock: p.currentStock + item.qty } : p));
          setStockMovements(prev => [{
            id: genId("SM"), productId: item.productId, productName: item.productName,
            productSku: item.sku, qtyChanged: item.qty, type: "IN" as MovementType,
            reason: `Cancellation of Challan #${challan.number}`, createdBy: by, timestamp: nowTimestamp(),
          }, ...prev]);
        });
      }

      setChallans(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      return { success: true, message: `Challan ${status.toLowerCase()} successfully` };
    }
  }, [challans, products, refreshData]);

  const value = useMemo(() => ({
    customers, products, challans, stockMovements,
    addCustomer, updateCustomer, addCustomerNote,
    addProduct, updateProduct, updateStock,
    addChallan, updateChallanStatus,
    currentView, setView, selectedId, setSelectedId,
    toasts, showToast, refreshData,
  }), [
    customers, products, challans, stockMovements,
    addCustomer, updateCustomer, addCustomerNote,
    addProduct, updateProduct, updateStock,
    addChallan, updateChallanStatus,
    currentView, setView, selectedId, toasts, showToast, refreshData
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function useAuth() { return useContext(AuthContext); }
function useApp() { return useContext(AppContext); }

// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Lead: "bg-amber-50 text-amber-700 border border-amber-200",
  Inactive: "bg-slate-100 text-slate-500 border border-slate-200",
  Confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Draft: "bg-blue-50 text-blue-700 border border-blue-200",
  Cancelled: "bg-red-50 text-red-600 border border-red-200",
  Wholesale: "bg-violet-50 text-violet-700 border border-violet-200",
  Retail: "bg-sky-50 text-sky-700 border border-sky-200",
  Distributor: "bg-orange-50 text-orange-700 border border-orange-200",
  IN: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  OUT: "bg-red-50 text-red-600 border border-red-200",
};

function Badge({ label }: { label: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[label] ?? "bg-slate-100 text-slate-600 border border-slate-200")}>
      {label}
    </span>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

function Button({ variant = "primary", size = "md", icon, children, className, ...rest }: ButtonProps) {
  const base = "inline-flex items-center gap-1.5 rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white shadow-sm",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
function Input({ label, error, className, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
      <input className={cn(
        "w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
        error && "border-red-400 focus:ring-red-200",
        className
      )} {...rest} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
function Select({ label, error, className, children, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
      <select className={cn(
        "w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
        error && "border-red-400",
        className
      )} {...rest}>
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
function Textarea({ label, error, className, ...rest }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
      <textarea className={cn(
        "w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 resize-none",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
        error && "border-red-400",
        className
      )} rows={3} {...rest} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Modal({ title, onClose, children, width = "max-w-2xl" }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden", width)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium max-w-sm pointer-events-auto",
          t.type === "success" && "bg-emerald-600 text-white",
          t.type === "error" && "bg-red-600 text-white",
          t.type === "info" && "bg-blue-600 text-white",
        )}>
          {t.type === "success" && <Check size={15} />}
          {t.type === "error" && <AlertTriangle size={15} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return (
    <span className="text-xs text-slate-400">{total} record{total !== 1 ? "s" : ""}</span>
  );
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors">
          <ChevronLeft size={14} />
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={cn("w-7 h-7 rounded text-xs font-medium transition-all",
              p === page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100")}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, iconBg }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className={cn("p-2.5 rounded-lg shrink-0", iconBg)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType; roles: Role[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Sales", "Warehouse", "Accounts"] },
  { id: "customers", label: "Customers", icon: Users, roles: ["Admin", "Sales"] },
  { id: "products", label: "Products", icon: Package, roles: ["Admin", "Warehouse"] },
  { id: "challans", label: "Challans", icon: FileText, roles: ["Admin", "Sales", "Warehouse", "Accounts"] },
  { id: "stock-movements", label: "Stock Movements", icon: Activity, roles: ["Admin", "Warehouse"] },
];

const ROLE_BADGE: Record<Role, string> = {
  Admin: "bg-violet-500/20 text-violet-300",
  Sales: "bg-blue-500/20 text-blue-300",
  Warehouse: "bg-amber-500/20 text-amber-300",
  Accounts: "bg-emerald-500/20 text-emerald-300",
};

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth();
  const { currentView, setView } = useApp();

  const allowed = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (currentView === item.id) return true;
    if (item.id === "customers" && currentView === "customer-detail") return true;
    if (item.id === "challans" && (currentView === "challan-detail" || currentView === "create-challan")) return true;
    return false;
  };

  return (
    <aside className={cn(
      "h-screen bg-slate-900 flex flex-col transition-all duration-200 shrink-0 border-r border-slate-800",
      collapsed ? "w-[60px]" : "w-56"
    )}>
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-slate-800 shrink-0", collapsed && "px-3 justify-center")}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Layers size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-none">DistroERP</p>
            <p className="text-slate-500 text-xs mt-0.5">Distribution Suite</p>
          </div>
        )}
        <button onClick={onToggle} className={cn("text-slate-600 hover:text-slate-400 transition-colors", collapsed && "mt-0")}>
          <Menu size={15} />
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {allowed.map(item => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button key={item.id} onClick={() => setView(item.id)} title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-all w-full text-left",
                collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                active ? "bg-blue-600/20 text-blue-300 border border-blue-500/25" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
              )}>
              <Icon size={16} className="shrink-0" />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
              <User size={14} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-xs font-medium truncate">{user?.name}</p>
              <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", user?.role ? ROLE_BADGE[user.role] : "")}>{user?.role}</span>
            </div>
            <button onClick={logout} title="Logout" className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button onClick={logout} title="Logout" className="w-full flex justify-center text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-800">
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════

const PAGE_TITLES: Partial<Record<View, string>> = {
  dashboard: "Dashboard",
  customers: "Customers",
  "customer-detail": "Customer Detail",
  products: "Products & Inventory",
  challans: "Sales Challans",
  "challan-detail": "Challan Detail",
  "create-challan": "New Sales Challan",
  "stock-movements": "Stock Movements",
};

function Header() {
  const { currentView, products } = useApp();
  const lowStock = products.filter(p => p.currentStock <= p.minStockAlert).length;
  return (
    <header className="h-13 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0" style={{ height: "52px" }}>
      <h1 className="text-sm font-semibold text-slate-900 flex-1">{PAGE_TITLES[currentView] ?? "ERP"}</h1>
      {lowStock > 0 && (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <AlertTriangle size={12} />
          {lowStock} low stock alert{lowStock > 1 ? "s" : ""}
        </div>
      )}
      <span className="text-xs text-slate-400 hidden sm:block">
        {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
      </span>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

function DashboardPage() {
  const { customers, products, challans, stockMovements, setView, setSelectedId } = useApp();
  const { user } = useAuth();

  const stats = useMemo(() => {
    const activeCustomers = customers.filter(c => c.status === "Active").length;
    const lowStockItems = products.filter(p => p.currentStock <= p.minStockAlert);
    const confirmedChallans = challans.filter(c => c.status === "Confirmed").length;
    const monthRevenue = challans
      .filter(c => c.status === "Confirmed" && c.createdDate.startsWith("2026-08"))
      .reduce((s, c) => s + c.totalAmount, 0);
    return { activeCustomers, lowStockItems, confirmedChallans, monthRevenue };
  }, [customers, products, challans]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">Welcome back,</p>
          <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
        </div>
        <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full", ROLE_BADGE[user?.role ?? "Admin"])}>
          {user?.role}
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Customers" value={stats.activeCustomers}
          sub={`${customers.length} total in CRM`}
          icon={<Users size={17} className="text-blue-600" />} iconBg="bg-blue-50" />
        <StatCard label="Total Products" value={products.length}
          sub={`${stats.lowStockItems.length} below min stock`}
          icon={<Package size={17} className="text-violet-600" />} iconBg="bg-violet-50" />
        <StatCard label="Confirmed Challans" value={stats.confirmedChallans}
          sub={`${challans.length} total challans`}
          icon={<FileCheck size={17} className="text-emerald-600" />} iconBg="bg-emerald-50" />
        <StatCard label="August Revenue" value={formatCurrency(stats.monthRevenue)}
          sub="Confirmed challans"
          icon={<DollarSign size={17} className="text-amber-600" />} iconBg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Recent Challans</h3>
            <button onClick={() => setView("challans")} className="text-xs text-blue-600 hover:underline font-medium">View all</button>
          </div>
          <div className="divide-y divide-slate-100">
            {challans.slice(0, 5).map(ch => (
              <div key={ch.id} onClick={() => { setSelectedId(ch.id); setView("challan-detail"); }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={13} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 font-mono">{ch.number}</p>
                  <p className="text-xs text-slate-500 truncate">{ch.customerBusiness}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(ch.totalAmount)}</p>
                  <Badge label={ch.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-500" /> Low Stock Alerts
            </h3>
            <button onClick={() => setView("products")} className="text-xs text-blue-600 hover:underline font-medium">View products</button>
          </div>
          {stats.lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Check size={22} className="text-emerald-400" />
              <p className="text-sm">All products well-stocked</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.lowStockItems.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                    <AlertTriangle size={13} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs font-mono text-slate-500">{p.sku} · {p.warehouseLocation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">{p.currentStock} units</p>
                    <p className="text-xs text-slate-400">min: {p.minStockAlert}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Recent Stock Movements</h3>
          <button onClick={() => setView("stock-movements")} className="text-xs text-blue-600 hover:underline font-medium">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockMovements.slice(0, 5).map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{m.productName}</p>
                    <p className="text-xs font-mono text-slate-400">{m.productSku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border",
                      m.type === "IN" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                      {m.type === "IN" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    <span className={m.type === "IN" ? "text-emerald-600" : "text-red-600"}>
                      {m.type === "IN" ? "+" : "−"}{m.qtyChanged}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-xs">{m.reason}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{m.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER FORM MODAL
// ═══════════════════════════════════════════════════════════════

function CustomerFormModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const { addCustomer, updateCustomer, showToast } = useApp();
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    mobile: customer?.mobile ?? "",
    email: customer?.email ?? "",
    businessName: customer?.businessName ?? "",
    gst: customer?.gst ?? "",
    type: (customer?.type ?? "Retail") as CustomerType,
    address: customer?.address ?? "",
    status: (customer?.status ?? "Lead") as CustomerStatus,
    followUpDate: customer?.followUpDate ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = "Enter valid 10-digit mobile number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter valid email address";
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (form.gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gst))
      e.gst = "Invalid GST format (e.g. 27AABCP1234F1Z5)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (customer) {
      updateCustomer(customer.id, form);
      showToast("Customer updated successfully", "success");
    } else {
      addCustomer(form);
      showToast("Customer added successfully", "success");
    }
    onClose();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
    setErrors(prev => ({ ...prev, [k]: "" }));
  };

  return (
    <Modal title={customer ? "Edit Customer" : "Add New Customer"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Contact Name *" value={form.name} onChange={set("name")} error={errors.name} placeholder="Full name" />
          <Input label="Mobile *" value={form.mobile} onChange={set("mobile")} error={errors.mobile} placeholder="10-digit number" maxLength={10} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email *" type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="email@company.com" />
          <Input label="Business Name *" value={form.businessName} onChange={set("businessName")} error={errors.businessName} placeholder="Registered business name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="GST Number (Optional)" value={form.gst} onChange={set("gst")} error={errors.gst} placeholder="27AABCP1234F1Z5" />
          <Select label="Customer Type" value={form.type} onChange={set("type")}>
            <option>Retail</option><option>Wholesale</option><option>Distributor</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Status" value={form.status} onChange={set("status")}>
            <option>Lead</option><option>Active</option><option>Inactive</option>
          </Select>
          <Input label="Follow-up Date" type="date" value={form.followUpDate} onChange={set("followUpDate")} />
        </div>
        <Textarea label="Address *" value={form.address} onChange={set("address")} error={errors.address} placeholder="Street, City, State, PIN" rows={2} />
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{customer ? "Save Changes" : "Add Customer"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS PAGE
// ═══════════════════════════════════════════════════════════════

function CustomersPage() {
  const { customers, setView, setSelectedId } = useApp();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();
  const PAGE_SIZE = 8;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c => {
      const ms = !q || c.name.toLowerCase().includes(q) || c.businessName.toLowerCase().includes(q) || c.mobile.includes(q) || c.email.toLowerCase().includes(q);
      return ms && (!typeFilter || c.type === typeFilter) && (!statusFilter || c.status === statusFilter);
    });
  }, [customers, search, typeFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [search, typeFilter, statusFilter]);

  const canEdit = user?.role === "Admin" || user?.role === "Sales";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, business, mobile, email..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[130px]">
          <option value="">All Types</option>
          <option>Retail</option><option>Wholesale</option><option>Distributor</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[130px]">
          <option value="">All Status</option>
          <option>Lead</option><option>Active</option><option>Inactive</option>
        </select>
        {canEdit && <Button icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Add Customer</Button>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Customer", "Business", "Type", "Status", "Follow-up", ""].map(h => (
                  <th key={h} className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide", h === "" ? "" : "text-left")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-14 text-slate-400">No customers match your filters</td></tr>
              ) : paginated.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={9} />{c.mobile}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{c.businessName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={9} />{c.email}</p>
                  </td>
                  <td className="px-4 py-3"><Badge label={c.type} /></td>
                  <td className="px-4 py-3"><Badge label={c.status} /></td>
                  <td className="px-4 py-3">
                    {c.followUpDate
                      ? <span className="text-xs text-slate-600 flex items-center gap-1"><Calendar size={10} className="text-slate-400" />{formatDate(c.followUpDate)}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => { setSelectedId(c.id); setView("customer-detail"); }}>View</Button>
                      {canEdit && <Button size="sm" variant="ghost" icon={<Edit2 size={12} />} onClick={() => setEditCustomer(c)}>Edit</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>

      {showAdd && <CustomerFormModal onClose={() => setShowAdd(false)} />}
      {editCustomer && <CustomerFormModal customer={editCustomer} onClose={() => setEditCustomer(undefined)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER DETAIL PAGE
// ═══════════════════════════════════════════════════════════════

function CustomerDetailPage() {
  const { customers, challans, selectedId, setView, addCustomerNote, showToast } = useApp();
  const { user } = useAuth();
  const [noteText, setNoteText] = useState("");
  const [editModal, setEditModal] = useState(false);

  const customer = customers.find(c => c.id === selectedId);
  const customerChallans = challans.filter(c => c.customerId === selectedId);
  const canEdit = user?.role === "Admin" || user?.role === "Sales";

  if (!customer) return (
    <div className="p-6 flex flex-col items-center gap-4 pt-20">
      <p className="text-slate-400">Customer not found.</p>
      <Button variant="outline" onClick={() => setView("customers")}>Back to Customers</Button>
    </div>
  );

  const handleAddNote = () => {
    if (!noteText.trim() || !user) return;
    addCustomerNote(customer.id, noteText.trim(), user.name);
    setNoteText("");
    showToast("Note added", "success");
  };

  return (
    <div className="p-6 space-y-5">
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => setView("customers")}>Back to Customers</Button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
                <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1"><Building2 size={12} />{customer.businessName}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Badge label={customer.status} /><Badge label={customer.type} />
                {canEdit && <Button size="sm" variant="outline" icon={<Edit2 size={12} />} onClick={() => setEditModal(true)}>Edit</Button>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600"><Phone size={13} className="text-slate-400 shrink-0" />{customer.mobile}</div>
              <div className="flex items-center gap-2 text-slate-600"><Mail size={13} className="text-slate-400 shrink-0" />{customer.email}</div>
              <div className="flex items-start gap-2 text-slate-600 sm:col-span-2"><MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />{customer.address}</div>
              {customer.gst && (
                <div className="flex items-center gap-2 text-slate-600"><Hash size={13} className="text-slate-400 shrink-0" /><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{customer.gst}</span></div>
              )}
              {customer.followUpDate && (
                <div className="flex items-center gap-2 text-slate-600"><Calendar size={13} className="text-slate-400 shrink-0" />Follow-up: {formatDate(customer.followUpDate)}</div>
              )}
              <div className="flex items-center gap-2 text-slate-600"><Clock size={13} className="text-slate-400 shrink-0" />Customer since {formatDate(customer.createdAt)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Challans ({customerChallans.length})</h3>
            </div>
            {customerChallans.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm">No challans for this customer</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {customerChallans.map(ch => (
                  <div key={ch.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-slate-900">{ch.number}</p>
                      <p className="text-xs text-slate-500">{formatDate(ch.createdDate)} · {ch.items.length} items · {ch.totalQty} units</p>
                    </div>
                    <p className="font-bold text-slate-900">{formatCurrency(ch.totalAmount)}</p>
                    <Badge label={ch.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ maxHeight: "600px" }}>
          <div className="px-5 py-3.5 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><MessageSquare size={13} />Follow-up Notes ({customer.notes.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {customer.notes.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">No notes yet</div>
            ) : (
              [...customer.notes].reverse().map((note, i) => (
                <div key={i} className="px-5 py-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{note.text}</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">{note.by} · {note.at}</p>
                </div>
              ))
            )}
          </div>
          {canEdit && (
            <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
              <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a follow-up note..." rows={3} />
              <Button className="w-full justify-center" onClick={handleAddNote} disabled={!noteText.trim()}>Add Note</Button>
            </div>
          )}
        </div>
      </div>

      {editModal && <CustomerFormModal customer={customer} onClose={() => setEditModal(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT FORM MODAL
// ═══════════════════════════════════════════════════════════════

function ProductFormModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { addProduct, updateProduct, showToast } = useApp();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ?? "",
    unitPrice: product?.unitPrice?.toString() ?? "",
    currentStock: product?.currentStock?.toString() ?? "0",
    minStockAlert: product?.minStockAlert?.toString() ?? "10",
    warehouseLocation: product?.warehouseLocation ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.sku.trim()) e.sku = "Required";
    if (!form.category.trim()) e.category = "Required";
    if (!form.unitPrice || isNaN(+form.unitPrice) || +form.unitPrice <= 0) e.unitPrice = "Enter valid price";
    if (form.currentStock === "" || isNaN(+form.currentStock) || +form.currentStock < 0) e.currentStock = "Enter valid stock";
    if (!form.warehouseLocation.trim()) e.warehouseLocation = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      unitPrice: parseFloat(form.unitPrice),
      currentStock: parseInt(form.currentStock, 10),
      minStockAlert: parseInt(form.minStockAlert, 10) || 10,
      warehouseLocation: form.warehouseLocation.trim().toUpperCase(),
    };
    if (product) {
      updateProduct(product.id, data);
      showToast("Product updated", "success");
    } else {
      addProduct(data);
      showToast("Product added", "success");
    }
    onClose();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
    setErrors(prev => ({ ...prev, [k]: "" }));
  };

  return (
    <Modal title={product ? "Edit Product" : "Add New Product"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input label="Product Name *" value={form.name} onChange={set("name")} error={errors.name} placeholder="Basmati Rice Premium 25kg" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="SKU *" value={form.sku} onChange={set("sku")} error={errors.sku} placeholder="RICE-BAS-25K" />
          <Input label="Category *" value={form.category} onChange={set("category")} error={errors.category} placeholder="Grains & Cereals" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Unit Price ₹ *" value={form.unitPrice} onChange={set("unitPrice")} error={errors.unitPrice} type="number" min="0" step="0.01" placeholder="0.00" />
          <Input label="Warehouse Location *" value={form.warehouseLocation} onChange={set("warehouseLocation")} error={errors.warehouseLocation} placeholder="A-01-R1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Current Stock *" value={form.currentStock} onChange={set("currentStock")} error={errors.currentStock} type="number" min="0" placeholder="0" />
          <Input label="Min Stock Alert" value={form.minStockAlert} onChange={set("minStockAlert")} type="number" min="0" placeholder="10" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{product ? "Save Changes" : "Add Product"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// STOCK UPDATE MODAL
// ═══════════════════════════════════════════════════════════════

function StockUpdateModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { updateStock, showToast } = useApp();
  const { user } = useAuth();
  const [type, setType] = useState<MovementType>("IN");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = parseInt(qty, 10);
    if (!qty || isNaN(q) || q <= 0) { setError("Enter a valid quantity greater than 0"); return; }
    if (!reason.trim()) { setError("Reason is required"); return; }
    if (type === "OUT" && q > product.currentStock) {
      setError(`Cannot deduct ${q} units — only ${product.currentStock} available in stock`);
      return;
    }
    updateStock(product.id, q, type, reason.trim(), user?.name ?? "System");
    showToast(`${type === "IN" ? "Added" : "Deducted"} ${q} units for ${product.name}`, "success");
    onClose();
  };

  return (
    <Modal title="Update Stock" onClose={onClose} width="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">{product.name}</p>
          <p className="text-xs font-mono text-slate-500 mt-0.5">{product.sku} · {product.warehouseLocation}</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-slate-500">Current Stock:</span>
            <span className={cn("font-bold text-base", product.currentStock <= product.minStockAlert ? "text-red-600" : "text-emerald-600")}>
              {product.currentStock} units
            </span>
            <span className="text-slate-400 text-xs">min: {product.minStockAlert}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setType("IN"); setError(""); }}
            className={cn("py-2.5 rounded-lg text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2",
              type === "IN" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300")}>
            <ArrowUp size={14} />Stock IN
          </button>
          <button type="button" onClick={() => { setType("OUT"); setError(""); }}
            className={cn("py-2.5 rounded-lg text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2",
              type === "OUT" ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-600 border-slate-200 hover:border-red-300")}>
            <ArrowDown size={14} />Stock OUT
          </button>
        </div>

        <Input label="Quantity *" value={qty} onChange={e => { setQty(e.target.value); setError(""); }} type="number" min="1" placeholder="Enter quantity" />
        <Input label="Reason *" value={reason} onChange={e => { setReason(e.target.value); setError(""); }} placeholder="e.g. Purchase Order #PO-2026-044" />
        {error && <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 p-2.5 rounded-lg border border-red-200"><AlertTriangle size={12} />{error}</p>}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={type === "OUT" ? "danger" : "primary"}>
            {type === "IN" ? "Add to Stock" : "Deduct from Stock"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS PAGE
// ═══════════════════════════════════════════════════════════════

function ProductsPage() {
  const { products } = useApp();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [stockProduct, setStockProduct] = useState<Product | undefined>();
  const PAGE_SIZE = 8;

  const categories = useMemo(() => [...new Set(products.map(p => p.category))].sort(), [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      const ms = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return ms && (!catFilter || p.category === catFilter);
    });
  }, [products, search, catFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [search, catFilter]);

  const canEdit = user?.role === "Admin" || user?.role === "Warehouse";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or category..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[150px]">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        {canEdit && <Button icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Add Product</Button>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-14 text-slate-400">No products match your search</td></tr>
              ) : paginated.map(p => {
                const isLow = p.currentStock <= p.minStockAlert;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{formatCurrency(p.unitPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-mono font-bold text-base", isLow ? "text-red-600" : "text-emerald-600")}>{p.currentStock}</span>
                      {isLow && <span className="ml-2 text-xs text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-medium">Low</span>}
                      <p className="text-xs text-slate-400 mt-0.5">min: {p.minStockAlert}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600 bg-slate-50/50">{p.warehouseLocation}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="ghost" icon={<RefreshCw size={12} />} onClick={() => setStockProduct(p)}>Stock</Button>
                          <Button size="sm" variant="ghost" icon={<Edit2 size={12} />} onClick={() => setEditProduct(p)}>Edit</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>

      {showAdd && <ProductFormModal onClose={() => setShowAdd(false)} />}
      {editProduct && <ProductFormModal product={editProduct} onClose={() => setEditProduct(undefined)} />}
      {stockProduct && <StockUpdateModal product={stockProduct} onClose={() => setStockProduct(undefined)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE CHALLAN PAGE
// ═══════════════════════════════════════════════════════════════

function CreateChallanPage() {
  const { customers, products, addChallan, showToast, setView } = useApp();
  const { user } = useAuth();
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDropOpen, setCustomerDropOpen] = useState(false);
  const [items, setItems] = useState<ChallanItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productDropOpen, setProductDropOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.filter(c => c.status !== "Inactive").slice(0, 6);
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.status !== "Inactive" && (c.name.toLowerCase().includes(q) || c.businessName.toLowerCase().includes(q))).slice(0, 6);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 6);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 6);
  }, [products, productSearch]);

  const addItem = (product: Product) => {
    if (items.find(i => i.productId === product.id)) return;
    setItems(prev => [...prev, { productId: product.id, productName: product.name, sku: product.sku, unitPrice: product.unitPrice, qty: 1, subtotal: product.unitPrice }]);
    setProductSearch("");
    setProductDropOpen(false);
  };

  const updateQty = (productId: string, rawQty: string) => {
    const q = Math.max(1, parseInt(rawQty, 10) || 1);
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: q, subtotal: i.unitPrice * q } : i));
  };

  const removeItem = (productId: string) => setItems(prev => prev.filter(i => i.productId !== productId));

  const totals = useMemo(() => ({
    qty: items.reduce((s, i) => s + i.qty, 0),
    amount: items.reduce((s, i) => s + i.subtotal, 0),
  }), [items]);

  const handleSave = (confirm: boolean) => {
    const errs: string[] = [];
    if (!selectedCustomer) errs.push("Please select a customer");
    if (items.length === 0) errs.push("Add at least one product");
    if (errs.length > 0) { setErrors(errs); return; }

    const result = addChallan({
      customerId: selectedCustomer!.id,
      customerName: selectedCustomer!.name,
      customerBusiness: selectedCustomer!.businessName,
      items,
      totalQty: totals.qty,
      totalAmount: totals.amount,
      status: "Draft",
      createdBy: user?.name ?? "Unknown",
      createdDate: new Date().toISOString().slice(0, 10),
    }, confirm);

    if (result.success) {
      showToast(result.message, "success");
      setView("challans");
    } else {
      setErrors(result.errors ?? [result.message]);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => setView("challans")}>Back to Challans</Button>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle size={12} />Validation Errors</p>
          {errors.map((e, i) => <p key={i} className="text-sm text-red-700 pl-4">• {e}</p>)}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Select Customer</h3>
        {selectedCustomer ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div>
              <p className="font-semibold text-slate-900">{selectedCustomer.name}</p>
              <p className="text-sm text-slate-500">{selectedCustomer.businessName}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={selectedCustomer.type} />
              <Button size="sm" variant="ghost" icon={<X size={12} />} onClick={() => setSelectedCustomer(null)}>Change</Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setCustomerDropOpen(true); }}
                onFocus={() => setCustomerDropOpen(true)}
                onBlur={() => setTimeout(() => setCustomerDropOpen(false), 150)}
                placeholder="Search by customer name or business..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            {customerDropOpen && filteredCustomers.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                {filteredCustomers.map(c => (
                  <div key={c.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
                    onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(""); setCustomerDropOpen(false); }}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.businessName}</p>
                    </div>
                    <div className="flex items-center gap-2"><Badge label={c.status} /><Badge label={c.type} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Add Products</h3>

        <div className="relative mb-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setProductDropOpen(true); }}
              onFocus={() => setProductDropOpen(true)}
              onBlur={() => setTimeout(() => setProductDropOpen(false), 150)}
              placeholder="Search products by name or SKU..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          {productDropOpen && filteredProducts.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
              {filteredProducts.map(p => {
                const added = items.some(i => i.productId === p.id);
                const isLow = p.currentStock <= p.minStockAlert;
                return (
                  <div key={p.id}
                    className={cn("flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 transition-colors",
                      added ? "opacity-50 cursor-default bg-slate-50" : "hover:bg-slate-50 cursor-pointer")}
                    onMouseDown={() => !added && addItem(p)}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs font-mono text-slate-500">{p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(p.unitPrice)}</p>
                      <p className={cn("text-xs font-mono", isLow ? "text-red-500" : "text-slate-400")}>
                        {added ? "Added" : `Stock: ${p.currentStock}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
            <Package size={24} className="mx-auto mb-2 text-slate-300" />
            Search and select products above
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                  <th className="text-right pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                  <th className="text-center pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Qty</th>
                  <th className="text-right pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subtotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const prod = products.find(p => p.id === item.productId);
                  const stockOk = prod ? prod.currentStock >= item.qty : false;
                  return (
                    <tr key={item.productId} className={cn(!stockOk && prod ? "bg-red-50/50" : "")}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{item.productName}</p>
                        <p className="text-xs font-mono text-slate-400">{item.sku}</p>
                        {prod && !stockOk && (
                          <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                            <AlertTriangle size={10} />Stock: {prod.currentStock} — insufficient
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-center">
                        <input type="number" min="1" value={item.qty}
                          onChange={e => updateQty(item.productId, e.target.value)}
                          className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono" />
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                      <td className="py-3 pl-3">
                        <button onClick={() => removeItem(item.productId)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={2} className="pt-4 text-sm text-slate-500 font-medium">{totals.qty} total units</td>
                  <td colSpan={2} className="pt-4 text-right font-bold text-slate-900 text-xl">{formatCurrency(totals.amount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => setView("challans")}>Cancel</Button>
        <Button variant="secondary" icon={<FileText size={14} />} onClick={() => handleSave(false)}>Save as Draft</Button>
        <Button icon={<Check size={14} />} onClick={() => handleSave(true)}>Confirm & Deduct Stock</Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHALLAN DETAIL PAGE
// ═══════════════════════════════════════════════════════════════

function ChallanDetailPage() {
  const { challans, selectedId, setView, updateChallanStatus, showToast } = useApp();
  const { user } = useAuth();
  const [confirmErrors, setConfirmErrors] = useState<string[]>([]);

  const challan = challans.find(c => c.id === selectedId);

  if (!challan) return (
    <div className="p-6 flex flex-col items-center gap-4 pt-20">
      <p className="text-slate-400">Challan not found.</p>
      <Button variant="outline" onClick={() => setView("challans")}>Back to Challans</Button>
    </div>
  );

  const canConfirm = challan.status === "Draft" && (user?.role === "Admin" || user?.role === "Sales");
  const canCancel = challan.status !== "Cancelled" && user?.role === "Admin";

  const handleStatus = (status: ChallanStatus) => {
    const result = updateChallanStatus(challan.id, status, user?.name ?? "");
    if (result.success) {
      showToast(result.message, "success");
      setConfirmErrors([]);
    } else {
      setConfirmErrors(result.errors ?? [result.message]);
    }
  };

  const statusIconMap = {
    Draft: <FileText size={14} className="text-blue-500" />,
    Confirmed: <Check size={14} className="text-emerald-500" />,
    Cancelled: <X size={14} className="text-red-500" />,
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => setView("challans")}>Back to Challans</Button>

      {confirmErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle size={12} />Stock Error</p>
          {confirmErrors.map((e, i) => <p key={i} className="text-sm text-red-700 pl-4">• {e}</p>)}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sales Challan</p>
              <h2 className="text-3xl font-bold font-mono text-slate-900 mt-1">{challan.number}</h2>
              <p className="text-sm text-slate-500 mt-1.5">
                {formatDate(challan.createdDate)} · Created by <span className="font-medium text-slate-700">{challan.createdBy}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {statusIconMap[challan.status]}
                <Badge label={challan.status} />
              </div>
              {canConfirm && (
                <Button size="sm" icon={<Check size={13} />} onClick={() => handleStatus("Confirmed")}>Confirm Challan</Button>
              )}
              {canCancel && challan.status !== "Cancelled" && (
                <Button size="sm" variant="danger" icon={<X size={13} />} onClick={() => handleStatus("Cancelled")}>Cancel</Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-bold text-slate-900">{challan.customerName}</p>
            <p className="text-sm text-slate-500">{challan.customerBusiness}</p>
          </div>

          {challan.status === "Confirmed" && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-4 py-2.5 rounded-lg mb-5 flex items-center gap-2">
              <Check size={13} />
              Stock has been deducted for all items in this challan
            </div>
          )}
          {challan.status === "Cancelled" && (
            <div className="bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium px-4 py-2.5 rounded-lg mb-5 flex items-center gap-2">
              <X size={13} />
              This challan has been cancelled. Stock has been restored if previously confirmed.
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-right pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                <th className="text-right pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {challan.items.map((item, idx) => (
                <tr key={item.productId}>
                  <td className="py-3.5 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="py-3.5">
                    <p className="font-semibold text-slate-900">{item.productName}</p>
                    <p className="text-xs font-mono text-slate-400">{item.sku}</p>
                  </td>
                  <td className="py-3.5 text-right font-mono text-slate-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3.5 text-right font-mono font-bold text-slate-900">{item.qty}</td>
                  <td className="py-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td colSpan={3} className="pt-5 text-sm text-slate-500">
                  {challan.items.length} line item{challan.items.length !== 1 ? "s" : ""} · {challan.totalQty} total units
                </td>
                <td className="pt-5 text-right text-slate-500 text-sm">Total</td>
                <td className="pt-5 text-right font-bold text-slate-900 text-2xl font-mono">{formatCurrency(challan.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHALLANS PAGE
// ═══════════════════════════════════════════════════════════════

function ChallansPage() {
  const { challans, setView, setSelectedId } = useApp();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return challans.filter(c => {
      const ms = !q || c.number.toLowerCase().includes(q) || c.customerName.toLowerCase().includes(q) || c.customerBusiness.toLowerCase().includes(q);
      return ms && (!statusFilter || c.status === statusFilter);
    });
  }, [challans, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [search, statusFilter]);

  const canCreate = user?.role === "Admin" || user?.role === "Sales";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by challan number or customer..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[130px]">
          <option value="">All Status</option>
          <option>Draft</option><option>Confirmed</option><option>Cancelled</option>
        </select>
        {canCreate && <Button icon={<Plus size={14} />} onClick={() => setView("create-challan")}>New Challan</Button>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Challan #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-14 text-slate-400">No challans found</td></tr>
              ) : paginated.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">{c.number}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{c.customerName}</p>
                    <p className="text-xs text-slate-500">{c.customerBusiness}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{c.items.length}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{c.totalQty}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(c.totalAmount)}</td>
                  <td className="px-4 py-3"><Badge label={c.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(c.createdDate)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => { setSelectedId(c.id); setView("challan-detail"); }}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STOCK MOVEMENTS PAGE
// ═══════════════════════════════════════════════════════════════

function StockMovementsPage() {
  const { stockMovements } = useApp();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stockMovements.filter(m => {
      const ms = !q || m.productName.toLowerCase().includes(q) || m.productSku.toLowerCase().includes(q) || m.reason.toLowerCase().includes(q) || m.createdBy.toLowerCase().includes(q);
      return ms && (!typeFilter || m.type === typeFilter);
    });
  }, [stockMovements, search, typeFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [search, typeFilter]);

  const totals = useMemo(() => ({
    in: filtered.filter(m => m.type === "IN").reduce((s, m) => s + m.qtyChanged, 0),
    out: filtered.filter(m => m.type === "OUT").reduce((s, m) => s + m.qtyChanged, 0),
  }), [filtered]);

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Total IN</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{totals.in}</p>
          <p className="text-xs text-emerald-500 mt-0.5">units received</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Total OUT</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{totals.out}</p>
          <p className="text-xs text-red-500 mt-0.5">units dispatched</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by product, SKU, reason, or person..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[150px]">
          <option value="">All Movements</option>
          <option value="IN">Stock IN only</option>
          <option value="OUT">Stock OUT only</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-14 text-slate-400">No movements match your search</td></tr>
              ) : paginated.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{m.productName}</p>
                    <p className="text-xs font-mono text-slate-400">{m.productSku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border",
                      m.type === "IN" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                      {m.type === "IN" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("font-mono font-bold text-lg", m.type === "IN" ? "text-emerald-600" : "text-red-600")}>
                      {m.type === "IN" ? "+" : "−"}{m.qtyChanged}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">
                    <p className="truncate text-xs">{m.reason}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{m.createdBy}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono whitespace-nowrap">{m.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message || "Invalid email or password");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check credentials.");
      setLoading(false);
    }
  };

  const demos = [
    { email: "admin@distroerp.com", password: "admin123", role: "Admin" as Role, desc: "Full access" },
    { email: "sales@distroerp.com", password: "sales123", role: "Sales" as Role, desc: "Customers & Challans" },
    { email: "warehouse@distroerp.com", password: "warehouse123", role: "Warehouse" as Role, desc: "Products & Stock" },
    { email: "accounts@distroerp.com", password: "accounts123", role: "Accounts" as Role, desc: "Challans only" },
  ];

  const roleColors: Record<Role, string> = {
    Admin: "text-violet-600", Sales: "text-blue-600",
    Warehouse: "text-amber-600", Accounts: "text-emerald-600",
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">DistroERP</p>
            <p className="text-slate-500 text-xs mt-0.5">v2.0 · Distribution Suite</p>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            Wholesale<br />Distribution<br />Management
          </h1>
          <p className="text-slate-400 mt-5 text-base leading-relaxed max-w-xs">
            One platform for your customers, inventory, sales challans, and stock movements.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: <Users size={14} />, label: "CRM", sub: "Customer management" },
              { icon: <Package size={14} />, label: "Inventory", sub: "Products & stock" },
              { icon: <FileText size={14} />, label: "Challans", sub: "Sales orders" },
              { icon: <Activity size={14} />, label: "Movements", sub: "Stock log" },
            ].map(item => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-blue-400 mb-2">{item.icon}</div>
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-700 text-xs">DistroERP · Wholesale Distribution Platform</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <p className="font-bold text-slate-900">DistroERP</p>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="text-slate-500 text-sm mt-1">Access your distribution dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" />
            <Input label="Password" type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="••••••••" />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                <AlertTriangle size={13} />{error}
              </div>
            )}
            <Button className="w-full justify-center" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Demo Accounts — click to fill</p>
            </div>
            <div className="divide-y divide-slate-100">
              {demos.map(acc => (
                <button key={acc.role} type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); setError(""); }}>
                  <div>
                    <p className="text-sm text-slate-700 font-medium">{acc.email}</p>
                    <p className="text-xs text-slate-400">{acc.desc}</p>
                  </div>
                  <span className={cn("text-xs font-bold", roleColors[acc.role])}>{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP LAYOUT + ROOT
// ═══════════════════════════════════════════════════════════════

function AppLayout() {
  const { currentView } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const renderPage = () => {
    switch (currentView) {
      case "dashboard": return <DashboardPage />;
      case "customers": return <CustomersPage />;
      case "customer-detail": return <CustomerDetailPage />;
      case "products": return <ProductsPage />;
      case "challans": return <ChallansPage />;
      case "challan-detail": return <ChallanDetailPage />;
      case "create-challan": return <CreateChallanPage />;
      case "stock-movements": return <StockMovementsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

function AuthGate() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
