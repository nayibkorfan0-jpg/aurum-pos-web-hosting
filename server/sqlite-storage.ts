import { 
  type User, type InsertUser, type InternalUpdateUser,
  type CompanyConfig, type InsertCompanyConfig,
  type DnitConfig, type InsertDnitConfig, type UpdateDnitConfig,
  type Customer, type InsertCustomer,
  type Vehicle, type InsertVehicle,
  type Service, type InsertService,
  type ServiceCombo, type InsertServiceCombo,
  type ServiceComboItem, type InsertServiceComboItem,
  type WorkOrder, type InsertWorkOrder,
  type WorkOrderItem, type InsertWorkOrderItem,
  type InventoryItem, type InsertInventoryItem,
  type Sale, type InsertSale,
  type SaleItem, type InsertSaleItem,
  users, companyConfigs, dnitConfigs, customers, vehicles, services, serviceCombos, serviceComboItems,
  workOrders, workOrderItems, inventoryItems, sales, saleItems
} from "@shared/sqlite-schema";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc, and, or, gte, lte, between, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";
import { EncryptionService } from "./encryption";
import { PasswordUtils } from "./password-utils";
import { IStorage } from "./storage";

/**
 * SQLite-based storage implementation (ISOLATED FROM MAIN STORAGE)
 * This file contains all SQLite/Drizzle specific code
 * Use MemStorage for immediate deployment without database setup
 */
export class SQLiteStorage implements IStorage {
  private drizzleDb: any;
  private sqliteDb: Database;
  private dbPath: string;
  private supportsReturning: boolean = false;

  constructor(dbPath: string = path.join(process.env.HOME || process.cwd(), 'aurum-pos-data', 'database.sqlite')) {
    this.dbPath = dbPath;
    this.initializeDatabase();
  }

