import { z } from "zod";
import { sqliteTable, text, integer, real, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * SQLITE TABLE DEFINITIONS WITH DRIZZLE ORM
 * Converted from PostgreSQL schema for desktop application
 * Includes TypeScript interfaces and Zod schemas for compatibility
 */

// ====================================
// SQLITE TABLE DEFINITIONS
// ====================================

// Helper function for UUID generation
const generateUUID = () => randomUUID();

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  username: text("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email", { length: 255 }),
  role: text("role").notNull().default("user"),
  subscriptionType: text("subscription_type").notNull().default("free"),
  monthlyInvoiceLimit: integer("monthly_invoice_limit").notNull().default(50),
  expirationDate: integer("expiration_date", { mode: "timestamp" }),
  currentMonthInvoices: integer("current_month_invoices").notNull().default(0),
  usageResetDate: integer("usage_reset_date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isBlocked: integer("is_blocked", { mode: "boolean" }).notNull().default(false),
  lastLogin: integer("last_login", { mode: "timestamp" }),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lastFailedLogin: integer("last_failed_login", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdBy: text("created_by", { length: 36 })
}, (table) => ({
  roleCheck: check("role_check", sql`${table.role} IN ('admin', 'user', 'readonly')`),
  subscriptionTypeCheck: check("subscription_type_check", sql`${table.subscriptionType} IN ('free', 'basic', 'premium', 'enterprise')`)
}));

// Company configs table
export const companyConfigs = sqliteTable("company_configs", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  ruc: text("ruc", { length: 50 }).notNull(),
  razonSocial: text("razon_social").notNull(),
  nombreFantasia: text("nombre_fantasia"),
  timbradoNumero: text("timbrado_numero", { length: 50 }).notNull(),
  timbradoDesde: text("timbrado_desde", { length: 10 }).notNull(),
  timbradoHasta: text("timbrado_hasta", { length: 10 }).notNull(),
  establecimiento: text("establecimiento", { length: 10 }).notNull().default("001"),
  puntoExpedicion: text("punto_expedicion", { length: 10 }).notNull().default("001"),
  direccion: text("direccion").notNull(),
  ciudad: text("ciudad", { length: 255 }).notNull().default("Asunción"),
  telefono: text("telefono", { length: 50 }),
  email: text("email", { length: 255 }),
  logoPath: text("logo_path"),
  moneda: text("moneda", { length: 10 }).notNull().default("GS"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

// DNIT configs table
export const dnitConfigs = sqliteTable("dnit_configs", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  endpointUrl: text("endpoint_url").notNull(),
  authToken: text("auth_token").notNull(),
  certificateData: text("certificate_data"),
  certificatePassword: text("certificate_password"),
  operationMode: text("operation_mode").notNull().default("testing"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  lastConnectionTest: integer("last_connection_test", { mode: "timestamp" }),
  lastConnectionStatus: text("last_connection_status"),
  lastConnectionError: text("last_connection_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  operationModeCheck: check("operation_mode_check", sql`${table.operationMode} IN ('testing', 'production')`)
}));

// Categories table
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  nombre: text("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  tipo: text("tipo").notNull().default("ambos"),
  color: text("color", { length: 7 }),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  tipoCheck: check("tipo_check", sql`${table.tipo} IN ('servicios', 'productos', 'ambos')`)
}));

// Customers table
export const customers = sqliteTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  nombre: text("nombre", { length: 255 }).notNull(),
  docTipo: text("doc_tipo").notNull().default("CI"),
  docNumero: text("doc_numero", { length: 50 }).notNull(),
  email: text("email", { length: 255 }),
  telefono: text("telefono", { length: 50 }),
  direccion: text("direccion"),
  regimenTurismo: integer("regimen_turismo", { mode: "boolean" }).notNull().default(false),
  pais: text("pais", { length: 100 }),
  pasaporte: text("pasaporte", { length: 50 }),
  fechaIngreso: text("fecha_ingreso", { length: 10 }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  docTipoCheck: check("doc_tipo_check", sql`${table.docTipo} IN ('CI', 'Pasaporte', 'RUC', 'Extranjero')`)
}));

