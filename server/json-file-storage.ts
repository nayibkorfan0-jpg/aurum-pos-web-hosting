import { 
  type User, type InsertUser, type InternalUpdateUser,
  type CompanyConfig, type InsertCompanyConfig,
  type DnitConfig, type InsertDnitConfig, type UpdateDnitConfig,
  type Category, type InsertCategory,
  type Customer, type InsertCustomer,
  type Vehicle, type InsertVehicle,
  type Service, type InsertService,
  type ServiceCombo, type InsertServiceCombo,
  type ServiceComboItem, type InsertServiceComboItem,
  type WorkOrder, type InsertWorkOrder,
  type WorkOrderItem, type InsertWorkOrderItem,
  type InventoryItem, type InsertInventoryItem,
  type Sale, type InsertSale,
  type SaleItem, type InsertSaleItem
} from "@shared/schema";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { EncryptionService } from "./encryption";
import { PasswordUtils } from "./password-utils";
import { IStorage } from "./storage";

/**
 * JSON File-based storage implementation for web applications
 * Stores data in JSON files in the application's data directory
 */
export class JsonFileStorage implements IStorage {
  private dataDir: string;
  private nextWorkOrderNumber: number = 1;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || this.getUserDataPath();
    this.initializeStorage();
  }

  private getUserDataPath(): string {
    // For web applications, use data directory in project root
    return path.join(process.cwd(), 'data');
  }

  private initializeStorage() {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Initialize all data files if they don't exist
      this.initializeDataFile('users.json', []);
      this.initializeDataFile('company_configs.json', []);
      this.initializeDataFile('dnit_configs.json', []);
      this.initializeDataFile('categories.json', []);
      this.initializeDataFile('customers.json', []);
      this.initializeDataFile('vehicles.json', []);
      this.initializeDataFile('services.json', []);
      this.initializeDataFile('service_combos.json', []);
      this.initializeDataFile('service_combo_items.json', []);
      this.initializeDataFile('work_orders.json', []);
      this.initializeDataFile('work_order_items.json', []);
      this.initializeDataFile('inventory_items.json', []);
      this.initializeDataFile('sales.json', []);
      this.initializeDataFile('sale_items.json', []);
      this.initializeDataFile('metadata.json', { nextWorkOrderNumber: 1 });

      // Load metadata
      const metadata = this.readDataFile('metadata.json');
      this.nextWorkOrderNumber = metadata.nextWorkOrderNumber || 1;

      console.log(`✅ JSON file storage initialized at: ${this.dataDir}`);
      console.log('📁 File-based storage active - No native modules required');
      
      // Initialize admin user after storage setup
      this.initializeAdminUser();
    } catch (error) {
      console.error("Failed to initialize JSON file storage:", error);
      throw new Error(`Storage initialization failed: ${error}`);
    }
  }

  private initializeDataFile(filename: string, defaultData: any) {
    const filePath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  private readDataFile(filename: string): any {
    try {
      const filePath = path.join(this.dataDir, filename);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return filename === 'metadata.json' ? { nextWorkOrderNumber: 1 } : [];
    }
  }

  private writeDataFile(filename: string, data: any): void {
    try {
      const filePath = path.join(this.dataDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      throw error;
    }
  }

  private generateUUID(): string {
    return randomUUID();
  }

  private processDateString(dateValue: string | Date | null | undefined): string | null {
    if (!dateValue) return null;
    
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  /**
   * Initialize admin user if it doesn't exist
   */
  async initializeAdminUser(): Promise<void> {
    try {
      const existingAdmin = await this.getUserByUsername("admin");
      if (!existingAdmin) {
        console.log("🔐 Creating initial admin user...");
        
        await this.createUser({
          username: "admin",
          password: "aurum1705",
          fullName: "Administrador",
          email: "admin@1solution.com.py",
          role: "admin",
          subscriptionType: "enterprise",
          monthlyInvoiceLimit: 999999,
          isActive: true,
          isBlocked: false
        });
        
        console.log("✅ Admin user created successfully (username: admin)");
      } else {
        console.log("✓ Admin user already exists");
      }
    } catch (error) {
      console.error("Error initializing admin user:", error);
    }
  }

  // ============================
  // USER MANAGEMENT
  // ============================

  async getUser(id: string): Promise<User | undefined> {
    try {
      const users = this.readDataFile('users.json');
      return users.find((user: User) => user.id === id);
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const users = this.readDataFile('users.json');
      return users.find((user: User) => user.username === username);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const users = this.readDataFile('users.json');
      return users.find((user: User) => user.email === email);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const users = this.readDataFile('users.json');
      return users.sort((a: User, b: User) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getActiveUsers(): Promise<User[]> {
    try {
      const users = await this.getUsers();
      return users.filter(user => user.isActive && !user.isBlocked);
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const id = this.generateUUID();
      const now = new Date();
      const hashedPassword = await PasswordUtils.hashPassword(insertUser.password);

      const user: User = {
        id,
        username: insertUser.username,
        password: hashedPassword,
        fullName: insertUser.fullName || null,
        email: insertUser.email || null,
        role: insertUser.role || "user",
        subscriptionType: insertUser.subscriptionType || "free",
        monthlyInvoiceLimit: insertUser.monthlyInvoiceLimit || 50,
        expirationDate: insertUser.expirationDate || null,
        currentMonthInvoices: 0,
        usageResetDate: now,
        isActive: insertUser.isActive !== undefined ? insertUser.isActive : true,
        isBlocked: insertUser.isBlocked || false,
        lastLogin: null,
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        createdAt: now,
        updatedAt: now,
        createdBy: insertUser.createdBy || null
      };

      const users = this.readDataFile('users.json');
      users.push(user);
      this.writeDataFile('users.json', users);

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updateData: Partial<InternalUpdateUser>): Promise<User | undefined> {
    try {
      const users = this.readDataFile('users.json');
      const userIndex = users.findIndex((user: User) => user.id === id);
      
      if (userIndex === -1) {
        return undefined;
      }

      const updatedUser = {
        ...users[userIndex],
        ...updateData,
        updatedAt: new Date()
      };

      // Hash password if being updated
      if (updateData.password) {
        updatedUser.password = await PasswordUtils.hashPassword(updateData.password);
      }

      users[userIndex] = updatedUser;
      this.writeDataFile('users.json', users);

      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deactivateUser(id: string): Promise<boolean> {
    try {
      const updatedUser = await this.updateUser(id, { isActive: false });
      return !!updatedUser;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  async incrementUserInvoiceCount(id: string): Promise<User | undefined> {
    try {
      const user = await this.getUser(id);
      if (!user) return undefined;

      return await this.updateUser(id, {
        currentMonthInvoices: user.currentMonthInvoices + 1
      });
    } catch (error) {
      console.error('Error incrementing user invoice count:', error);
      return undefined;
    }
  }

  async resetMonthlyUsage(id: string): Promise<User | undefined> {
    try {
      return await this.updateUser(id, {
        currentMonthInvoices: 0,
        usageResetDate: new Date()
      });
    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      return undefined;
    }
  }

  // ============================
  // COMPANY CONFIG
  // ============================

  async getCompanyConfig(): Promise<CompanyConfig | undefined> {
    try {
      const configs = this.readDataFile('company_configs.json');
      return configs[0]; // Return first config
    } catch (error) {
      console.error('Error getting company config:', error);
      return undefined;
    }
  }

  async createCompanyConfig(config: InsertCompanyConfig): Promise<CompanyConfig> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const companyConfig: CompanyConfig = {
        id,
        ruc: config.ruc,
        razonSocial: config.razonSocial,
        nombreFantasia: config.nombreFantasia || null,
        timbradoNumero: config.timbradoNumero,
        timbradoDesde: config.timbradoDesde,
        timbradoHasta: config.timbradoHasta,
        establecimiento: config.establecimiento || "001",
        puntoExpedicion: config.puntoExpedicion || "001",
        direccion: config.direccion,
        ciudad: config.ciudad || "Asunción",
        telefono: config.telefono || null,
        email: config.email || null,
        logoPath: config.logoPath || null,
        moneda: config.moneda || "GS",
        createdAt: now,
        updatedAt: now
      };

      const configs = this.readDataFile('company_configs.json');
      configs.push(companyConfig);
      this.writeDataFile('company_configs.json', configs);

      return companyConfig;
    } catch (error) {
      console.error('Error creating company config:', error);
      throw error;
    }
  }

  async updateCompanyConfig(id: string, config: Partial<InsertCompanyConfig>): Promise<CompanyConfig | undefined> {
    try {
      const configs = this.readDataFile('company_configs.json');
      const configIndex = configs.findIndex((c: CompanyConfig) => c.id === id);
      
      if (configIndex === -1) {
        return undefined;
      }

      const updatedConfig = {
        ...configs[configIndex],
        ...config,
        updatedAt: new Date()
      };

      configs[configIndex] = updatedConfig;
      this.writeDataFile('company_configs.json', configs);

      return updatedConfig;
    } catch (error) {
      console.error('Error updating company config:', error);
      return undefined;
    }
  }

  // ============================
  // CATEGORIES
  // ============================

  async getCategory(id: string): Promise<Category | undefined> {
    try {
      const categories = this.readDataFile('categories.json');
      return categories.find((category: Category) => category.id === id);
    } catch (error) {
      console.error('Error getting category:', error);
      return undefined;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const categories = this.readDataFile('categories.json');
      return categories.sort((a: Category, b: Category) => 
        a.nombre.localeCompare(b.nombre)
      );
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getCategoriesByType(tipo: "servicios" | "productos" | "ambos"): Promise<Category[]> {
    try {
      const categories = await this.getCategories();
      return categories.filter(category => category.tipo === tipo || category.tipo === "ambos");
    } catch (error) {
      console.error('Error getting categories by type:', error);
      return [];
    }
  }

  async getActiveCategories(): Promise<Category[]> {
    try {
      const categories = await this.getCategories();
      return categories.filter(category => category.isActive);
    } catch (error) {
      console.error('Error getting active categories:', error);
      return [];
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newCategory: Category = {
        id,
        nombre: category.nombre,
        descripcion: category.descripcion || null,
        tipo: category.tipo,
        isActive: category.isActive !== undefined ? category.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const categories = this.readDataFile('categories.json');
      categories.push(newCategory);
      this.writeDataFile('categories.json', categories);

      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    try {
      const categories = this.readDataFile('categories.json');
      const categoryIndex = categories.findIndex((c: Category) => c.id === id);
      
      if (categoryIndex === -1) {
        return undefined;
      }

      const updatedCategory = {
        ...categories[categoryIndex],
        ...category,
        updatedAt: new Date()
      };

      categories[categoryIndex] = updatedCategory;
      this.writeDataFile('categories.json', categories);

      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const categories = this.readDataFile('categories.json');
      const filteredCategories = categories.filter((category: Category) => category.id !== id);
      
      if (filteredCategories.length === categories.length) {
        return false; // No category was deleted
      }

      this.writeDataFile('categories.json', filteredCategories);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  // ============================
  // DNIT CONFIG
  // ============================

  async getDnitConfig(): Promise<DnitConfig | undefined> {
    try {
      const configs = this.readDataFile('dnit_configs.json');
      return configs[0]; // Return first config
    } catch (error) {
      console.error('Error getting DNIT config:', error);
      return undefined;
    }
  }

  async createDnitConfig(config: InsertDnitConfig): Promise<DnitConfig> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const dnitConfig: DnitConfig = {
        id,
        endpointUrl: config.endpointUrl,
        authToken: config.authToken,
        certificateData: config.certificateData || null,
        operationMode: config.operationMode || "testing",
        isActive: config.isActive !== undefined ? config.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const configs = this.readDataFile('dnit_configs.json');
      configs.push(dnitConfig);
      this.writeDataFile('dnit_configs.json', configs);

      return dnitConfig;
    } catch (error) {
      console.error('Error creating DNIT config:', error);
      throw error;
    }
  }

  async updateDnitConfig(id: string, config: Partial<UpdateDnitConfig>): Promise<DnitConfig | undefined> {
    try {
      const configs = this.readDataFile('dnit_configs.json');
      const configIndex = configs.findIndex((c: DnitConfig) => c.id === id);
      
      if (configIndex === -1) {
        return undefined;
      }

      const updatedConfig = {
        ...configs[configIndex],
        ...config,
        updatedAt: new Date()
      };

      configs[configIndex] = updatedConfig;
      this.writeDataFile('dnit_configs.json', configs);

      return updatedConfig;
    } catch (error) {
      console.error('Error updating DNIT config:', error);
      return undefined;
    }
  }

  async deleteDnitConfig(id: string): Promise<boolean> {
    try {
      const configs = this.readDataFile('dnit_configs.json');
      const filteredConfigs = configs.filter((config: DnitConfig) => config.id !== id);
      
      if (filteredConfigs.length === configs.length) {
        return false;
      }

      this.writeDataFile('dnit_configs.json', filteredConfigs);
      return true;
    } catch (error) {
      console.error('Error deleting DNIT config:', error);
      return false;
    }
  }

  async testDnitConnection(config: DnitConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock DNIT connection test - implement actual test logic as needed
      console.log('Testing DNIT connection with config:', config.endpointUrl);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ============================
  // CUSTOMERS
  // ============================

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const customers = this.readDataFile('customers.json');
      return customers.find((customer: Customer) => customer.id === id);
    } catch (error) {
      console.error('Error getting customer:', error);
      return undefined;
    }
  }

  async getCustomers(): Promise<Customer[]> {
    try {
      const customers = this.readDataFile('customers.json');
      return customers.sort((a: Customer, b: Customer) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newCustomer: Customer = {
        id,
        nombre: customer.nombre,
        apellido: customer.apellido || null,
        docTipo: customer.docTipo,
        docNumero: customer.docNumero,
        ruc: customer.ruc || null,
        telefono: customer.telefono || null,
        email: customer.email || null,
        direccion: customer.direccion || null,
        ciudad: customer.ciudad || null,
        fechaNacimiento: this.processDateString(customer.fechaNacimiento),
        observaciones: customer.observaciones || null,
        isActive: customer.isActive !== undefined ? customer.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const customers = this.readDataFile('customers.json');
      customers.push(newCustomer);
      this.writeDataFile('customers.json', customers);

      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const customers = this.readDataFile('customers.json');
      const customerIndex = customers.findIndex((c: Customer) => c.id === id);
      
      if (customerIndex === -1) {
        return undefined;
      }

      const updatedCustomer = {
        ...customers[customerIndex],
        ...customer,
        fechaNacimiento: customer.fechaNacimiento ? this.processDateString(customer.fechaNacimiento) : customers[customerIndex].fechaNacimiento,
        updatedAt: new Date()
      };

      customers[customerIndex] = updatedCustomer;
      this.writeDataFile('customers.json', customers);

      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const customers = this.readDataFile('customers.json');
      const filteredCustomers = customers.filter((customer: Customer) => customer.id !== id);
      
      if (filteredCustomers.length === customers.length) {
        return false;
      }

      this.writeDataFile('customers.json', filteredCustomers);
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  // ============================
  // VEHICLES
  // ============================

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    try {
      const vehicles = this.readDataFile('vehicles.json');
      return vehicles.find((vehicle: Vehicle) => vehicle.id === id);
    } catch (error) {
      console.error('Error getting vehicle:', error);
      return undefined;
    }
  }

  async getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    try {
      const vehicles = this.readDataFile('vehicles.json');
      return vehicles.filter((vehicle: Vehicle) => vehicle.customerId === customerId);
    } catch (error) {
      console.error('Error getting vehicles by customer:', error);
      return [];
    }
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const vehicles = this.readDataFile('vehicles.json');
      return vehicles.sort((a: Vehicle, b: Vehicle) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
    } catch (error) {
      console.error('Error getting all vehicles:', error);
      return [];
    }
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newVehicle: Vehicle = {
        id,
        customerId: vehicle.customerId,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        año: vehicle.año || null,
        color: vehicle.color || null,
        chapa: vehicle.chapa || null,
        chasis: vehicle.chasis || null,
        observaciones: vehicle.observaciones || null,
        isActive: vehicle.isActive !== undefined ? vehicle.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const vehicles = this.readDataFile('vehicles.json');
      vehicles.push(newVehicle);
      this.writeDataFile('vehicles.json', vehicles);

      return newVehicle;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  async updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    try {
      const vehicles = this.readDataFile('vehicles.json');
      const vehicleIndex = vehicles.findIndex((v: Vehicle) => v.id === id);
      
      if (vehicleIndex === -1) {
        return undefined;
      }

      const updatedVehicle = {
        ...vehicles[vehicleIndex],
        ...vehicle,
        updatedAt: new Date()
      };

      vehicles[vehicleIndex] = updatedVehicle;
      this.writeDataFile('vehicles.json', vehicles);

      return updatedVehicle;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return undefined;
    }
  }

  async deleteVehicle(id: string): Promise<boolean> {
    try {
      const vehicles = this.readDataFile('vehicles.json');
      const filteredVehicles = vehicles.filter((vehicle: Vehicle) => vehicle.id !== id);
      
      if (filteredVehicles.length === vehicles.length) {
        return false;
      }

      this.writeDataFile('vehicles.json', filteredVehicles);
      return true;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      return false;
    }
  }

  // ============================
  // SERVICES
  // ============================

  async getService(id: string): Promise<Service | undefined> {
    try {
      const services = this.readDataFile('services.json');
      return services.find((service: Service) => service.id === id);
    } catch (error) {
      console.error('Error getting service:', error);
      return undefined;
    }
  }

  async getServices(): Promise<Service[]> {
    try {
      const services = this.readDataFile('services.json');
      return services.sort((a: Service, b: Service) => 
        a.nombre.localeCompare(b.nombre)
      );
    } catch (error) {
      console.error('Error getting services:', error);
      return [];
    }
  }

  async getActiveServices(): Promise<Service[]> {
    try {
      const services = await this.getServices();
      return services.filter(service => service.isActive);
    } catch (error) {
      console.error('Error getting active services:', error);
      return [];
    }
  }

  async createService(service: InsertService): Promise<Service> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newService: Service = {
        id,
        nombre: service.nombre,
        descripcion: service.descripcion || null,
        precio: service.precio,
        duracionMinutos: service.duracionMinutos || null,
        categoryId: service.categoryId || null,
        imagenUrl: service.imagenUrl || null,
        isActive: service.isActive !== undefined ? service.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const services = this.readDataFile('services.json');
      services.push(newService);
      this.writeDataFile('services.json', services);

      return newService;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    try {
      const services = this.readDataFile('services.json');
      const serviceIndex = services.findIndex((s: Service) => s.id === id);
      
      if (serviceIndex === -1) {
        return undefined;
      }

      const updatedService = {
        ...services[serviceIndex],
        ...service,
        updatedAt: new Date()
      };

      services[serviceIndex] = updatedService;
      this.writeDataFile('services.json', services);

      return updatedService;
    } catch (error) {
      console.error('Error updating service:', error);
      return undefined;
    }
  }

  async deleteService(id: string): Promise<boolean> {
    try {
      const services = this.readDataFile('services.json');
      const filteredServices = services.filter((service: Service) => service.id !== id);
      
      if (filteredServices.length === services.length) {
        return false;
      }

      this.writeDataFile('services.json', filteredServices);
      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      return false;
    }
  }

  // ============================
  // SERVICE COMBOS
  // ============================

  async getServiceCombo(id: string): Promise<ServiceCombo | undefined> {
    try {
      const combos = this.readDataFile('service_combos.json');
      return combos.find((combo: ServiceCombo) => combo.id === id);
    } catch (error) {
      console.error('Error getting service combo:', error);
      return undefined;
    }
  }

  async getServiceCombos(): Promise<ServiceCombo[]> {
    try {
      const combos = this.readDataFile('service_combos.json');
      return combos.sort((a: ServiceCombo, b: ServiceCombo) => 
        a.nombre.localeCompare(b.nombre)
      );
    } catch (error) {
      console.error('Error getting service combos:', error);
      return [];
    }
  }

  async getActiveServiceCombos(): Promise<ServiceCombo[]> {
    try {
      const combos = await this.getServiceCombos();
      return combos.filter(combo => combo.isActive);
    } catch (error) {
      console.error('Error getting active service combos:', error);
      return [];
    }
  }

  async createServiceCombo(combo: InsertServiceCombo): Promise<ServiceCombo> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newCombo: ServiceCombo = {
        id,
        nombre: combo.nombre,
        descripcion: combo.descripcion || null,
        precio: combo.precio,
        descuento: combo.descuento || 0,
        duracionMinutos: combo.duracionMinutos || null,
        imagenUrl: combo.imagenUrl || null,
        isActive: combo.isActive !== undefined ? combo.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const combos = this.readDataFile('service_combos.json');
      combos.push(newCombo);
      this.writeDataFile('service_combos.json', combos);

      return newCombo;
    } catch (error) {
      console.error('Error creating service combo:', error);
      throw error;
    }
  }

  async updateServiceCombo(id: string, combo: Partial<InsertServiceCombo>): Promise<ServiceCombo | undefined> {
    try {
      const combos = this.readDataFile('service_combos.json');
      const comboIndex = combos.findIndex((c: ServiceCombo) => c.id === id);
      
      if (comboIndex === -1) {
        return undefined;
      }

      const updatedCombo = {
        ...combos[comboIndex],
        ...combo,
        updatedAt: new Date()
      };

      combos[comboIndex] = updatedCombo;
      this.writeDataFile('service_combos.json', combos);

      return updatedCombo;
    } catch (error) {
      console.error('Error updating service combo:', error);
      return undefined;
    }
  }

  async deleteServiceCombo(id: string): Promise<boolean> {
    try {
      const combos = this.readDataFile('service_combos.json');
      const filteredCombos = combos.filter((combo: ServiceCombo) => combo.id !== id);
      
      if (filteredCombos.length === combos.length) {
        return false;
      }

      this.writeDataFile('service_combos.json', filteredCombos);
      return true;
    } catch (error) {
      console.error('Error deleting service combo:', error);
      return false;
    }
  }

  // ============================
  // SERVICE COMBO ITEMS
  // ============================

  async getServiceComboItems(comboId: string): Promise<ServiceComboItem[]> {
    try {
      const items = this.readDataFile('service_combo_items.json');
      return items.filter((item: ServiceComboItem) => item.comboId === comboId);
    } catch (error) {
      console.error('Error getting service combo items:', error);
      return [];
    }
  }

  async createServiceComboItem(item: InsertServiceComboItem): Promise<ServiceComboItem> {
    try {
      const id = this.generateUUID();

      const newItem: ServiceComboItem = {
        id,
        comboId: item.comboId,
        serviceId: item.serviceId,
        cantidad: item.cantidad || 1,
        orden: item.orden || 1
      };

      const items = this.readDataFile('service_combo_items.json');
      items.push(newItem);
      this.writeDataFile('service_combo_items.json', items);

      return newItem;
    } catch (error) {
      console.error('Error creating service combo item:', error);
      throw error;
    }
  }

  async deleteServiceComboItem(id: string): Promise<boolean> {
    try {
      const items = this.readDataFile('service_combo_items.json');
      const filteredItems = items.filter((item: ServiceComboItem) => item.id !== id);
      
      if (filteredItems.length === items.length) {
        return false;
      }

      this.writeDataFile('service_combo_items.json', filteredItems);
      return true;
    } catch (error) {
      console.error('Error deleting service combo item:', error);
      return false;
    }
  }

  async deleteServiceComboItemsByCombo(comboId: string): Promise<void> {
    try {
      const items = this.readDataFile('service_combo_items.json');
      const filteredItems = items.filter((item: ServiceComboItem) => item.comboId !== comboId);
      this.writeDataFile('service_combo_items.json', filteredItems);
    } catch (error) {
      console.error('Error deleting service combo items by combo:', error);
      throw error;
    }
  }

  // ============================
  // WORK ORDERS
  // ============================

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    try {
      const workOrders = this.readDataFile('work_orders.json');
      return workOrders.find((order: WorkOrder) => order.id === id);
    } catch (error) {
      console.error('Error getting work order:', error);
      return undefined;
    }
  }

  async getWorkOrders(): Promise<WorkOrder[]> {
    try {
      const workOrders = this.readDataFile('work_orders.json');
      return workOrders.sort((a: WorkOrder, b: WorkOrder) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
    } catch (error) {
      console.error('Error getting work orders:', error);
      return [];
    }
  }

  async getWorkOrdersByStatus(status: string): Promise<WorkOrder[]> {
    try {
      const workOrders = await this.getWorkOrders();
      return workOrders.filter(order => order.estado === status);
    } catch (error) {
      console.error('Error getting work orders by status:', error);
      return [];
    }
  }

  async getWorkOrdersByCustomer(customerId: string): Promise<WorkOrder[]> {
    try {
      const workOrders = await this.getWorkOrders();
      return workOrders.filter(order => order.customerId === customerId);
    } catch (error) {
      console.error('Error getting work orders by customer:', error);
      return [];
    }
  }

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newWorkOrder: WorkOrder = {
        id,
        numero: workOrder.numero || this.nextWorkOrderNumber,
        customerId: workOrder.customerId,
        vehicleId: workOrder.vehicleId || null,
        estado: workOrder.estado || "recibido",
        fechaInicio: workOrder.fechaInicio ? new Date(workOrder.fechaInicio) : now,
        fechaEstimadaEntrega: workOrder.fechaEstimadaEntrega ? new Date(workOrder.fechaEstimadaEntrega) : null,
        fechaEntrega: workOrder.fechaEntrega ? new Date(workOrder.fechaEntrega) : null,
        observaciones: workOrder.observaciones || null,
        observacionesInternas: workOrder.observacionesInternas || null,
        total: workOrder.total || 0,
        adelanto: workOrder.adelanto || 0,
        saldo: workOrder.saldo || 0,
        createdAt: now,
        updatedAt: now
      };

      const workOrders = this.readDataFile('work_orders.json');
      workOrders.push(newWorkOrder);
      this.writeDataFile('work_orders.json', workOrders);

      // Update next work order number
      this.nextWorkOrderNumber++;
      const metadata = this.readDataFile('metadata.json');
      metadata.nextWorkOrderNumber = this.nextWorkOrderNumber;
      this.writeDataFile('metadata.json', metadata);

      return newWorkOrder;
    } catch (error) {
      console.error('Error creating work order:', error);
      throw error;
    }
  }

  async updateWorkOrder(id: string, workOrder: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined> {
    try {
      const workOrders = this.readDataFile('work_orders.json');
      const orderIndex = workOrders.findIndex((order: WorkOrder) => order.id === id);
      
      if (orderIndex === -1) {
        return undefined;
      }

      const updatedOrder = {
        ...workOrders[orderIndex],
        ...workOrder,
        fechaInicio: workOrder.fechaInicio ? new Date(workOrder.fechaInicio) : workOrders[orderIndex].fechaInicio,
        fechaEstimadaEntrega: workOrder.fechaEstimadaEntrega ? new Date(workOrder.fechaEstimadaEntrega) : workOrders[orderIndex].fechaEstimadaEntrega,
        fechaEntrega: workOrder.fechaEntrega ? new Date(workOrder.fechaEntrega) : workOrders[orderIndex].fechaEntrega,
        updatedAt: new Date()
      };

      workOrders[orderIndex] = updatedOrder;
      this.writeDataFile('work_orders.json', workOrders);

      return updatedOrder;
    } catch (error) {
      console.error('Error updating work order:', error);
      return undefined;
    }
  }

  async deleteWorkOrder(id: string): Promise<boolean> {
    try {
      const workOrders = this.readDataFile('work_orders.json');
      const filteredOrders = workOrders.filter((order: WorkOrder) => order.id !== id);
      
      if (filteredOrders.length === workOrders.length) {
        return false;
      }

      this.writeDataFile('work_orders.json', filteredOrders);
      return true;
    } catch (error) {
      console.error('Error deleting work order:', error);
      return false;
    }
  }

  async getNextWorkOrderNumber(): Promise<number> {
    return this.nextWorkOrderNumber;
  }

  // ============================
  // WORK ORDER ITEMS
  // ============================

  async getWorkOrderItems(workOrderId: string): Promise<WorkOrderItem[]> {
    try {
      const items = this.readDataFile('work_order_items.json');
      return items.filter((item: WorkOrderItem) => item.workOrderId === workOrderId);
    } catch (error) {
      console.error('Error getting work order items:', error);
      return [];
    }
  }

  async createWorkOrderItem(item: InsertWorkOrderItem): Promise<WorkOrderItem> {
    try {
      const id = this.generateUUID();

      const newItem: WorkOrderItem = {
        id,
        workOrderId: item.workOrderId,
        serviceId: item.serviceId || null,
        comboId: item.comboId || null,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
        orden: item.orden || 1
      };

      const items = this.readDataFile('work_order_items.json');
      items.push(newItem);
      this.writeDataFile('work_order_items.json', items);

      return newItem;
    } catch (error) {
      console.error('Error creating work order item:', error);
      throw error;
    }
  }

  async deleteWorkOrderItem(id: string): Promise<boolean> {
    try {
      const items = this.readDataFile('work_order_items.json');
      const filteredItems = items.filter((item: WorkOrderItem) => item.id !== id);
      
      if (filteredItems.length === items.length) {
        return false;
      }

      this.writeDataFile('work_order_items.json', filteredItems);
      return true;
    } catch (error) {
      console.error('Error deleting work order item:', error);
      return false;
    }
  }

  async deleteWorkOrderItemsByWorkOrder(workOrderId: string): Promise<void> {
    try {
      const items = this.readDataFile('work_order_items.json');
      const filteredItems = items.filter((item: WorkOrderItem) => item.workOrderId !== workOrderId);
      this.writeDataFile('work_order_items.json', filteredItems);
    } catch (error) {
      console.error('Error deleting work order items by work order:', error);
      throw error;
    }
  }

  // Enhanced WorkOrder Item Management
  async addWorkOrderItem(workOrderId: string, item: InsertWorkOrderItem): Promise<WorkOrderItem> {
    return await this.createWorkOrderItem({ ...item, workOrderId });
  }

  async removeWorkOrderItem(workOrderId: string, itemId: string): Promise<boolean> {
    return await this.deleteWorkOrderItem(itemId);
  }

  async updateWorkOrderItem(workOrderId: string, itemId: string, data: Partial<InsertWorkOrderItem>): Promise<WorkOrderItem | undefined> {
    try {
      const items = this.readDataFile('work_order_items.json');
      const itemIndex = items.findIndex((item: WorkOrderItem) => item.id === itemId && item.workOrderId === workOrderId);
      
      if (itemIndex === -1) {
        return undefined;
      }

      const updatedItem = {
        ...items[itemIndex],
        ...data
      };

      items[itemIndex] = updatedItem;
      this.writeDataFile('work_order_items.json', items);

      return updatedItem;
    } catch (error) {
      console.error('Error updating work order item:', error);
      return undefined;
    }
  }

  // WorkOrder Status Management
  async updateWorkOrderStatus(id: string, status: WorkOrder["estado"]): Promise<WorkOrder | undefined> {
    return await this.updateWorkOrder(id, { estado: status });
  }

  // WorkOrder-Sale Integration
  async createSaleFromOrder(workOrderId: string, saleData: Partial<InsertSale>): Promise<Sale> {
    try {
      const workOrder = await this.getWorkOrder(workOrderId);
      if (!workOrder) {
        throw new Error('Work order not found');
      }

      const workOrderItems = await this.getWorkOrderItems(workOrderId);
      
      const sale: InsertSale = {
        customerId: workOrder.customerId,
        workOrderId: workOrderId,
        numero: saleData.numero || Date.now(),
        fecha: saleData.fecha || new Date(),
        subtotal: workOrder.total - (workOrder.adelanto || 0),
        impuestos: saleData.impuestos || 0,
        total: workOrder.total - (workOrder.adelanto || 0),
        medioPago: saleData.medioPago || "efectivo",
        observaciones: saleData.observaciones || `Venta generada desde orden de trabajo #${workOrder.numero}`,
        ...saleData
      };

      const newSale = await this.createSale(sale);

      // Create sale items from work order items
      for (const workOrderItem of workOrderItems) {
        await this.createSaleItem({
          saleId: newSale.id,
          serviceId: workOrderItem.serviceId,
          comboId: workOrderItem.comboId,
          inventoryItemId: null,
          nombre: workOrderItem.nombre,
          cantidad: workOrderItem.cantidad,
          precioUnitario: workOrderItem.precioUnitario,
          subtotal: workOrderItem.subtotal
        });
      }

      return newSale;
    } catch (error) {
      console.error('Error creating sale from order:', error);
      throw error;
    }
  }

  // ============================
  // INVENTORY ITEMS
  // ============================

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    try {
      const items = this.readDataFile('inventory_items.json');
      return items.find((item: InventoryItem) => item.id === id);
    } catch (error) {
      console.error('Error getting inventory item:', error);
      return undefined;
    }
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    try {
      const items = this.readDataFile('inventory_items.json');
      return items.sort((a: InventoryItem, b: InventoryItem) => 
        a.nombre.localeCompare(b.nombre)
      );
    } catch (error) {
      console.error('Error getting inventory items:', error);
      return [];
    }
  }

  async getInventoryItemsByAlert(alertStatus: string): Promise<InventoryItem[]> {
    try {
      const items = await this.getInventoryItems();
      return items.filter(item => item.estadoAlerta === alertStatus);
    } catch (error) {
      console.error('Error getting inventory items by alert:', error);
      return [];
    }
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newItem: InventoryItem = {
        id,
        nombre: item.nombre,
        descripcion: item.descripcion || null,
        codigo: item.codigo || null,
        categoryId: item.categoryId || null,
        precio: item.precio,
        stockActual: item.stockActual,
        stockMinimo: item.stockMinimo,
        stockMaximo: item.stockMaximo || null,
        unidadMedida: item.unidadMedida,
        proveedor: item.proveedor || null,
        ubicacion: item.ubicacion || null,
        fechaVencimiento: this.processDateString(item.fechaVencimiento),
        estadoAlerta: item.estadoAlerta || "normal",
        isActive: item.isActive !== undefined ? item.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const items = this.readDataFile('inventory_items.json');
      items.push(newItem);
      this.writeDataFile('inventory_items.json', items);

      return newItem;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    try {
      const items = this.readDataFile('inventory_items.json');
      const itemIndex = items.findIndex((i: InventoryItem) => i.id === id);
      
      if (itemIndex === -1) {
        return undefined;
      }

      const updatedItem = {
        ...items[itemIndex],
        ...item,
        fechaVencimiento: item.fechaVencimiento ? this.processDateString(item.fechaVencimiento) : items[itemIndex].fechaVencimiento,
        updatedAt: new Date()
      };

      items[itemIndex] = updatedItem;
      this.writeDataFile('inventory_items.json', items);

      return updatedItem;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      return undefined;
    }
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      const items = this.readDataFile('inventory_items.json');
      const filteredItems = items.filter((item: InventoryItem) => item.id !== id);
      
      if (filteredItems.length === items.length) {
        return false;
      }

      this.writeDataFile('inventory_items.json', filteredItems);
      return true;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return false;
    }
  }

  async updateInventoryStock(id: string, newStock: number): Promise<InventoryItem | undefined> {
    return await this.updateInventoryItem(id, { stockActual: newStock });
  }

  // ============================
  // SALES
  // ============================

  async getSale(id: string): Promise<Sale | undefined> {
    try {
      const sales = this.readDataFile('sales.json');
      return sales.find((sale: Sale) => sale.id === id);
    } catch (error) {
      console.error('Error getting sale:', error);
      return undefined;
    }
  }

  async getSales(): Promise<Sale[]> {
    try {
      const sales = this.readDataFile('sales.json');
      return sales.sort((a: Sale, b: Sale) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
    } catch (error) {
      console.error('Error getting sales:', error);
      return [];
    }
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    try {
      const sales = await this.getSales();
      return sales.filter(sale => {
        const saleDate = new Date(sale.fecha);
        return saleDate >= startDate && saleDate <= endDate;
      });
    } catch (error) {
      console.error('Error getting sales by date range:', error);
      return [];
    }
  }

  async getSalesByCustomer(customerId: string): Promise<Sale[]> {
    try {
      const sales = await this.getSales();
      return sales.filter(sale => sale.customerId === customerId);
    } catch (error) {
      console.error('Error getting sales by customer:', error);
      return [];
    }
  }

  async getLastSale(): Promise<Sale | undefined> {
    try {
      const sales = await this.getSales();
      return sales[0]; // Already sorted by date descending
    } catch (error) {
      console.error('Error getting last sale:', error);
      return undefined;
    }
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    try {
      const id = this.generateUUID();
      const now = new Date();

      const newSale: Sale = {
        id,
        numero: sale.numero,
        customerId: sale.customerId,
        workOrderId: sale.workOrderId || null,
        fecha: sale.fecha ? new Date(sale.fecha) : now,
        subtotal: sale.subtotal,
        impuestos: sale.impuestos || 0,
        total: sale.total,
        medioPago: sale.medioPago,
        observaciones: sale.observaciones || null,
        facturado: sale.facturado || false,
        timbrado: sale.timbrado || null,
        createdAt: now,
        updatedAt: now
      };

      const sales = this.readDataFile('sales.json');
      sales.push(newSale);
      this.writeDataFile('sales.json', sales);

      return newSale;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  async updateSale(id: string, sale: Partial<InsertSale>): Promise<Sale | undefined> {
    try {
      const sales = this.readDataFile('sales.json');
      const saleIndex = sales.findIndex((s: Sale) => s.id === id);
      
      if (saleIndex === -1) {
        return undefined;
      }

      const updatedSale = {
        ...sales[saleIndex],
        ...sale,
        fecha: sale.fecha ? new Date(sale.fecha) : sales[saleIndex].fecha,
        updatedAt: new Date()
      };

      sales[saleIndex] = updatedSale;
      this.writeDataFile('sales.json', sales);

      return updatedSale;
    } catch (error) {
      console.error('Error updating sale:', error);
      return undefined;
    }
  }

  async deleteSale(id: string): Promise<boolean> {
    try {
      const sales = this.readDataFile('sales.json');
      const filteredSales = sales.filter((sale: Sale) => sale.id !== id);
      
      if (filteredSales.length === sales.length) {
        return false;
      }

      this.writeDataFile('sales.json', filteredSales);
      return true;
    } catch (error) {
      console.error('Error deleting sale:', error);
      return false;
    }
  }

  // ============================
  // SALE ITEMS
  // ============================

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    try {
      const items = this.readDataFile('sale_items.json');
      return items.filter((item: SaleItem) => item.saleId === saleId);
    } catch (error) {
      console.error('Error getting sale items:', error);
      return [];
    }
  }

  async createSaleItem(item: InsertSaleItem): Promise<SaleItem> {
    try {
      const id = this.generateUUID();

      const newItem: SaleItem = {
        id,
        saleId: item.saleId,
        serviceId: item.serviceId || null,
        comboId: item.comboId || null,
        inventoryItemId: item.inventoryItemId || null,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      };

      const items = this.readDataFile('sale_items.json');
      items.push(newItem);
      this.writeDataFile('sale_items.json', items);

      return newItem;
    } catch (error) {
      console.error('Error creating sale item:', error);
      throw error;
    }
  }

  async deleteSaleItem(id: string): Promise<boolean> {
    try {
      const items = this.readDataFile('sale_items.json');
      const filteredItems = items.filter((item: SaleItem) => item.id !== id);
      
      if (filteredItems.length === items.length) {
        return false;
      }

      this.writeDataFile('sale_items.json', filteredItems);
      return true;
    } catch (error) {
      console.error('Error deleting sale item:', error);
      return false;
    }
  }

  async deleteSaleItemsBySale(saleId: string): Promise<void> {
    try {
      const items = this.readDataFile('sale_items.json');
      const filteredItems = items.filter((item: SaleItem) => item.saleId !== saleId);
      this.writeDataFile('sale_items.json', filteredItems);
    } catch (error) {
      console.error('Error deleting sale items by sale:', error);
      throw error;
    }
  }
}