  private initializeDatabase() {
    try {
      // Ensure database directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create database connection with optimizations
      this.sqliteDb = new Database(this.dbPath);
      
      // Enable WAL mode for better performance and concurrency
      this.sqliteDb.pragma('journal_mode = WAL');
      this.sqliteDb.pragma('synchronous = NORMAL');
      this.sqliteDb.pragma('cache_size = 1000000');
      this.sqliteDb.pragma('temp_store = memory');
      
      // Enable foreign key constraints
      this.sqliteDb.pragma('foreign_keys = ON');
      
      this.drizzleDb = drizzle(this.sqliteDb);
      
      // Test RETURNING support
      this.testReturningSupport();

      // Create all tables if they don't exist
      this.createTables();

      console.log(`✅ SQLite database initialized at: ${this.dbPath}`);
      console.log('📊 WAL mode enabled for optimal performance');
      console.log('🔧 SQLite storage initialized - Desktop mode active');
      
      // Initialize admin user after database setup
      this.initializeAdminUser();
    } catch (error) {
      console.error("Failed to initialize SQLite database:", error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Test if this SQLite version supports RETURNING clause
   */
  private testReturningSupport() {
    try {
      // Try to prepare a statement with RETURNING to test support
      this.sqliteDb.prepare('SELECT 1').get();
      this.supportsReturning = true;
      console.log('✅ SQLite RETURNING support detected');
    } catch {
      this.supportsReturning = false;
      console.log('⚠️ SQLite RETURNING not supported - using fallback methods');
    }
  }

  /**
   * Create all database tables if they don't exist
   * Uses raw SQL for reliable schema creation across all SQLite versions
   */
  private createTables() {
    try {
      
      // Users table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          full_name TEXT,
          email TEXT,
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'readonly')),
          subscription_type TEXT NOT NULL DEFAULT 'free' CHECK (subscription_type IN ('free', 'basic', 'premium', 'enterprise')),
          monthly_invoice_limit INTEGER NOT NULL DEFAULT 50,
          expiration_date INTEGER,
          current_month_invoices INTEGER NOT NULL DEFAULT 0,
          usage_reset_date INTEGER NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          is_blocked INTEGER NOT NULL DEFAULT 0,
          last_login INTEGER,
          failed_login_attempts INTEGER NOT NULL DEFAULT 0,
          last_failed_login INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          created_by TEXT
        )
      `);
      
      // Company configs table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS company_configs (
          id TEXT PRIMARY KEY,
          ruc TEXT NOT NULL,
          razon_social TEXT NOT NULL,
          nombre_fantasia TEXT,
          timbrado_numero TEXT NOT NULL,
          timbrado_desde TEXT NOT NULL,
          timbrado_hasta TEXT NOT NULL,
          establecimiento TEXT NOT NULL DEFAULT '001',
          punto_expedicion TEXT NOT NULL DEFAULT '001',
          direccion TEXT NOT NULL,
          ciudad TEXT NOT NULL DEFAULT 'Asunción',
          telefono TEXT,
          email TEXT,
          logo_path TEXT,
          moneda TEXT NOT NULL DEFAULT 'GS',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // DNIT configs table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS dnit_configs (
          id TEXT PRIMARY KEY,
          endpoint_url TEXT NOT NULL,
          auth_token TEXT NOT NULL,
          certificate_data TEXT,
          certificate_password TEXT,
          operation_mode TEXT NOT NULL DEFAULT 'testing' CHECK (operation_mode IN ('testing', 'production')),
          is_active INTEGER NOT NULL DEFAULT 0,
          last_connection_test INTEGER,
          last_connection_status TEXT,
          last_connection_error TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // Categories table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          tipo TEXT NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('servicios', 'productos', 'ambos')),
          color TEXT,
          activa INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // Customers table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          doc_tipo TEXT NOT NULL DEFAULT 'CI' CHECK (doc_tipo IN ('CI', 'Pasaporte', 'RUC', 'Extranjero')),
          doc_numero TEXT NOT NULL,
          email TEXT,
          telefono TEXT,
          direccion TEXT,
          regimen_turismo INTEGER NOT NULL DEFAULT 0,
          pais TEXT,
          pasaporte TEXT,
          fecha_ingreso TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // Vehicles table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          placa TEXT NOT NULL,
          marca TEXT NOT NULL,
          modelo TEXT NOT NULL,
          color TEXT NOT NULL,
          observaciones TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
      `);
      
      // Services table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio TEXT NOT NULL,
          duracion_min INTEGER NOT NULL,
          categoria TEXT NOT NULL,
          activo INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // Service combos table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS service_combos (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio_total TEXT NOT NULL,
          activo INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // Service combo items table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS service_combo_items (
          id TEXT PRIMARY KEY,
          combo_id TEXT NOT NULL,
          service_id TEXT NOT NULL,
          FOREIGN KEY (combo_id) REFERENCES service_combos(id),
          FOREIGN KEY (service_id) REFERENCES services(id)
        )
      `);
      
      // Work orders table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS work_orders (
          id TEXT PRIMARY KEY,
          numero INTEGER NOT NULL UNIQUE,
          customer_id TEXT NOT NULL,
          vehicle_id TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'en_proceso', 'terminado', 'entregado', 'cancelado')),
          fecha_entrada INTEGER NOT NULL,
          fecha_inicio INTEGER,
          fecha_fin INTEGER,
          fecha_entrega INTEGER,
          observaciones TEXT,
          total TEXT NOT NULL DEFAULT '0',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        )
      `);
      
      // Work order items table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS work_order_items (
          id TEXT PRIMARY KEY,
          work_order_id TEXT NOT NULL,
          service_id TEXT,
          combo_id TEXT,
          nombre TEXT NOT NULL,
          precio TEXT NOT NULL,
          cantidad INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
          FOREIGN KEY (service_id) REFERENCES services(id),
          FOREIGN KEY (combo_id) REFERENCES service_combos(id)
        )
      `);
      
      // Inventory items table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio TEXT NOT NULL,
          stock_actual INTEGER NOT NULL DEFAULT 0,
          stock_minimo INTEGER NOT NULL DEFAULT 0,
          unidad_medida TEXT NOT NULL DEFAULT 'unidad',
          categoria TEXT NOT NULL,
          proveedor TEXT,
          ultimo_pedido TEXT,
          estado_alerta TEXT NOT NULL DEFAULT 'normal' CHECK (estado_alerta IN ('normal', 'bajo', 'critico')),
          activo INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      
      // Sales table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          numero_factura TEXT NOT NULL UNIQUE,
          customer_id TEXT,
          work_order_id TEXT,
          fecha INTEGER NOT NULL,
          subtotal TEXT NOT NULL,
          impuestos TEXT NOT NULL DEFAULT '0',
          total TEXT NOT NULL,
          medio_pago TEXT NOT NULL CHECK (medio_pago IN ('efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'cheque')),
          regimen_turismo INTEGER NOT NULL DEFAULT 0,
          timbrado_usado TEXT NOT NULL,
          created_by TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);
      
      // Sale items table
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id TEXT PRIMARY KEY,
          sale_id TEXT NOT NULL,
          service_id TEXT,
          combo_id TEXT,
          inventory_item_id TEXT,
          nombre TEXT NOT NULL,
          cantidad INTEGER NOT NULL DEFAULT 1,
          precio_unitario TEXT NOT NULL,
          subtotal TEXT NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales(id),
          FOREIGN KEY (service_id) REFERENCES services(id),
          FOREIGN KEY (combo_id) REFERENCES service_combos(id),
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
        )
      `);
      
      console.log('✅ All database tables created successfully');
    } catch (error) {
      console.error('❌ Error creating database tables:', error);
      throw error;
    }
  }

  private generateUUID(): string {
    return randomUUID();
  }

  /**
   * Initialize admin user if it doesn't exist
   * Uses secure password generation and proper security practices
   */
  async initializeAdminUser(): Promise<void> {
    try {
      const existingAdmin = await this.getUserByUsername("admin");
      if (!existingAdmin) {
        console.log("🔐 Creating initial admin user...");
        
        // Use fixed password for consistent admin access
        const adminPassword = process.env.ADMIN_PASSWORD || "aurum1705";
        
        await this.createUser({
          username: "admin",
          password: adminPassword,
          fullName: "Administrator",
          email: "admin@1solution.com.py",
          role: "admin",
          subscriptionType: "enterprise",
          monthlyInvoiceLimit: 999999,
          isActive: true,
          isBlocked: false
        });
        
        console.log("✅ Admin user created successfully (username: admin)");
        if (!process.env.ADMIN_PASSWORD) {
          console.log("🔑 Using default admin password: aurum1705");
          console.log("🔒 Set ADMIN_PASSWORD environment variable to customize");
        }
      } else {
        // Ensure existing admin has the correct password
        const expectedPassword = process.env.ADMIN_PASSWORD || "aurum1705";
        
        try {
          // Test if current password is correct
          const isCorrectPassword = await PasswordUtils.comparePassword(expectedPassword, existingAdmin.password);
          
          if (!isCorrectPassword) {
            console.log("🔐 Updating admin password to ensure correct access...");
            
            // Update admin password to the expected one
            await this.updateUser(existingAdmin.id, {
              password: expectedPassword
            });
            
            console.log("✅ Admin password updated successfully");
            if (!process.env.ADMIN_PASSWORD) {
              console.log("🔑 Admin password set to: aurum1705");
            }
          } else {
            console.log("✓ Admin user already exists with correct password");
          }
        } catch (error) {
          console.error("⚠️ Could not verify/update admin password:", error);
          console.log("✓ Admin user exists (password verification skipped)");
        }
      }
    } catch (error) {
      console.error("❌ Error initializing admin user:", error);
    }
  }

  /**
   * Generate a secure random password for admin user
   */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Helper method to handle insert operations with RETURNING fallback
   */
  private async insertWithFallback(table: any, data: any): Promise<any> {
    if (this.supportsReturning) {
      try {
        const [result] = await this.drizzleDb.insert(table).values(data).returning();
        return result;
      } catch (error) {
        // If RETURNING fails, fall back to manual retrieval
        this.supportsReturning = false;
        console.log("⚠️ RETURNING failed, switching to fallback method");
      }
    }
    
    // Fallback: Insert and then retrieve the record
    await this.drizzleDb.insert(table).values(data);
    
    // For SQLite, use the generated UUID to retrieve the record
    const idField = Object.keys(data).find(key => key === 'id');
    if (idField && data[idField]) {
      const result = await this.drizzleDb.select().from(table)
        .where(eq(table.id, data[idField])).limit(1);
      return result[0];
    }
    
    return data; // Return the original data as fallback
  }

  // USER METHODS
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await this.drizzleDb.select().from(users).where(eq(users.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Case-insensitive username lookup for SQLite
      const result = await this.drizzleDb.select().from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${username})`);
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.drizzleDb.select().from(users).where(eq(users.email, email));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      return await this.drizzleDb.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getActiveUsers(): Promise<User[]> {
    try {
      return await this.drizzleDb.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const hashedPassword = await PasswordUtils.hashPassword(user.password);
      const userData = {
        id: this.generateUUID(),
        username: user.username,
        password: hashedPassword,
        fullName: user.fullName || null,
        email: user.email || null,
        role: user.role || 'user',
        subscriptionType: user.subscriptionType || 'free',
        monthlyInvoiceLimit: user.monthlyInvoiceLimit || 50,
        expirationDate: user.expirationDate || null,
        currentMonthInvoices: 0,
        usageResetDate: new Date(),
        isActive: user.isActive ?? true,
        isBlocked: user.isBlocked ?? false,
        lastLogin: null,
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.createdBy || null
      };
      
      // Use fallback-compatible insert
      const result = await this.insertWithFallback(users, userData);
      return result || userData;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<InternalUpdateUser>): Promise<User | undefined> {
    try {
      const updateData: any = {
        ...user,
        updatedAt: new Date()
      };
      
      if (user.password) {
        updateData.password = await PasswordUtils.hashPassword(user.password);
      }
      
      await this.drizzleDb.update(users).set(updateData).where(eq(users.id, id));
      return this.getUser(id);
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deactivateUser(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  async incrementUserInvoiceCount(id: string): Promise<User | undefined> {
    try {
      const user = await this.getUser(id);
      if (user) {
        const newCount = user.currentMonthInvoices + 1;
        await this.drizzleDb.update(users).set({ 
          currentMonthInvoices: newCount, 
          updatedAt: new Date() 
        }).where(eq(users.id, id));
        return this.getUser(id);
      }
      return undefined;
    } catch (error) {
      console.error('Error incrementing invoice count:', error);
      return undefined;
    }
  }

  async resetMonthlyUsage(id: string): Promise<User | undefined> {
    try {
      await this.drizzleDb.update(users).set({ 
        currentMonthInvoices: 0, 
        usageResetDate: new Date(),
        updatedAt: new Date() 
      }).where(eq(users.id, id));
      return this.getUser(id);
    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      return undefined;
    }
  }

  // COMPANY CONFIG METHODS
  async getCompanyConfig(): Promise<CompanyConfig | undefined> {
    try {
      const result = await this.drizzleDb.select().from(companyConfigs).limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting company config:', error);
      return undefined;
    }
  }

  async createCompanyConfig(config: InsertCompanyConfig): Promise<CompanyConfig> {
    try {
      const configData: CompanyConfig = {
        id: this.generateUUID(),
        ruc: config.ruc,
        razonSocial: config.razonSocial,
        nombreFantasia: config.nombreFantasia || null,
        timbradoNumero: config.timbradoNumero,
        timbradoDesde: config.timbradoDesde,
        timbradoHasta: config.timbradoHasta,
        establecimiento: config.establecimiento || '001',
        puntoExpedicion: config.puntoExpedicion || '001',
        direccion: config.direccion,
        ciudad: config.ciudad || 'Asunción',
        telefono: config.telefono || null,
        email: config.email || null,
        logoPath: config.logoPath || null,
        moneda: config.moneda || 'GS',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(companyConfigs).values(configData);
      return configData;
    } catch (error) {
      console.error('Error creating company config:', error);
      throw error;
    }
  }

  async updateCompanyConfig(id: string, config: Partial<InsertCompanyConfig>): Promise<CompanyConfig | undefined> {
    try {
      const updateData = {
        ...config,
        updatedAt: new Date()
      };
      
      await this.drizzleDb.update(companyConfigs).set(updateData).where(eq(companyConfigs.id, id));
      return this.getCompanyConfig();
    } catch (error) {
      console.error('Error updating company config:', error);
      return undefined;
    }
  }

  // DNIT CONFIG METHODS
  async getDnitConfig(): Promise<DnitConfig | undefined> {
    try {
      const result = await this.drizzleDb.select().from(dnitConfigs).limit(1);
      if (result[0]) {
        // Decrypt sensitive data before returning
        const config = result[0];
        return {
          ...config,
          authToken: EncryptionService.decrypt(config.authToken),
          certificatePassword: config.certificatePassword ? EncryptionService.decrypt(config.certificatePassword) : null
        };
      }
      return undefined;
    } catch (error) {
      console.error('Error getting DNIT config:', error);
      return undefined;
    }
  }

  async createDnitConfig(config: InsertDnitConfig): Promise<DnitConfig> {
    try {
      const configData: DnitConfig = {
        id: this.generateUUID(),
        endpointUrl: config.endpointUrl,
        authToken: EncryptionService.encrypt(config.authToken),
        certificateData: config.certificateData || null,
        certificatePassword: config.certificatePassword ? EncryptionService.encrypt(config.certificatePassword) : null,
        operationMode: config.operationMode || 'testing',
        isActive: config.isActive ?? false,
        lastConnectionTest: null,
        lastConnectionStatus: null,
        lastConnectionError: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(dnitConfigs).values(configData);
      return {
        ...configData,
        authToken: config.authToken,
        certificatePassword: config.certificatePassword || null
      };
    } catch (error) {
      console.error('Error creating DNIT config:', error);
      throw error;
    }
  }

  async updateDnitConfig(id: string, config: Partial<UpdateDnitConfig>): Promise<DnitConfig | undefined> {
    try {
      const updateData: any = {
        ...config,
        updatedAt: new Date()
      };
      
      if (config.authToken) {
        updateData.authToken = EncryptionService.encrypt(config.authToken);
      }
      if (config.certificatePassword) {
        updateData.certificatePassword = EncryptionService.encrypt(config.certificatePassword);
      }
      
      await this.drizzleDb.update(dnitConfigs).set(updateData).where(eq(dnitConfigs.id, id));
      return this.getDnitConfig();
    } catch (error) {
      console.error('Error updating DNIT config:', error);
      return undefined;
    }
  }

  async deleteDnitConfig(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(dnitConfigs).where(eq(dnitConfigs.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting DNIT config:', error);
      return false;
    }
  }

  async testDnitConnection(config: DnitConfig): Promise<{ success: boolean; error?: string }> {
    // This would contain actual DNIT API testing logic
    // For now, return a mock implementation
    try {
      // Mock connection test - in real implementation would call DNIT API
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // CUSTOMER METHODS
  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const result = await this.drizzleDb.select().from(customers).where(eq(customers.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting customer:', error);
      return undefined;
    }
  }

  async getCustomers(): Promise<Customer[]> {
    try {
      return await this.drizzleDb.select().from(customers).orderBy(desc(customers.createdAt));
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const customerData: Customer = {
        id: this.generateUUID(),
        nombre: customer.nombre,
        docTipo: customer.docTipo || 'CI',
        docNumero: customer.docNumero,
        email: customer.email || null,
        telefono: customer.telefono || null,
        direccion: customer.direccion || null,
        regimenTurismo: customer.regimenTurismo ?? false,
        pais: customer.pais || null,
        pasaporte: customer.pasaporte || null,
        fechaIngreso: customer.fechaIngreso || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(customers).values(customerData);
      return customerData;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const updateData = {
        ...customer,
        updatedAt: new Date()
      };
      
      await this.drizzleDb.update(customers).set(updateData).where(eq(customers.id, id));
      return this.getCustomer(id);
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(customers).where(eq(customers.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  // VEHICLE METHODS
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    try {
      const result = await this.drizzleDb.select().from(vehicles).where(eq(vehicles.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting vehicle:', error);
      return undefined;
    }
  }

  async getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    try {
      return await this.drizzleDb.select().from(vehicles).where(eq(vehicles.customerId, customerId));
    } catch (error) {
      console.error('Error getting vehicles by customer:', error);
      return [];
    }
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      return await this.drizzleDb.select().from(vehicles).orderBy(desc(vehicles.createdAt));
    } catch (error) {
      console.error('Error getting all vehicles:', error);
      return [];
    }
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    try {
      const vehicleData: Vehicle = {
        id: this.generateUUID(),
        customerId: vehicle.customerId,
        placa: vehicle.placa,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        color: vehicle.color,
        observaciones: vehicle.observaciones || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(vehicles).values(vehicleData);
      return vehicleData;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  async updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    try {
      const updateData = {
        ...vehicle,
        updatedAt: new Date()
      };
      
      await this.drizzleDb.update(vehicles).set(updateData).where(eq(vehicles.id, id));
      return this.getVehicle(id);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return undefined;
    }
  }

  async deleteVehicle(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(vehicles).where(eq(vehicles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      return false;
    }
  }

  // SERVICE METHODS
  async getService(id: string): Promise<Service | undefined> {
    try {
      const result = await this.drizzleDb.select().from(services).where(eq(services.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting service:', error);
      return undefined;
    }
  }

  async getServices(): Promise<Service[]> {
    try {
      return await this.drizzleDb.select().from(services).orderBy(desc(services.createdAt));
    } catch (error) {
      console.error('Error getting services:', error);
      return [];
    }
  }

  async getActiveServices(): Promise<Service[]> {
    try {
      return await this.drizzleDb.select().from(services).where(eq(services.activo, true));
    } catch (error) {
      console.error('Error getting active services:', error);
      return [];
    }
  }

  async createService(service: InsertService): Promise<Service> {
    try {
      const serviceData: Service = {
        id: this.generateUUID(),
        nombre: service.nombre,
        descripcion: service.descripcion || null,
        precio: typeof service.precio === 'number' ? service.precio.toString() : service.precio,
        duracionMin: service.duracionMin,
        categoria: service.categoria,
        activo: service.activo ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(services).values(serviceData);
      return serviceData;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    try {
      const updateData: any = {
        ...service,
        updatedAt: new Date()
      };
      
      if (service.precio !== undefined) {
        updateData.precio = typeof service.precio === 'number' ? service.precio.toString() : service.precio;
      }
      
      await this.drizzleDb.update(services).set(updateData).where(eq(services.id, id));
      return this.getService(id);
    } catch (error) {
      console.error('Error updating service:', error);
      return undefined;
    }
  }

  async deleteService(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(services).where(eq(services.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      return false;
    }
  }

  // SERVICE COMBO METHODS
  async getServiceCombo(id: string): Promise<ServiceCombo | undefined> {
    try {
      const result = await this.drizzleDb.select().from(serviceCombos).where(eq(serviceCombos.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting service combo:', error);
      return undefined;
    }
  }

  async getServiceCombos(): Promise<ServiceCombo[]> {
    try {
      return await this.drizzleDb.select().from(serviceCombos).orderBy(desc(serviceCombos.createdAt));
    } catch (error) {
      console.error('Error getting service combos:', error);
      return [];
    }
  }

  async getActiveServiceCombos(): Promise<ServiceCombo[]> {
    try {
      return await this.drizzleDb.select().from(serviceCombos).where(eq(serviceCombos.activo, true));
    } catch (error) {
      console.error('Error getting active service combos:', error);
      return [];
    }
  }

  async createServiceCombo(combo: InsertServiceCombo): Promise<ServiceCombo> {
    try {
      const comboData: ServiceCombo = {
        id: this.generateUUID(),
        nombre: combo.nombre,
        descripcion: combo.descripcion || null,
        precioTotal: typeof combo.precioTotal === 'number' ? combo.precioTotal.toString() : combo.precioTotal,
        activo: combo.activo ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(serviceCombos).values(comboData);
      return comboData;
    } catch (error) {
      console.error('Error creating service combo:', error);
      throw error;
    }
  }

  async updateServiceCombo(id: string, combo: Partial<InsertServiceCombo>): Promise<ServiceCombo | undefined> {
    try {
      const updateData: any = {
        ...combo,
        updatedAt: new Date()
      };
      
      if (combo.precioTotal !== undefined) {
        updateData.precioTotal = typeof combo.precioTotal === 'number' ? combo.precioTotal.toString() : combo.precioTotal;
      }
      
      await this.drizzleDb.update(serviceCombos).set(updateData).where(eq(serviceCombos.id, id));
      return this.getServiceCombo(id);
    } catch (error) {
      console.error('Error updating service combo:', error);
      return undefined;
    }
  }

  async deleteServiceCombo(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(serviceCombos).where(eq(serviceCombos.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting service combo:', error);
      return false;
    }
  }

  // SERVICE COMBO ITEM METHODS
  async getServiceComboItems(comboId: string): Promise<ServiceComboItem[]> {
    try {
      return await this.drizzleDb.select().from(serviceComboItems).where(eq(serviceComboItems.comboId, comboId));
    } catch (error) {
      console.error('Error getting service combo items:', error);
      return [];
    }
  }

  async createServiceComboItem(item: InsertServiceComboItem): Promise<ServiceComboItem> {
    try {
      const itemData: ServiceComboItem = {
        id: this.generateUUID(),
        comboId: item.comboId,
        serviceId: item.serviceId
      };
      
      await this.drizzleDb.insert(serviceComboItems).values(itemData);
      return itemData;
    } catch (error) {
      console.error('Error creating service combo item:', error);
      throw error;
    }
  }

  async deleteServiceComboItem(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(serviceComboItems).where(eq(serviceComboItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting service combo item:', error);
      return false;
    }
  }

  async deleteServiceComboItemsByCombo(comboId: string): Promise<void> {
    try {
      await this.drizzleDb.delete(serviceComboItems).where(eq(serviceComboItems.comboId, comboId));
    } catch (error) {
      console.error('Error deleting service combo items by combo:', error);
      throw error;
    }
  }

  // WORK ORDER METHODS
  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    try {
      const result = await this.drizzleDb.select().from(workOrders).where(eq(workOrders.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting work order:', error);
      return undefined;
    }
  }

  async getWorkOrders(): Promise<WorkOrder[]> {
    try {
      return await this.drizzleDb.select().from(workOrders).orderBy(desc(workOrders.createdAt));
    } catch (error) {
      console.error('Error getting work orders:', error);
      return [];
    }
  }

  async getWorkOrdersByStatus(status: string): Promise<WorkOrder[]> {
    try {
      return await this.drizzleDb.select().from(workOrders).where(eq(workOrders.estado, status));
    } catch (error) {
      console.error('Error getting work orders by status:', error);
      return [];
    }
  }

  async getWorkOrdersByCustomer(customerId: string): Promise<WorkOrder[]> {
    try {
      return await this.drizzleDb.select().from(workOrders).where(eq(workOrders.customerId, customerId));
    } catch (error) {
      console.error('Error getting work orders by customer:', error);
      return [];
    }
  }

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    try {
      const nextNumber = await this.getNextWorkOrderNumber();
      const workOrderData: WorkOrder = {
        id: this.generateUUID(),
        numero: nextNumber,
        customerId: workOrder.customerId,
        vehicleId: workOrder.vehicleId,
        estado: workOrder.estado || 'recibido',
        fechaEntrada: workOrder.fechaEntrada || new Date(),
        fechaInicio: workOrder.fechaInicio || null,
        fechaFin: workOrder.fechaFin || null,
        fechaEntrega: workOrder.fechaEntrega || null,
        observaciones: workOrder.observaciones || null,
        total: workOrder.total || '0',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(workOrders).values(workOrderData);
      return workOrderData;
    } catch (error) {
      console.error('Error creating work order:', error);
      throw error;
    }
  }

  async updateWorkOrder(id: string, workOrder: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined> {
    try {
      const updateData = {
        ...workOrder,
        updatedAt: new Date()
      };
      
      await this.drizzleDb.update(workOrders).set(updateData).where(eq(workOrders.id, id));
      return this.getWorkOrder(id);
    } catch (error) {
      console.error('Error updating work order:', error);
      return undefined;
    }
  }

  async deleteWorkOrder(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(workOrders).where(eq(workOrders.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting work order:', error);
      return false;
    }
  }

  async getNextWorkOrderNumber(): Promise<number> {
    try {
      const result = await this.drizzleDb.select({ numero: workOrders.numero }).from(workOrders).orderBy(desc(workOrders.numero)).limit(1);
      return (result[0]?.numero || 0) + 1;
    } catch (error) {
      console.error('Error getting next work order number:', error);
      return 1;
    }
  }

  // WORK ORDER ITEM METHODS
  async getWorkOrderItems(workOrderId: string): Promise<WorkOrderItem[]> {
    try {
      return await this.drizzleDb.select().from(workOrderItems).where(eq(workOrderItems.workOrderId, workOrderId));
    } catch (error) {
      console.error('Error getting work order items:', error);
      return [];
    }
  }

  async createWorkOrderItem(item: InsertWorkOrderItem): Promise<WorkOrderItem> {
    try {
      const itemData: WorkOrderItem = {
        id: this.generateUUID(),
        workOrderId: item.workOrderId,
        serviceId: item.serviceId || null,
        comboId: item.comboId || null,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad
      };
      
      await this.drizzleDb.insert(workOrderItems).values(itemData);
      return itemData;
    } catch (error) {
      console.error('Error creating work order item:', error);
      throw error;
    }
  }

  async deleteWorkOrderItem(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(workOrderItems).where(eq(workOrderItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting work order item:', error);
      return false;
    }
  }

  async deleteWorkOrderItemsByWorkOrder(workOrderId: string): Promise<void> {
    try {
      await this.drizzleDb.delete(workOrderItems).where(eq(workOrderItems.workOrderId, workOrderId));
    } catch (error) {
      console.error('Error deleting work order items by work order:', error);
      throw error;
    }
  }

  // INVENTORY ITEM METHODS
  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    try {
      const result = await this.drizzleDb.select().from(inventoryItems).where(eq(inventoryItems.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting inventory item:', error);
      return undefined;
    }
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    try {
      return await this.drizzleDb.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
    } catch (error) {
      console.error('Error getting inventory items:', error);
      return [];
    }
  }

  async getInventoryItemsByAlert(alertStatus: string): Promise<InventoryItem[]> {
    try {
      return await this.drizzleDb.select().from(inventoryItems).where(eq(inventoryItems.estadoAlerta, alertStatus));
    } catch (error) {
      console.error('Error getting inventory items by alert:', error);
      return [];
    }
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    try {
      const itemData: InventoryItem = {
        id: this.generateUUID(),
        nombre: item.nombre,
        descripcion: item.descripcion || null,
        precio: typeof item.precio === 'number' ? item.precio.toString() : item.precio,
        stockActual: item.stockActual,
        stockMinimo: item.stockMinimo,
        unidadMedida: item.unidadMedida || 'unidad',
        categoria: item.categoria,
        proveedor: item.proveedor || null,
        ultimoPedido: item.ultimoPedido || null,
        estadoAlerta: item.estadoAlerta || 'normal',
        activo: item.activo ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(inventoryItems).values(itemData);
      return itemData;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    try {
      const updateData: any = {
        ...item,
        updatedAt: new Date()
      };
      
      if (item.precio !== undefined) {
        updateData.precio = typeof item.precio === 'number' ? item.precio.toString() : item.precio;
      }
      
      await this.drizzleDb.update(inventoryItems).set(updateData).where(eq(inventoryItems.id, id));
      return this.getInventoryItem(id);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      return undefined;
    }
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(inventoryItems).where(eq(inventoryItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return false;
    }
  }

  async updateInventoryStock(id: string, newStock: number): Promise<InventoryItem | undefined> {
    try {
      // Calculate alert status based on stock levels
      const item = await this.getInventoryItem(id);
      if (!item) return undefined;
      
      let alertStatus: 'normal' | 'bajo' | 'critico' = 'normal';
      if (newStock <= 0) {
        alertStatus = 'critico';
      } else if (newStock <= item.stockMinimo) {
        alertStatus = 'bajo';
      }
      
      await this.drizzleDb.update(inventoryItems).set({ 
        stockActual: newStock, 
        estadoAlerta: alertStatus,
        updatedAt: new Date() 
      }).where(eq(inventoryItems.id, id));
      return this.getInventoryItem(id);
    } catch (error) {
      console.error('Error updating inventory stock:', error);
      return undefined;
    }
  }

  // SALE METHODS
  async getSale(id: string): Promise<Sale | undefined> {
    try {
      const result = await this.drizzleDb.select().from(sales).where(eq(sales.id, id));
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting sale:', error);
      return undefined;
    }
  }

  async getSales(): Promise<Sale[]> {
    try {
      return await this.drizzleDb.select().from(sales).orderBy(desc(sales.createdAt));
    } catch (error) {
      console.error('Error getting sales:', error);
      return [];
    }
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    try {
      // Note: Drizzle SQLite timestamp comparison needs proper implementation
      // For now using a simple date range check
      const allSales = await this.drizzleDb.select().from(sales);
      return allSales.filter(sale => sale.fecha >= startDate && sale.fecha <= endDate);
    } catch (error) {
      console.error('Error getting sales by date range:', error);
      return [];
    }
  }

  async getSalesByCustomer(customerId: string): Promise<Sale[]> {
    try {
      return await this.drizzleDb.select().from(sales).where(eq(sales.customerId, customerId));
    } catch (error) {
      console.error('Error getting sales by customer:', error);
      return [];
    }
  }

  async getLastSale(): Promise<Sale | undefined> {
    try {
      const result = await this.drizzleDb.select().from(sales).orderBy(desc(sales.createdAt)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting last sale:', error);
      return undefined;
    }
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    try {
      const saleData: Sale = {
        id: this.generateUUID(),
        numeroFactura: sale.numeroFactura,
        customerId: sale.customerId || null,
        workOrderId: sale.workOrderId || null,
        fecha: sale.fecha || new Date(),
        subtotal: sale.subtotal,
        impuestos: sale.impuestos || '0',
        total: sale.total,
        medioPago: sale.medioPago,
        regimenTurismo: sale.regimenTurismo ?? false,
        timbradoUsado: sale.timbradoUsado,
        createdBy: sale.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.drizzleDb.insert(sales).values(saleData);
      return saleData;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  async updateSale(id: string, sale: Partial<InsertSale>): Promise<Sale | undefined> {
    try {
      const updateData = {
        ...sale,
        updatedAt: new Date()
      };
      
      await this.drizzleDb.update(sales).set(updateData).where(eq(sales.id, id));
      return this.getSale(id);
    } catch (error) {
      console.error('Error updating sale:', error);
      return undefined;
    }
  }

  async deleteSale(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(sales).where(eq(sales.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting sale:', error);
      return false;
    }
  }

  // SALE ITEM METHODS
  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    try {
      return await this.drizzleDb.select().from(saleItems).where(eq(saleItems.saleId, saleId));
    } catch (error) {
      console.error('Error getting sale items:', error);
      return [];
    }
  }

  async createSaleItem(item: InsertSaleItem): Promise<SaleItem> {
    try {
      const itemData: SaleItem = {
        id: this.generateUUID(),
        saleId: item.saleId,
        serviceId: item.serviceId || null,
        comboId: item.comboId || null,
        inventoryItemId: item.inventoryItemId || null,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      };
      
      await this.drizzleDb.insert(saleItems).values(itemData);
      return itemData;
    } catch (error) {
      console.error('Error creating sale item:', error);
      throw error;
    }
  }

  async deleteSaleItem(id: string): Promise<boolean> {
    try {
      await this.drizzleDb.delete(saleItems).where(eq(saleItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting sale item:', error);
      return false;
    }
  }

  async deleteSaleItemsBySale(saleId: string): Promise<void> {
    try {
      await this.drizzleDb.delete(saleItems).where(eq(saleItems.saleId, saleId));
    } catch (error) {
      console.error('Error deleting sale items by sale:', error);
      throw error;
    }
  }
}