// Vehicles table
export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  customerId: text("customer_id", { length: 36 }).notNull().references(() => customers.id),
  placa: text("placa", { length: 20 }).notNull(),
  marca: text("marca", { length: 50 }).notNull(),
  modelo: text("modelo", { length: 50 }).notNull(),
  color: text("color", { length: 30 }).notNull(),
  observaciones: text("observaciones"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

// Services table
export const services = sqliteTable("services", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  nombre: text("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  precio: text("precio").notNull(), // Store as text to maintain decimal precision
  duracionMin: integer("duracion_min").notNull(),
  categoria: text("categoria", { length: 255 }).notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

// Service combos table
export const serviceCombos = sqliteTable("service_combos", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  nombre: text("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  precioTotal: text("precio_total").notNull(), // Store as text to maintain decimal precision
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

// Service combo items table
export const serviceComboItems = sqliteTable("service_combo_items", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  comboId: text("combo_id", { length: 36 }).notNull().references(() => serviceCombos.id),
  serviceId: text("service_id", { length: 36 }).notNull().references(() => services.id)
});

// Work orders table
export const workOrders = sqliteTable("work_orders", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  numero: integer("numero").notNull().unique(),
  customerId: text("customer_id", { length: 36 }).notNull().references(() => customers.id),
  vehicleId: text("vehicle_id", { length: 36 }).notNull().references(() => vehicles.id),
  estado: text("estado").notNull().default("recibido"),
  fechaEntrada: integer("fecha_entrada", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  fechaInicio: integer("fecha_inicio", { mode: "timestamp" }),
  fechaFin: integer("fecha_fin", { mode: "timestamp" }),
  fechaEntrega: integer("fecha_entrega", { mode: "timestamp" }),
  observaciones: text("observaciones"),
  total: text("total").notNull().default("0"), // Store as text to maintain decimal precision
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  estadoCheck: check("estado_check", sql`${table.estado} IN ('recibido', 'en_proceso', 'terminado', 'entregado', 'cancelado')`)
}));

// Work order items table
export const workOrderItems = sqliteTable("work_order_items", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  workOrderId: text("work_order_id", { length: 36 }).notNull().references(() => workOrders.id),
  serviceId: text("service_id", { length: 36 }).references(() => services.id),
  comboId: text("combo_id", { length: 36 }).references(() => serviceCombos.id),
  nombre: text("nombre", { length: 255 }).notNull(),
  precio: text("precio").notNull(), // Store as text to maintain decimal precision
  cantidad: integer("cantidad").notNull().default(1)
});

// Inventory items table
export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  nombre: text("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  precio: text("precio").notNull(), // Store as text to maintain decimal precision
  stockActual: integer("stock_actual").notNull().default(0),
  stockMinimo: integer("stock_minimo").notNull().default(0),
  unidadMedida: text("unidad_medida", { length: 50 }).notNull().default("unidad"),
  categoria: text("categoria", { length: 255 }).notNull(),
  proveedor: text("proveedor", { length: 255 }),
  ultimoPedido: text("ultimo_pedido", { length: 255 }),
  estadoAlerta: text("estado_alerta").notNull().default("normal"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  estadoAlertaCheck: check("estado_alerta_check", sql`${table.estadoAlerta} IN ('normal', 'bajo', 'critico')`)
}));

// Sales table
export const sales = sqliteTable("sales", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  numeroFactura: text("numero_factura", { length: 50 }).notNull().unique(),
  customerId: text("customer_id", { length: 36 }).references(() => customers.id),
  workOrderId: text("work_order_id", { length: 36 }).references(() => workOrders.id),
  fecha: integer("fecha", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  subtotal: text("subtotal").notNull(), // Store as text to maintain decimal precision
  impuestos: text("impuestos").notNull().default("0"), // Store as text to maintain decimal precision
  total: text("total").notNull(), // Store as text to maintain decimal precision
  medioPago: text("medio_pago").notNull(),
  regimenTurismo: integer("regimen_turismo", { mode: "boolean" }).notNull().default(false),
  timbradoUsado: text("timbrado_usado", { length: 50 }).notNull(),
  createdBy: text("created_by", { length: 36 }).references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  medioPagoCheck: check("medio_pago_check", sql`${table.medioPago} IN ('efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'cheque')`)
}));

