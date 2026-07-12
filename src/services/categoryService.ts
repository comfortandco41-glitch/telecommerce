import { CategoryRepository } from "../repositories/categoryRepository";
import { Category } from "@prisma/client";
import { ValidationError, NotFoundError } from "../errors/appError";

export class CategoryService {
  private categoryRepo = new CategoryRepository();
  private shopId: string;

  constructor(shopId: string) {
    if (!shopId) {
      throw new ValidationError("shopId is required context for CategoryService");
    }
    this.shopId = shopId;
  }

  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    if (!data.name || data.name.trim() === "") {
      throw new ValidationError("Category name is required");
    }
    return this.categoryRepo.create(this.shopId, {
      name: data.name.trim(),
      description: data.description,
    });
  }

  async getCategories(): Promise<Category[]> {
    return this.categoryRepo.listByShopId(this.shopId);
  }

  async getActiveCategories(): Promise<Category[]> {
    return this.categoryRepo.listActiveByShopId(this.shopId);
  }

  async getCategory(id: string): Promise<Category> {
    const category = await this.categoryRepo.getById(this.shopId, id);
    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`);
    }
    return category;
  }

  async updateCategory(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean }
  ): Promise<Category> {
    // Validate existence first
    await this.getCategory(id);

    if (data.name !== undefined && data.name.trim() === "") {
      throw new ValidationError("Category name cannot be empty");
    }

    return this.categoryRepo.update(this.shopId, id, {
      name: data.name?.trim(),
      description: data.description,
      isActive: data.isActive,
    });
  }
}
