import { ProductRepository } from "../repositories/productRepository";
import { CategoryRepository } from "../repositories/categoryRepository";
import { Product } from "@prisma/client";
import { ValidationError, NotFoundError } from "../errors/appError";

export class ProductService {
  private productRepo = new ProductRepository();
  private categoryRepo = new CategoryRepository();
  private shopId: string;

  constructor(shopId: string) {
    if (!shopId) {
      throw new ValidationError("shopId is required context for ProductService");
    }
    this.shopId = shopId;
  }

  async createProduct(data: {
    categoryId: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    images?: string[];
  }): Promise<Product> {
    // 1. Verify that category exists and belongs to this shop
    const category = await this.categoryRepo.getById(this.shopId, data.categoryId);
    if (!category) {
      throw new NotFoundError(`Category with ID ${data.categoryId} not found in this shop`);
    }

    // 2. Validate product limit (maximum 100 products per shop)
    const productCount = await this.productRepo.countByShopId(this.shopId);
    if (productCount >= 100) {
      throw new ValidationError("Product limit reached. Each shop can have a maximum of 100 products.");
    }

    // 3. Validate parameters
    if (!data.name || data.name.trim() === "") {
      throw new ValidationError("Product name is required");
    }
    if (data.price === undefined || data.price < 0) {
      throw new ValidationError("Price must be a non-negative number");
    }
    if (data.stock === undefined || data.stock < 0) {
      throw new ValidationError("Stock must be a non-negative integer");
    }

    return this.productRepo.create(this.shopId, {
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: data.description,
      price: data.price,
      stock: Math.floor(data.stock),
      images: data.images,
    });
  }

  async getProducts(): Promise<Product[]> {
    return this.productRepo.listByShopId(this.shopId);
  }

  async getActiveProducts(): Promise<Product[]> {
    return this.productRepo.listActiveByShopId(this.shopId);
  }

  async getActiveProductsByCategory(categoryId: string): Promise<Product[]> {
    return this.productRepo.listActiveByCategoryId(this.shopId, categoryId);
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.productRepo.getById(this.shopId, id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }
    return product;
  }

  async updateProduct(
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      images?: string[];
      isActive?: boolean;
    }
  ): Promise<Product> {
    // Verify existence first
    await this.getProduct(id);

    // Verify category if modified
    if (data.categoryId !== undefined) {
      const category = await this.categoryRepo.getById(this.shopId, data.categoryId);
      if (!category) {
        throw new NotFoundError(`Category with ID ${data.categoryId} not found in this shop`);
      }
    }

    if (data.name !== undefined && data.name.trim() === "") {
      throw new ValidationError("Product name cannot be empty");
    }
    if (data.price !== undefined && data.price < 0) {
      throw new ValidationError("Price must be a non-negative number");
    }
    if (data.stock !== undefined && data.stock < 0) {
      throw new ValidationError("Stock must be a non-negative integer");
    }

    return this.productRepo.update(this.shopId, id, {
      categoryId: data.categoryId,
      name: data.name?.trim(),
      description: data.description,
      price: data.price,
      stock: data.stock !== undefined ? Math.floor(data.stock) : undefined,
      images: data.images,
      isActive: data.isActive,
    });
  }

  async deleteProduct(id: string): Promise<Product> {
    await this.getProduct(id);
    return this.productRepo.delete(this.shopId, id);
  }
}