// Sale items table
export const saleItems = sqliteTable("sale_items", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  saleId: text("sale_id", { length: 36 }).notNull().references(() => sales.id),
  serviceId: text("service_id", { length: 36 }).references(() => services.id),
  comboId: text("combo_id", { length: 36 }).references(() => serviceCombos.id),
  inventoryItemId: text("inventory_item_id", { length: 36 }).references(() => inventoryItems.id),
  nombre: text("nombre", { length: 255 }).notNull(),
  cantidad: integer("cantidad").notNull().default(1),
  precioUnitario: text("precio_unitario").notNull(), // Store as text to maintain decimal precision
  subtotal: text("subtotal").notNull() // Store as text to maintain decimal precision
});

// ========================
// USER MANAGEMENT TYPES
// ========================

export interface User {
  id: string;
  username: string;
  password: string; // Hashed password
  
  // User information
  fullName: string | null;
  email: string | null;
  
  // Role-based access control
  role: "admin" | "user" | "readonly";
  
  // Subscription and usage limits
  subscriptionType: "free" | "basic" | "premium" | "enterprise";
  monthlyInvoiceLimit: number;
  expirationDate: Date | null; // null = never expires
  
  // Current usage tracking (resets monthly)
  currentMonthInvoices: number;
  usageResetDate: Date;
  
  // Account status
  isActive: boolean;
  isBlocked: boolean;
  
  // Authentication tracking
  lastLogin: Date | null;
  failedLoginAttempts: number;
  lastFailedLogin: Date | null;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null; // ID of user who created this account
}

export interface InsertUser {
  username: string;
  password: string; // Plain text - will be hashed by storage layer
  fullName?: string | null;
  email?: string | null;
  role?: "admin" | "user" | "readonly";
  subscriptionType?: "free" | "basic" | "premium" | "enterprise";
  monthlyInvoiceLimit?: number;
  expirationDate?: Date | null;
  isActive?: boolean;
  isBlocked?: boolean;
  createdBy?: string | null;
}

export interface InternalUpdateUser {
  username?: string;
  password?: string; // Plain text - will be hashed by storage layer
  fullName?: string | null;
  email?: string | null;
  role?: "admin" | "user" | "readonly";
  subscriptionType?: "free" | "basic" | "premium" | "enterprise";
  monthlyInvoiceLimit?: number;
  expirationDate?: Date | null;
  currentMonthInvoices?: number;
  usageResetDate?: Date;
  isActive?: boolean;
  isBlocked?: boolean;
  lastLogin?: Date | null;
  failedLoginAttempts?: number;
  lastFailedLogin?: Date | null;
  updatedAt?: Date;
}

// ========================
// COMPANY CONFIG TYPES
// ========================

export interface CompanyConfig {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreFantasia: string | null;
  timbradoNumero: string;
  timbradoDesde: string;
  timbradoHasta: string;
  establecimiento: string;
  puntoExpedicion: string;
  direccion: string;
  ciudad: string;
  telefono: string | null;
  email: string | null;
  logoPath: string | null;
  moneda: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertCompanyConfig {
  ruc: string;
  razonSocial: string;
  nombreFantasia?: string | null;
  timbradoNumero: string;
  timbradoDesde: string;
  timbradoHasta: string;
  establecimiento?: string;
  puntoExpedicion?: string;
  direccion: string;
  ciudad?: string;
  telefono?: string | null;
  email?: string | null;
  logoPath?: string | null;
  moneda?: string;
}

// ========================
// DNIT CONFIG TYPES
// ========================

export interface DnitConfig {
  id: string;
  endpointUrl: string;
  authToken: string; // Encrypted in storage
  certificateData: string | null;
  certificatePassword: string | null; // Encrypted in storage
  operationMode: "testing" | "production";
  isActive: boolean;
  lastConnectionTest: Date | null;
  lastConnectionStatus: string | null;
  lastConnectionError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertDnitConfig {
  endpointUrl: string;
  authToken: string;
  certificateData?: string | null;
  certificatePassword?: string | null;
  operationMode?: "testing" | "production";
  isActive?: boolean;
}

export interface UpdateDnitConfig {
  endpointUrl?: string;
  authToken?: string;
  certificateData?: string | null;
  certificatePassword?: string | null;
  operationMode?: "testing" | "production";
  isActive?: boolean;
  lastConnectionTest?: Date | null;
  lastConnectionStatus?: string | null;
  lastConnectionError?: string | null;
}

// ========================
// CATEGORY TYPES
// ========================

export interface Category {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: "servicios" | "productos" | "ambos";
  color: string | null; // Color hex para UI
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertCategory {
  nombre: string;
  descripcion?: string | null;
  tipo?: "servicios" | "productos" | "ambos";
  color?: string | null;
  activa?: boolean;
}

// ========================
// CUSTOMER TYPES
// ========================

export interface Customer {
  id: string;
  nombre: string;
  docTipo: "CI" | "Pasaporte" | "RUC" | "Extranjero";
  docNumero: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  regimenTurismo: boolean;
  pais: string | null;
  pasaporte: string | null;
  fechaIngreso: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertCustomer {
  nombre: string;
  docTipo?: "CI" | "Pasaporte" | "RUC" | "Extranjero";
  docNumero: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  regimenTurismo?: boolean;
  pais?: string | null;
  pasaporte?: string | null;
  fechaIngreso?: string | null;
}

// ========================
// VEHICLE TYPES
// ========================

export interface Vehicle {
  id: string;
  customerId: string;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertVehicle {
  customerId: string;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  observaciones?: string | null;
}

// ========================
// SERVICE TYPES
// ========================

export interface Service {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: string; // Decimal as string for precision
  duracionMin: number;
  categoria: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertService {
  nombre: string;
  descripcion?: string | null;
  precio: string | number; // Accept both for flexibility
  duracionMin: number;
  categoria: string;
  activo?: boolean;
}

// ========================
// SERVICE COMBO TYPES
// ========================

export interface ServiceCombo {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioTotal: string; // Decimal as string for precision
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertServiceCombo {
  nombre: string;
  descripcion?: string | null;
  precioTotal: string | number; // Accept both for flexibility
  activo?: boolean;
}

export interface ServiceComboItem {
  id: string;
  comboId: string;
  serviceId: string;
}

export interface InsertServiceComboItem {
  comboId: string;
  serviceId: string;
}

// ========================
// WORK ORDER TYPES
// ========================

export interface WorkOrder {
  id: string;
  numero: number;
  customerId: string;
  vehicleId: string;
  estado: "recibido" | "en_proceso" | "terminado" | "entregado" | "cancelado";
  fechaEntrada: Date;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  fechaEntrega: Date | null;
  observaciones: string | null;
  total: string; // Decimal as string for precision
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertWorkOrder {
  customerId: string;
  vehicleId: string;
  estado?: "recibido" | "en_proceso" | "terminado" | "entregado" | "cancelado";
  fechaEntrada?: Date;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  fechaEntrega?: Date | null;
  observaciones?: string | null;
  total?: string;
}

export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  serviceId: string | null;
  comboId: string | null;
  nombre: string;
  precio: string; // Decimal as string for precision
  cantidad: number;
}

export interface InsertWorkOrderItem {
  workOrderId: string;
  serviceId?: string | null;
  comboId?: string | null;
  nombre: string;
  precio: string;
  cantidad: number;
}

// ========================
// INVENTORY TYPES
// ========================

export interface InventoryItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: string; // Precio de venta
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  categoria: string; // Agregado campo categoria
  proveedor: string | null;
  ultimoPedido: string | null;
  estadoAlerta: "normal" | "bajo" | "critico";
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertInventoryItem {
  nombre: string;
  descripcion?: string | null;
  precio: string | number; // Precio de venta
  stockActual: number;
  stockMinimo: number;
  unidadMedida?: string;
  categoria: string; // Campo categoria requerido
  proveedor?: string | null;
  ultimoPedido?: string | null;
  estadoAlerta?: "normal" | "bajo" | "critico";
  activo?: boolean;
}

// ========================
// SALES TYPES
// ========================

export interface Sale {
  id: string;
  numeroFactura: string;
  customerId: string | null;
  workOrderId: string | null;
  fecha: Date;
  subtotal: string; // Decimal as string for precision
  impuestos: string; // Decimal as string for precision
  total: string; // Decimal as string for precision
  medioPago: "efectivo" | "tarjeta_credito" | "tarjeta_debito" | "transferencia" | "cheque";
  regimenTurismo: boolean;
  timbradoUsado: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertSale {
  numeroFactura: string;
  customerId?: string | null;
  workOrderId?: string | null;
  fecha?: Date;
  subtotal: string;
  impuestos?: string;
  total: string;
  medioPago: "efectivo" | "tarjeta_credito" | "tarjeta_debito" | "transferencia" | "cheque";
  regimenTurismo?: boolean;
  timbradoUsado: string;
  createdBy?: string | null;
}

export interface SaleItem {
  id: string;
  saleId: string;
  serviceId: string | null;
  comboId: string | null;
  inventoryItemId: string | null;
  nombre: string;
  cantidad: number;
  precioUnitario: string; // Decimal as string for precision
  subtotal: string; // Decimal as string for precision
}

export interface InsertSaleItem {
  saleId: string;
  serviceId?: string | null;
  comboId?: string | null;
  inventoryItemId?: string | null;
  nombre: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
}

// ========================
// ZOD VALIDATION SCHEMAS
// ========================

// User schemas
export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  role: z.enum(["admin", "user", "readonly"]).optional(),
  subscriptionType: z.enum(["free", "basic", "premium", "enterprise"]).optional(),
  monthlyInvoiceLimit: z.number().positive().optional(),
  expirationDate: z.date().optional().nullable(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  createdBy: z.string().optional().nullable()
});

export type InsertUserType = z.infer<typeof insertUserSchema>;

// Vehicle schemas
export const insertVehicleSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  placa: z.string().min(1, "License plate is required").max(20, "License plate too long"),
  marca: z.string().min(1, "Brand is required").max(50, "Brand name too long"),
  modelo: z.string().min(1, "Model is required").max(50, "Model name too long"),
  color: z.string().min(1, "Color is required").max(30, "Color name too long"),
  observaciones: z.string().optional().nullable()
});

export type InsertVehicleType = z.infer<typeof insertVehicleSchema>;

// Company config schemas
export const insertCompanyConfigSchema = z.object({
  ruc: z.string().min(1, "RUC is required"),
  razonSocial: z.string().min(1, "Razón social is required"),
  nombreFantasia: z.string().optional().nullable(),
  timbradoNumero: z.string().min(1, "Timbrado número is required"),
  timbradoDesde: z.string().min(1, "Timbrado desde is required"),
  timbradoHasta: z.string().min(1, "Timbrado hasta is required"),
  establecimiento: z.string().optional(),
  puntoExpedicion: z.string().optional(),
  direccion: z.string().min(1, "Dirección is required"),
  ciudad: z.string().optional(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  logoPath: z.string().optional().nullable(),
  moneda: z.string().optional()
});

export type InsertCompanyConfigType = z.infer<typeof insertCompanyConfigSchema>;

// Customer schemas
export const insertCustomerSchema = z.object({
  nombre: z.string().min(1, "Name is required"),
  docTipo: z.enum(["CI", "Pasaporte", "RUC", "Extranjero"]).optional(),
  docNumero: z.string().min(1, "Document number is required"),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  regimenTurismo: z.boolean().optional(),
  pais: z.string().optional().nullable(),
  pasaporte: z.string().optional().nullable(),
  fechaIngreso: z.string().optional().nullable()
});

export type InsertCustomerType = z.infer<typeof insertCustomerSchema>;

// Service schemas
export const insertServiceSchema = z.object({
  nombre: z.string().min(1, "Service name is required"),
  descripcion: z.string().optional().nullable(),
  precio: z.union([z.string(), z.number()]).transform(val => String(val)),
  duracionMin: z.number().positive("Duration must be positive"),
  categoria: z.string().min(1, "Category is required"),
  activo: z.boolean().optional()
});

export type InsertServiceType = z.infer<typeof insertServiceSchema>;

// Work Order schemas
export const insertWorkOrderSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  estado: z.enum(["recibido", "en_proceso", "terminado", "entregado", "cancelado"]).optional(),
  fechaEntrada: z.date().optional(),
  fechaInicio: z.date().optional().nullable(),
  fechaFin: z.date().optional().nullable(),
  fechaEntrega: z.date().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  total: z.string().optional()
});

export type InsertWorkOrderType = z.infer<typeof insertWorkOrderSchema>;

export const insertWorkOrderItemSchema = z.object({
  workOrderId: z.string().min(1, "Work Order ID is required"),
  serviceId: z.string().optional().nullable(),
  comboId: z.string().optional().nullable(),
  nombre: z.string().min(1, "Item name is required"),
  precio: z.string().min(1, "Price is required"),
  cantidad: z.number().positive("Quantity must be positive")
});

export type InsertWorkOrderItemType = z.infer<typeof insertWorkOrderItemSchema>;

// Category schemas
export const insertCategorySchema = z.object({
  nombre: z.string().min(1, "Category name is required"),
  descripcion: z.string().optional().nullable(),
  tipo: z.enum(["servicios", "productos", "ambos"]).default("ambos"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional().nullable(),
  activa: z.boolean().default(true)
});

export type InsertCategoryType = z.infer<typeof insertCategorySchema>;

// Inventory Item schemas
export const insertInventoryItemSchema = z.object({
  nombre: z.string().min(1, "Item name is required"),
  descripcion: z.string().optional().nullable(),
  precio: z.union([z.string(), z.number()]).transform(val => String(val)),
  stockActual: z.number().min(0, "Stock cannot be negative"),
  stockMinimo: z.number().min(0, "Minimum stock cannot be negative"),
  unidadMedida: z.string().default("unidad"),
  categoria: z.string().min(1, "Category is required"),
  proveedor: z.string().optional().nullable(),
  ultimoPedido: z.string().optional().nullable(),
  estadoAlerta: z.enum(["normal", "bajo", "critico"]).optional(),
  activo: z.boolean().optional()
});

export type InsertInventoryItemType = z.infer<typeof insertInventoryItemSchema>;

// Sale schemas
export const insertSaleSchema = z.object({
  numeroFactura: z.string().min(1, "Invoice number is required"),
  customerId: z.string().optional().nullable(),
  workOrderId: z.string().optional().nullable(),
  fecha: z.date().optional(),
  subtotal: z.string().min(1, "Subtotal is required"),
  impuestos: z.string().optional(),
  total: z.string().min(1, "Total is required"),
  medioPago: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "cheque"]),
  regimenTurismo: z.boolean().optional(),
  timbradoUsado: z.string().min(1, "Timbrado is required"),
  createdBy: z.string().optional().nullable()
});

export type InsertSaleType = z.infer<typeof insertSaleSchema>;

// ========================
// ADDITIONAL REQUIRED SCHEMAS FOR ROUTES
// ========================

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export type LoginType = z.infer<typeof loginSchema>;

// Update user schema (for user management)
export const updateUserSchema = z.object({
  fullName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  role: z.enum(["admin", "user", "readonly"]).optional(),
  subscriptionType: z.enum(["free", "basic", "premium", "enterprise"]).optional(),
  monthlyInvoiceLimit: z.number().positive().optional(),
  expirationDate: z.date().optional().nullable(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional()
});

export type UpdateUserType = z.infer<typeof updateUserSchema>;

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters")
});

export type ChangePasswordType = z.infer<typeof changePasswordSchema>;

// DNIT Config schemas
export const insertDnitConfigSchema = z.object({
  endpointUrl: z.string().url("Invalid URL format"),
  authToken: z.string().min(1, "Auth token is required"),
  certificateData: z.string().optional().nullable(),
  certificatePassword: z.string().optional().nullable(),
  operationMode: z.enum(["testing", "production"]).optional(),
  isActive: z.boolean().optional()
});

export type InsertDnitConfigType = z.infer<typeof insertDnitConfigSchema>;

// Service combo schemas
export const insertServiceComboSchema = z.object({
  nombre: z.string().min(1, "Combo name is required"),
  descripcion: z.string().optional().nullable(),
  precioTotal: z.union([z.string(), z.number()]).transform(val => String(val)),
  activo: z.boolean().optional()
});

export type InsertServiceComboType = z.infer<typeof insertServiceComboSchema>;

export const insertServiceComboItemSchema = z.object({
  comboId: z.string().min(1, "Combo ID is required"),
  serviceId: z.string().min(1, "Service ID is required")
});

export type InsertServiceComboItemType = z.infer<typeof insertServiceComboItemSchema>;

// Sale item schemas
export const insertSaleItemSchema = z.object({
  saleId: z.string().min(1, "Sale ID is required"),
  serviceId: z.string().optional().nullable(),
  comboId: z.string().optional().nullable(),
  inventoryItemId: z.string().optional().nullable(),
  nombre: z.string().min(1, "Item name is required"),
  cantidad: z.number().positive("Quantity must be positive"),
  precioUnitario: z.string().min(1, "Unit price is required"),
  subtotal: z.string().min(1, "Subtotal is required")
});

export type InsertSaleItemType = z.infer<typeof insertSaleItemSchema>;

// Frontend sale schemas
export const frontendSaleItemSchema = z.object({
  serviceId: z.string().optional().nullable(),
  comboId: z.string().optional().nullable(),
  inventoryItemId: z.string().optional().nullable(),
  nombre: z.string().min(1, "Item name is required"),
  cantidad: z.number().positive("Quantity must be positive"),
  precioUnitario: z.union([z.string(), z.number()]).transform(val => String(val)),
  subtotal: z.union([z.string(), z.number()]).transform(val => String(val))
});

export const saleWithItemsSchema = z.object({
  numeroFactura: z.string().min(1, "Invoice number is required"),
  customerId: z.string().optional().nullable(),
  workOrderId: z.string().optional().nullable(),
  fecha: z.string().or(z.date()).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  subtotal: z.union([z.string(), z.number()]).transform(val => String(val)),
  impuestos: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  total: z.union([z.string(), z.number()]).transform(val => String(val)),
  medioPago: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "cheque"]),
  regimenTurismo: z.boolean().optional(),
  timbradoUsado: z.string().min(1, "Timbrado is required"),
  items: z.array(frontendSaleItemSchema).min(1, "At least one item is required")
});

export type SaleWithItemsType = z.infer<typeof saleWithItemsSchema>;

// ========================
// PUBLIC USER TYPE (FOR FRONTEND)
// ========================

export interface PublicUser {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  role: "admin" | "user" | "readonly";
  subscriptionType: "free" | "basic" | "premium" | "enterprise";
  monthlyInvoiceLimit: number;
  expirationDate: Date | null;
  currentMonthInvoices: number;
  usageResetDate: Date;
  isActive: boolean;
  isBlocked: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

// ========================
// SAFE DNIT CONFIG (FOR FRONTEND)
// ========================

export interface SafeDnitConfig {
  id: string;
  endpointUrl: string;
  operationMode: "testing" | "production";
  isActive: boolean;
  lastConnectionTest: Date | null;
  lastConnectionStatus: string | null;
  lastConnectionError: string | null;
  createdAt: Date;
  updatedAt: Date;
  hasAuthToken: boolean;
  hasCertificatePassword: boolean;
  // Note: authToken, certificateData, and certificatePassword are excluded for security
}

// Types are already exported above as interfaces and type aliases